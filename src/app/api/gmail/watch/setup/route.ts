import { NextResponse } from 'next/server';
import { createOAuth2Client, setupGmailWatch, stopGmailWatch } from '@/lib/gmail';
import { getUserSettings, updateGmailWatch } from '@/services/userSettings';

/**
 * POST /api/gmail/watch/setup
 * Setup Gmail push notifications
 */
export async function POST() {
  try {
    // Get stored tokens
    const userSetting = await getUserSettings('default');

    if (!userSetting || !userSetting.gmailAccessToken) {
      return NextResponse.json(
        { error: 'Gmail not connected. Please connect your Gmail account first.' },
        { status: 401 }
      );
    }

    // Validate environment variables
    if (!process.env.GOOGLE_PROJECT_ID) {
      return NextResponse.json(
        { error: 'GOOGLE_PROJECT_ID not configured in environment variables' },
        { status: 500 }
      );
    }

    // Create OAuth client with stored tokens
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
      access_token: userSetting.gmailAccessToken,
      refresh_token: userSetting.gmailRefreshToken,
      expiry_date: userSetting.gmailTokenExpiry?.getTime(),
    });

    // Setup watch
    const watchResponse = await setupGmailWatch(oauth2Client, 'gmail-push');

    // Store historyId and expiration
    const expirationDate = new Date(parseInt(watchResponse.expiration));
    await updateGmailWatch('default', watchResponse.historyId, expirationDate);

    return NextResponse.json({
      success: true,
      historyId: watchResponse.historyId,
      expiration: expirationDate.toISOString(),
      message: 'Gmail watch setup successfully. You will receive push notifications for new emails.',
    });
  } catch (error) {
    console.error('Error setting up Gmail watch:', error);
    const watchError = error as { code?: number; message?: string };
    
    // Check if it's an auth error
    if (watchError?.code === 401 || watchError?.message?.includes('invalid_grant')) {
      return NextResponse.json(
        { error: 'Gmail authentication expired. Please reconnect your account.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to setup Gmail watch', details: watchError?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/gmail/watch/setup
 * Stop Gmail push notifications
 */
export async function DELETE() {
  try {
    // Get stored tokens
    const userSetting = await getUserSettings('default');

    if (!userSetting || !userSetting.gmailAccessToken) {
      return NextResponse.json(
        { error: 'Gmail not connected. Please connect your Gmail account first.' },
        { status: 401 }
      );
    }

    // Create OAuth client with stored tokens
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
      access_token: userSetting.gmailAccessToken,
      refresh_token: userSetting.gmailRefreshToken,
      expiry_date: userSetting.gmailTokenExpiry?.getTime(),
    });

    // Stop watch
    await stopGmailWatch(oauth2Client);

    return NextResponse.json({
      success: true,
      message: 'Gmail watch stopped successfully.',
    });
  } catch (error) {
    console.error('Error stopping Gmail watch:', error);
    const watchError = error as { code?: number; message?: string };

    return NextResponse.json(
      { error: 'Failed to stop Gmail watch', details: watchError?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/gmail/watch/setup
 * Get current watch status
 */
export async function GET() {
  try {
    const settings = await getUserSettings('default');

    if (!settings) {
      return NextResponse.json({
        active: false,
        historyId: null,
        expiration: null,
      });
    }

    const now = new Date();
    const isExpired = settings.gmailWatchExpiration
      ? settings.gmailWatchExpiration < now
      : true;

    return NextResponse.json({
      active: !!settings.gmailHistoryId && !isExpired,
      historyId: settings.gmailHistoryId,
      expiration: settings.gmailWatchExpiration,
      isExpired,
    });
  } catch (error) {
    console.error('Error getting watch status:', error);
    return NextResponse.json(
      { error: 'Failed to get watch status' },
      { status: 500 }
    );
  }
}

