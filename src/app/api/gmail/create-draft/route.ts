import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { userSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createOAuth2Client, createGmailDraft } from '@/lib/gmail';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, emailBody, cc } = body;

    if (!to || !Array.isArray(to) || to.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Recipient email(s) required' },
        { status: 400 }
      );
    }

    if (!subject || !emailBody) {
      return NextResponse.json(
        { success: false, error: 'Subject and email body are required' },
        { status: 400 }
      );
    }

    // Get user settings to retrieve Gmail tokens
    const settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, 'default'),
    });

    if (!settings?.gmailAccessToken || !settings?.gmailRefreshToken) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Gmail not connected. Please connect your Gmail account first.' 
        },
        { status: 401 }
      );
    }

    // Create OAuth2 client and set credentials
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
      access_token: settings.gmailAccessToken,
      refresh_token: settings.gmailRefreshToken,
      expiry_date: settings.gmailTokenExpiry?.getTime(),
    });

    // Check if token needs refresh
    if (settings.gmailTokenExpiry && new Date() >= settings.gmailTokenExpiry) {
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);

      // Update stored tokens
      await db
        .update(userSettings)
        .set({
          gmailAccessToken: credentials.access_token || settings.gmailAccessToken,
          gmailTokenExpiry: credentials.expiry_date 
            ? new Date(credentials.expiry_date) 
            : settings.gmailTokenExpiry,
        })
        .where(eq(userSettings.userId, 'default'));
    }

    // Create the Gmail draft
    const draft = await createGmailDraft(
      oauth2Client,
      to,
      subject,
      emailBody,
      cc
    );

    return NextResponse.json({
      success: true,
      draft: {
        id: draft.id,
        messageId: draft.message.id,
      },
      message: 'Gmail draft created successfully',
    });
  } catch (error) {
    console.error('Error creating Gmail draft:', error);
    
    // Handle specific Gmail API errors
    if (error instanceof Error) {
      if (error.message.includes('invalid_grant')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Gmail authorization expired. Please reconnect your Gmail account.' 
          },
          { status: 401 }
        );
      }
      
      if (error.message.includes('insufficient permissions')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Insufficient permissions. Please reconnect Gmail with compose permissions.' 
          },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create Gmail draft' 
      },
      { status: 500 }
    );
  }
}

