import { NextRequest, NextResponse } from 'next/server';
import { getActivityById } from '@/services/activityService';

/**
 * GET /api/activities/[id]
 * Get full details of a specific activity
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const activity = await getActivityById(id);

    if (!activity) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(activity);
  } catch (error) {
    console.error('Error fetching activity:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch activity',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
