import { NextResponse } from 'next/server';
import { getUserSettings, updateLastActivitySync } from '@/services/userSettings';

/**
 * POST /api/settings/activity-sync
 * Update the lastActivitySync timestamp
 */
export async function POST() {
  try {
    const userId = 'default'; // Using default user for now

    const now = new Date();

    const updated = await updateLastActivitySync(userId, now);

    return NextResponse.json({
      success: true,
      lastActivitySync: updated?.lastActivitySync ?? now,
    });
  } catch (error) {
    console.error('Error updating activity sync time:', error);

    return NextResponse.json(
      {
        error: 'Failed to update activity sync time',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/settings/activity-sync
 * Get the last activity sync timestamp
 */
export async function GET() {
  try {
    const userId = 'default'; // Using default user for now

    const settings = await getUserSettings(userId);

    return NextResponse.json({
      lastActivitySync: settings?.lastActivitySync || null,
    });
  } catch (error) {
    console.error('Error fetching activity sync time:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch activity sync time',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
