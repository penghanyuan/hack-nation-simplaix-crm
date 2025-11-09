import { NextResponse } from 'next/server';
import { createOAuth2Client, getGmailClient } from '@/lib/gmail';
import { getUserSettings } from '@/services/userSettings';

type GmailMessagePart = {
  mimeType?: string | null;
  body?: { data?: string | null } | null;
  parts?: GmailMessagePart[];
};

/**
 * GET /api/gmail/latest
 * Fetches the latest email from Gmail inbox
 */
export async function GET() {
  try {
    const userId = 'default'; // For hackathon MVP, using single user
    
    // Get Gmail tokens from database
    const setting = await getUserSettings(userId);

    if (!setting || !setting.gmailAccessToken) {
      return NextResponse.json(
        { error: 'Gmail not connected. Please connect your Gmail account first.' },
        { status: 401 }
      );
    }

    // Check if token is expired
    const now = new Date();
    if (setting.gmailTokenExpiry && setting.gmailTokenExpiry < now) {
      return NextResponse.json(
        { error: 'Gmail token expired. Please reconnect your Gmail account.' },
        { status: 401 }
      );
    }

    // Create OAuth client and set credentials
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
      access_token: setting.gmailAccessToken,
      refresh_token: setting.gmailRefreshToken,
    });

    // Fetch latest email from inbox
    const gmail = getGmailClient(oauth2Client);
    
    // Get the latest message ID
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 1,
      q: 'in:inbox -in:spam -in:trash',
    });

    const messages = listResponse.data.messages || [];
    
    if (messages.length === 0) {
      return NextResponse.json({
        message: 'No emails found in inbox',
        email: null,
      });
    }

    // Get the full message details
    const messageId = messages[0].id!;
    const fullMessage = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });

    // Parse headers
    const headers = fullMessage.data.payload?.headers || [];
    const headerMap: Record<string, string> = {};
    headers.forEach((header) => {
      if (header.name && header.value) {
        headerMap[header.name.toLowerCase()] = header.value;
      }
    });

    // Extract body
    let body = '';
    const payload = fullMessage.data.payload as GmailMessagePart | undefined;
    
    function decodeBody(encodedBody?: string): string {
      if (!encodedBody) return '';
      try {
        return Buffer.from(encodedBody, 'base64url').toString('utf-8');
      } catch {
        return '';
      }
    }

    function extractTextFromParts(parts: GmailMessagePart[] = []): string {
      let text = '';
      for (const part of parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          text += decodeBody(part.body.data);
        } else if (part.mimeType === 'text/html' && part.body?.data && !text) {
          const html = decodeBody(part.body.data);
          text += html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        } else if (part.parts) {
          text += extractTextFromParts(part.parts);
        }
      }
      return text;
    }

    if (payload?.body?.data) {
      body = decodeBody(payload.body.data);
    } else if (payload?.parts) {
      body = extractTextFromParts(payload.parts);
    }

    // Format response
    const email = {
      id: messageId,
      threadId: fullMessage.data.threadId || '',
      from: headerMap['from'] || '',
      to: headerMap['to']?.split(',').map(e => e.trim()) || [],
      cc: headerMap['cc']?.split(',').map(e => e.trim()),
      subject: headerMap['subject'] || '(No Subject)',
      date: headerMap['date'] || new Date().toISOString(),
      snippet: fullMessage.data.snippet || '',
      body: body || fullMessage.data.snippet || '',
    };

    // Print to console
    console.log('==== LATEST EMAIL ====');
    console.log('From:', email.from);
    console.log('To:', email.to.join(', '));
    console.log('Subject:', email.subject);
    console.log('Date:', email.date);
    console.log('Snippet:', email.snippet);
    console.log('Body:', email.body.substring(0, 500) + '...');
    console.log('======================');

    return NextResponse.json({
      message: 'Successfully fetched latest email',
      email,
    });
  } catch (error) {
    console.error('Error fetching latest email:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch email from Gmail',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
