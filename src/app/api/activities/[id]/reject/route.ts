import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { activities } from '@/db/schema';
import { eq } from 'drizzle-orm';

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
    const [activity] = await db
      .select()
      .from(activities)
      .where(eq(activities.id, id))
      .limit(1);

    if (!activity) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

    if (activity.status !== 'pending') {
      return NextResponse.json(
        { error: 'Activity is not pending' },
        { status: 400 }
      );
    }

    // Mark activity as rejected
    await db
      .update(activities)
      .set({ status: 'rejected', processedAt: new Date() })
      .where(eq(activities.id, id));

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
