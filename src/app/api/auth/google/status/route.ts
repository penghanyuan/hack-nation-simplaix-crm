import { NextResponse } from 'next/server';
import { db } from '@/db';
import { userSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/auth/google/status
 * Check if Gmail is connected and return connection status
 */
export async function GET() {
  try {
    const userId = 'default'; // For hackathon MVP, using single user
    
    const settings = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);

    if (settings.length === 0 || !settings[0].gmailAccessToken) {
      return NextResponse.json({
        isConnected: false,
      });
    }

    const setting = settings[0];
    const now = new Date();
    const isTokenExpired = setting.gmailTokenExpiry && setting.gmailTokenExpiry < now;

    return NextResponse.json({
      isConnected: !isTokenExpired,
      lastSync: setting.lastGmailSync?.toISOString(),
      tokenExpiry: setting.gmailTokenExpiry?.toISOString(),
    });
  } catch (error) {
    console.error('Error checking Gmail status:', error);
    return NextResponse.json(
      { error: 'Failed to check Gmail status' },
      { status: 500 }
    );
  }
}

