import { NextResponse } from 'next/server';
import { getUserSettings } from '@/services/userSettings';

/**
 * GET /api/auth/google/status
 * Check if Gmail is connected and return connection status
 */
export async function GET() {
  try {
    const userId = 'default'; // For hackathon MVP, using single user
    
    const settings = await getUserSettings(userId);

    if (!settings || !settings.gmailAccessToken) {
      return NextResponse.json({
        isConnected: false,
      });
    }

    const now = new Date();
    const isTokenExpired = settings.gmailTokenExpiry && settings.gmailTokenExpiry < now;

    return NextResponse.json({
      isConnected: !isTokenExpired,
      lastSync: settings.lastGmailSync?.toISOString(),
      tokenExpiry: settings.gmailTokenExpiry?.toISOString(),
    });
  } catch (error) {
    console.error('Error checking Gmail status:', error);
    return NextResponse.json(
      { error: 'Failed to check Gmail status' },
      { status: 500 }
    );
  }
}
