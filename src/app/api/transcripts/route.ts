import { NextResponse } from 'next/server';
import { listTranscripts } from '@/services/transcriptService';

/**
 * GET /api/transcripts
 * Returns all transcripts from the database
 */
export async function GET() {
  try {
    const transcripts = await listTranscripts();

    return NextResponse.json({
      success: true,
      count: transcripts.length,
      transcripts,
    });
  } catch (error) {
    console.error('Error fetching transcripts:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch transcripts',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

