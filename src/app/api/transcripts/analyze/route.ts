import { NextRequest, NextResponse } from 'next/server';
import { analyzeTranscriptWithTools, type TranscriptData } from '@/lib/ai';
import { createPendingActivity, markActivityStatus } from '@/services/activityService';
import { createContact, getContactByEmail, updateContact } from '@/services/contactService';
import { createTask } from '@/services/taskService';
import { getTranscriptById, updateTranscript } from '@/services/transcriptService';
import { downloadBlobFile } from '@/lib/vercel-blob';

/**
 * POST /api/transcripts/analyze
 * Analyzes a transcript and creates pending activities
 * 
 * Body: { transcriptId: string, autoInsert?: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transcriptId, autoInsert = false } = body;

    if (!transcriptId) {
      return NextResponse.json(
        { error: 'transcriptId is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Starting analysis for transcript ${transcriptId}`);

    // Get transcript from database
    const transcript = await getTranscriptById(transcriptId);

    if (!transcript) {
      return NextResponse.json(
        { error: 'Transcript not found' },
        { status: 404 }
      );
    }

    // Update status to processing
    await updateTranscript(transcriptId, { status: 'processing' });

    // Get or download content
    let content = transcript.content;
    if (!content && transcript.blobUrl) {
      console.log('📥 Downloading transcript content from blob storage...');
      content = await downloadBlobFile(transcript.blobUrl);
      
      // Save content to database for future use
      await updateTranscript(transcriptId, { content });
    }

    if (!content) {
      return NextResponse.json(
        { error: 'Transcript content not available' },
        { status: 400 }
      );
    }

    // Analyze the transcript
    console.log('🤖 Analyzing transcript with AI...');
    const analysis = await analyzeTranscriptWithTools({
      content,
      filename: transcript.filename,
      metadata: (transcript.metadata as Record<string, unknown>) || {},
    } as TranscriptData, {
      model: 'gpt-5',
    });

    console.log('✅ Analysis complete:', {
      contacts: analysis.contacts.length,
      contactUpdates: analysis.contactUpdates?.length || 0,
      tasks: analysis.tasks.length,
      hasSummary: !!analysis.meetingSummary,
    });

    const createdActivities = [];

    // Create activity for each extracted contact (new contacts)
    for (const contactData of analysis.contacts) {
      const activity = await createPendingActivity({
        entityType: 'contact',
        action: 'create',
        sourceType: 'meeting',
        extractedData: { ...contactData, action: 'create' },
        sourceInteractionId: null,
        sourceEmailSubject: `Meeting: ${transcript.filename}`,
        sourceEmailFrom: 'Transcript Analysis',
        sourceEmailDate: transcript.uploadedAt,
      });
      createdActivities.push(activity);
    }

    // Create activity for each contact update (existing contacts with changes)
    if (analysis.contactUpdates) {
      for (const updateData of analysis.contactUpdates) {
        const activity = await createPendingActivity({
          entityType: 'contact',
          action: 'update',
          sourceType: 'meeting',
          extractedData: { ...updateData, action: 'update' },
          sourceInteractionId: null,
          sourceEmailSubject: `Meeting: ${transcript.filename}`,
          sourceEmailFrom: 'Transcript Analysis',
          sourceEmailDate: transcript.uploadedAt,
        });
        createdActivities.push(activity);
      }
    }

    // Create activity for each extracted task
    for (const taskData of analysis.tasks) {
      const activity = await createPendingActivity({
        entityType: 'task',
        action: 'create',
        sourceType: 'meeting',
        extractedData: taskData,
        sourceInteractionId: null,
        sourceEmailSubject: `Meeting: ${transcript.filename}`,
        sourceEmailFrom: 'Transcript Analysis',
        sourceEmailDate: transcript.uploadedAt,
      });
      createdActivities.push(activity);
    }

    // Update transcript with analysis results
    await updateTranscript(transcriptId, {
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

    // If autoInsert is true, auto-accept all activities
    if (autoInsert) {
      console.log('🚀 Auto-inserting activities...');

      // Process contact activities
      for (const activity of createdActivities.filter(a => a.entityType === 'contact')) {
        const contactData = activity.extractedData as any;

        if (activity.action === 'update' && contactData.existingContactId) {
          const { existingContactId, changes, action, ...updateFields } = contactData;
          await updateContact(existingContactId, updateFields);
          console.log(`✅ Updated contact: ${contactData.name}`);
        } else {
          const { action, existingContactId, changes, ...newContactFields } = contactData;
          
          // Check if contact already exists
          const existingContact = await getContactByEmail(newContactFields.email);
          if (!existingContact) {
            await createContact(newContactFields);
            console.log(`✅ Created contact: ${newContactFields.name}`);
          } else {
            console.log(`ℹ️ Contact already exists: ${newContactFields.name}`);
          }
        }

        await markActivityStatus(activity.id, 'accepted');
      }

      // Process task activities
      for (const activity of createdActivities.filter(a => a.entityType === 'task')) {
        const taskData = activity.extractedData as any;
        await createTask(taskData);
        await markActivityStatus(activity.id, 'accepted');
        console.log(`✅ Created task: ${taskData.title}`);
      }
    }

    return NextResponse.json({
      success: true,
      transcriptId,
      analysis: {
        contacts: analysis.contacts.length,
        contactUpdates: analysis.contactUpdates?.length || 0,
        tasks: analysis.tasks.length,
        meetingSummary: analysis.meetingSummary,
        keyPoints: analysis.keyPoints,
      },
      activities: createdActivities.map(a => ({
        id: a.id,
        entityType: a.entityType,
        action: a.action,
        status: a.status,
      })),
      autoInserted: autoInsert,
    });
  } catch (error) {
    console.error('❌ Error analyzing transcript:', error);

    // Try to update transcript status to error
    const body = await request.json().catch(() => ({}));
    if (body.transcriptId) {
      await updateTranscript(body.transcriptId, {
        status: 'error',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          errorAt: new Date().toISOString(),
        },
      }).catch(console.error);
    }

    return NextResponse.json(
      {
        error: 'Failed to analyze transcript',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

