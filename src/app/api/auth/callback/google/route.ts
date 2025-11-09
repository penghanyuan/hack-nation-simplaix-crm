import { NextRequest, NextResponse } from 'next/server';
import { createOAuth2Client, getTokensFromCode } from '@/lib/gmail';
import { saveGmailTokens } from '@/services/userSettings';

/**
 * GET /api/auth/google/callback
 * Handles OAuth callback and stores tokens
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        new URL(`/people?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/people?error=no_code', request.url)
      );
    }

    // Exchange code for tokens
    const oauth2Client = createOAuth2Client();
    const tokens = await getTokensFromCode(oauth2Client, code);

    if (!tokens.access_token) {
      throw new Error('No access token received');
    }

    // Store tokens in database
    const userId = 'default'; // For hackathon MVP, using single user

    const tokenExpiry = tokens.expiry_date 
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000); // 1 hour default

    await saveGmailTokens(userId, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiry: tokenExpiry,
    });

    // Redirect to people page with success
    return NextResponse.redirect(
      new URL('/people?success=gmail_connected', request.url)
    );
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    return NextResponse.redirect(
      new URL('/people?error=auth_failed', request.url)
    );
  }
}
