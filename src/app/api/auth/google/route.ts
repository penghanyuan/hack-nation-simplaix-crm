import { NextResponse } from 'next/server';
import { createOAuth2Client, getAuthUrl } from '@/lib/gmail';

/**
 * GET /api/auth/google
 * Initiates Gmail OAuth flow
 */
export async function GET() {
  try {
    const oauth2Client = createOAuth2Client();
    const authUrl = getAuthUrl(oauth2Client);
    
    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate authorization URL' },
      { status: 500 }
    );
  }
}

