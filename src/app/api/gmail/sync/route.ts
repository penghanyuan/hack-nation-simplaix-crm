import { NextResponse } from 'next/server';
import { db } from '@/db';
import { userSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createOAuth2Client, fetchRecentEmails } from '@/lib/gmail';

/**
 * POST /api/gmail/sync
 * Fetches recent emails and processes them for CRM data extraction
 */
export async function POST() {
  try {
    // Get stored tokens
    const settings = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, 'default'))
      .limit(1);

    if (settings.length === 0 || !settings[0].gmailAccessToken) {
      return NextResponse.json(
        { error: 'Gmail not connected. Please connect your Gmail account first.' },
        { status: 401 }
      );
    }

    const userSetting = settings[0];

    // Create OAuth client with stored tokens
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
      access_token: userSetting.gmailAccessToken,
      refresh_token: userSetting.gmailRefreshToken,
      expiry_date: userSetting.gmailTokenExpiry?.getTime(),
    });

    // Fetch recent emails (last 7 days, max 20 emails)
    const emails = await fetchRecentEmails(oauth2Client, 20, 7);

    // Update last sync time
    await db
      .update(userSettings)
      .set({ 
        lastGmailSync: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userSettings.userId, 'default'));

    // Return emails for processing
    // In the next phase, we'll pass these to the AI extraction pipeline
    return NextResponse.json({
      success: true,
      emailCount: emails.length,
      emails: emails.map(e => ({
        id: e.id,
        from: e.from,
        to: e.to,
        subject: e.subject,
        date: e.date,
        snippet: e.snippet,
      })),
      message: `Fetched ${emails.length} emails. AI processing will be implemented in Phase 3.`,
    });
  } catch (error: any) {
    console.error('Error syncing Gmail:', error);
    
    // Check if it's an auth error
    if (error?.code === 401 || error?.message?.includes('invalid_grant')) {
      return NextResponse.json(
        { error: 'Gmail authentication expired. Please reconnect your account.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to sync Gmail', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/gmail/sync
 * Get last sync status
 */
export async function GET() {
  try {
    const settings = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, 'default'))
      .limit(1);

    if (settings.length === 0) {
      return NextResponse.json({
        connected: false,
        lastSync: null,
      });
    }

    const userSetting = settings[0];

    return NextResponse.json({
      connected: !!userSetting.gmailAccessToken,
      lastSync: userSetting.lastGmailSync,
      autoApproveMode: userSetting.autoApproveMode,
    });
  } catch (error) {
    console.error('Error getting sync status:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}

