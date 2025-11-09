import { NextResponse } from 'next/server';
import { listBlobFiles } from '@/lib/vercel-blob';
import { createTranscript, getTranscriptByUrl } from '@/services/transcriptService';

/**
 * POST /api/transcripts/sync
 * Syncs all transcript files from Vercel Blob storage to the database
 * and optionally analyzes them
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({ analyze: false }));
    const { analyze = false } = body;

    console.log('🔄 Starting transcript sync from Vercel Blob...');

    // List all files under 'transcripts/' prefix
    const blobFiles = await listBlobFiles('transcripts/');
    console.log(`📁 Found ${blobFiles.length} files in Vercel Blob storage`);

    const results = {
      total: blobFiles.length,
      created: 0,
      skipped: 0,
      errors: 0,
      analyzed: 0,
      files: [] as Array<{
        filename: string;
        status: 'created' | 'skipped' | 'error';
        transcriptId?: string;
        message?: string;
      }>,
    };

    // Process each file
    for (const file of blobFiles) {
      try {
        // Extract filename from pathname
        const filename = file.pathname.split('/').pop() || file.pathname;

        // Check if transcript already exists in database
        const existing = await getTranscriptByUrl(file.url);

        if (existing) {
          console.log(`⏭️  Skipping ${filename} - already in database`);
          results.skipped++;
          results.files.push({
            filename,
            status: 'skipped',
            message: 'Already exists in database',
          });
          continue;
        }

        // Create new transcript record
        const transcript = await createTranscript({
          blobUrl: file.url,
          pathname: file.pathname,
          filename,
          size: file.size,
          uploadedAt: file.uploadedAt,
          contentType: 'text/plain', // Adjust based on actual file type
          status: 'pending',
          metadata: {
            downloadUrl: file.downloadUrl,
            syncedAt: new Date().toISOString(),
          },
        });

        console.log(`✅ Created transcript record for ${filename}`);
        results.created++;
        results.files.push({
          filename,
          status: 'created',
          transcriptId: transcript.id,
        });
      } catch (error) {
        console.error(`❌ Error processing ${file.pathname}:`, error);
        results.errors++;
        results.files.push({
          filename: file.pathname.split('/').pop() || file.pathname,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log('✅ Transcript sync complete:', results);

    const message = analyze
      ? `Synced ${results.created} new transcripts (${results.analyzed} analyzed). ${results.skipped} already existed. ${results.errors} errors.`
      : `Synced ${results.created} new transcripts. ${results.skipped} already existed. ${results.errors} errors.`;

    return NextResponse.json({
      success: true,
      results,
      message,
    });
  } catch (error) {
    console.error('❌ Error syncing transcripts:', error);

    return NextResponse.json(
      {
        error: 'Failed to sync transcripts',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/transcripts/sync
 * Returns sync status and info
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/transcripts/sync',
    method: 'POST',
    description: 'Syncs transcript files from Vercel Blob storage to database',
    blobPrefix: 'transcripts/',
  });
}
