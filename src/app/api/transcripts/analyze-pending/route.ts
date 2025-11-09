import { NextResponse } from 'next/server';
import { getPendingTranscripts, updateTranscript } from '@/services/transcriptService';
import { analyzeTranscriptWithTools, type TranscriptData } from '@/lib/ai';
import { createPendingActivity } from '@/services/activityService';
import { downloadBlobFile } from '@/lib/vercel-blob';

/**
 * POST /api/transcripts/analyze-pending
 * Analyzes all pending transcripts one by one
 * Creates activities for each analysis result
 */
export async function POST() {
  try {
    console.log('🔍 Checking for pending transcripts...');

    // Get all pending transcripts
    const pendingTranscripts = await getPendingTranscripts();

    if (pendingTranscripts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending transcripts to analyze',
        results: {
          total: 0,
          processed: 0,
          failed: 0,
          activities: 0,
        },
      });
    }

    console.log(`📄 Found ${pendingTranscripts.length} pending transcripts`);

    const results = {
      total: pendingTranscripts.length,
      processed: 0,
      failed: 0,
      activities: 0,
      transcripts: [] as Array<{
        transcriptId: string;
        filename: string;
        status: 'success' | 'error';
        activitiesCreated?: number;
        error?: string;
      }>,
    };

    // Process each transcript one by one
    for (const transcript of pendingTranscripts) {
      try {
        console.log(`🤖 Analyzing transcript: ${transcript.filename}`);

        // Update status to processing
        await updateTranscript(transcript.id, { status: 'processing' });

        // Get or download content
        let content = transcript.content;
        if (!content && transcript.blobUrl) {
          console.log('📥 Downloading transcript content from blob storage...');
          content = await downloadBlobFile(transcript.blobUrl);

          // Save content to database for future use
          await updateTranscript(transcript.id, { content });
        }

        if (!content) {
          throw new Error('Transcript content not available');
        }

        // Analyze the transcript
        const analysis = await analyzeTranscriptWithTools(
          {
            content,
            filename: transcript.filename,
            metadata: (transcript.metadata as Record<string, unknown>) || {},
          } as TranscriptData
        );

        console.log('✅ Analysis complete:', {
          contacts: analysis.contacts.length,
          contactUpdates: analysis.contactUpdates?.length || 0,
          tasks: analysis.tasks.length,
        });

        let activitiesCreated = 0;

        // Create activity for each extracted contact (new contacts)
        for (const contactData of analysis.contacts) {
          await createPendingActivity({
            entityType: 'contact',
            action: 'create',
            sourceType: 'meeting',
            extractedData: { ...contactData, action: 'create' },
            sourceInteractionId: null,
            sourceEmailSubject: `Meeting: ${transcript.filename}`,
            sourceEmailFrom: 'Transcript Analysis',
            sourceEmailDate: transcript.uploadedAt,
          });
          activitiesCreated++;
        }

        // Create activity for each contact update
        if (analysis.contactUpdates) {
          for (const updateData of analysis.contactUpdates) {
            await createPendingActivity({
              entityType: 'contact',
              action: 'update',
              sourceType: 'meeting',
              extractedData: { ...updateData, action: 'update' },
              sourceInteractionId: null,
              sourceEmailSubject: `Meeting: ${transcript.filename}`,
              sourceEmailFrom: 'Transcript Analysis',
              sourceEmailDate: transcript.uploadedAt,
            });
            activitiesCreated++;
          }
        }

        // Create activity for each extracted task
        for (const taskData of analysis.tasks) {
          await createPendingActivity({
            entityType: 'task',
            action: 'create',
            sourceType: 'meeting',
            extractedData: taskData,
            sourceInteractionId: null,
            sourceEmailSubject: `Meeting: ${transcript.filename}`,
            sourceEmailFrom: 'Transcript Analysis',
            sourceEmailDate: transcript.uploadedAt,
          });
          activitiesCreated++;
        }

        // Update transcript with analysis results
        await updateTranscript(transcript.id, {
          status: 'processed',
          processedAt: new Date(),
          metadata: {
            ...(transcript.metadata as Record<string, unknown> || {}),
            analysis: {
              contactCount: analysis.contacts.length,
              contactUpdateCount: analysis.contactUpdates?.length || 0,
              taskCount: analysis.tasks.length,
              meetingSummary: analysis.meetingSummary,
              keyPoints: analysis.keyPoints,
              analyzedAt: new Date().toISOString(),
            },
          },
        });

        results.processed++;
        results.activities += activitiesCreated;
        results.transcripts.push({
          transcriptId: transcript.id,
          filename: transcript.filename,
          status: 'success',
          activitiesCreated,
        });

        console.log(`✅ Completed ${transcript.filename}: ${activitiesCreated} activities created`);
      } catch (error) {
        console.error(`❌ Error analyzing ${transcript.filename}:`, error);

        // Update transcript status to error
        await updateTranscript(transcript.id, {
          status: 'error',
          metadata: {
            ...(transcript.metadata as Record<string, unknown> || {}),
            error: error instanceof Error ? error.message : 'Unknown error',
            errorAt: new Date().toISOString(),
          },
        }).catch(console.error);

        results.failed++;
        results.transcripts.push({
          transcriptId: transcript.id,
          filename: transcript.filename,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log('✅ Transcript analysis batch complete:', results);

    return NextResponse.json({
      success: true,
      message: `Analyzed ${results.processed}/${results.total} transcripts. ${results.activities} activities created.`,
      results,
    });
  } catch (error) {
    console.error('❌ Error analyzing pending transcripts:', error);

    return NextResponse.json(
      {
        error: 'Failed to analyze pending transcripts',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

