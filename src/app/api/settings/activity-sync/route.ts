import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { userSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * POST /api/settings/activity-sync
 * Update the lastActivitySync timestamp
 */
export async function POST(request: NextRequest) {
  try {
    const userId = 'default'; // Using default user for now

    // Check if user settings exist
    const [existingSettings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);

    const now = new Date();

    if (existingSettings) {
      // Update existing settings
      const [updated] = await db
        .update(userSettings)
        .set({
          lastActivitySync: now,
          updatedAt: now,
        })
        .where(eq(userSettings.userId, userId))
        .returning();

      return NextResponse.json({
        success: true,
        lastActivitySync: updated.lastActivitySync,
      });
    } else {
      // Create new settings record
      const [created] = await db
        .insert(userSettings)
        .values({
          userId,
          lastActivitySync: now,
        })
        .returning();

      return NextResponse.json({
        success: true,
        lastActivitySync: created.lastActivitySync,
      });
    }
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

    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);

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
