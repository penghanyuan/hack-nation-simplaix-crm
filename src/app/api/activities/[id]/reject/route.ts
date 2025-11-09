import { NextRequest, NextResponse } from 'next/server';
import { getActivityById, markActivityStatus } from '@/services/activityService';

/**
 * PATCH /api/activities/[id]/reject
 * Reject an activity - marks it as rejected without inserting the data
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch the activity
    const activity = await getActivityById(id);

    if (!activity) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

    // if (activity.status !== 'pending') {
    //   return NextResponse.json(
    //     { error: 'Activity is not pending' },
    //     { status: 400 }
    //   );
    // }

    // Mark activity as rejected
    await markActivityStatus(id, 'rejected');

    return NextResponse.json({
      success: true,
      message: `${activity.entityType} rejected`,
    });
  } catch (error) {
    console.error('Error rejecting activity:', error);

    return NextResponse.json(
      {
        error: 'Failed to reject activity',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
