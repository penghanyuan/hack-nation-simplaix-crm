import { NextResponse } from 'next/server';
import { getUserSettings } from '@/services/userSettings';
import { db } from '@/db';
import { userSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';

const DEFAULT_USER_ID = 'default';

/**
 * GET /api/settings/email-sync-hours
 * Returns the current email sync hours setting
 */
export async function GET() {
  try {
    const settings = await getUserSettings(DEFAULT_USER_ID);

    return NextResponse.json({
      emailSyncHours: settings?.emailSyncHours ?? 12,
    });
  } catch (error) {
    console.error('Error fetching email sync hours:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch email sync hours',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/email-sync-hours
 * Updates the email sync hours setting
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { emailSyncHours } = body;

    if (typeof emailSyncHours !== 'number' || emailSyncHours < 1 || emailSyncHours > 168) {
      return NextResponse.json(
        {
          error: 'Invalid email sync hours',
          details: 'Email sync hours must be a number between 1 and 168 (1 week)',
        },
        { status: 400 }
      );
    }

    // Get or create user settings
    const settings = await getUserSettings(DEFAULT_USER_ID);

    if (settings) {
      // Update existing settings
      await db
        .update(userSettings)
        .set({
          emailSyncHours,
          updatedAt: new Date(),
        })
        .where(eq(userSettings.userId, DEFAULT_USER_ID));
    } else {
      // Create new settings
      await db
        .insert(userSettings)
        .values({
          userId: DEFAULT_USER_ID,
          emailSyncHours,
        });
    }

    return NextResponse.json({
      success: true,
      emailSyncHours,
    });
  } catch (error) {
    console.error('Error updating email sync hours:', error);

    return NextResponse.json(
      {
        error: 'Failed to update email sync hours',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
