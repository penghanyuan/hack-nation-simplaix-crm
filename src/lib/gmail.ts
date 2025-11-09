import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export interface GmailEmail {
  id: string;
  threadId: string;
  from: string;
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  date: Date;
  snippet: string;
}

/**
 * Create OAuth2 client for Gmail API
 */
export function createOAuth2Client(): OAuth2Client {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'
  );
  
  return oauth2Client;
}

/**
 * Generate Google OAuth authorization URL
 */
export function getAuthUrl(oauth2Client: OAuth2Client): string {
  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent', // Force consent screen to get refresh token
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function getTokensFromCode(oauth2Client: OAuth2Client, code: string) {
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  return tokens;
}

/**
 * Parse email headers
 */
function parseHeaders(headers: any[]): {
  from: string;
  to: string[];
  cc?: string[];
  subject: string;
  date: string;
} {
  const headerMap: { [key: string]: string } = {};
  headers.forEach((header) => {
    headerMap[header.name.toLowerCase()] = header.value;
  });

  return {
    from: headerMap['from'] || '',
    to: headerMap['to']?.split(',').map(e => e.trim()) || [],
    cc: headerMap['cc']?.split(',').map(e => e.trim()),
    subject: headerMap['subject'] || '(No Subject)',
    date: headerMap['date'] || new Date().toISOString(),
  };
}

/**
 * Decode base64url email body
 */
function decodeBody(encodedBody?: string): string {
  if (!encodedBody) return '';
  
  try {
    const decodedBody = Buffer.from(encodedBody, 'base64url').toString('utf-8');
    return decodedBody;
  } catch (error) {
    console.error('Error decoding email body:', error);
    return '';
  }
}

/**
 * Extract plain text from email parts (handles multipart emails)
 */
function extractTextFromParts(parts: any[]): string {
  let text = '';
  
  for (const part of parts) {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      text += decodeBody(part.body.data);
    } else if (part.mimeType === 'text/html' && part.body?.data && !text) {
      // Use HTML as fallback if no plain text found
      const html = decodeBody(part.body.data);
      // Simple HTML to text conversion (strip tags)
      text += html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    } else if (part.parts) {
      // Recursively process nested parts
      text += extractTextFromParts(part.parts);
    }
  }
  
  return text;
}

/**
 * Fetch recent emails from Gmail
 */
export async function fetchRecentEmails(
  oauth2Client: OAuth2Client,
  maxResults: number = 20,
  daysBack: number = 7
): Promise<GmailEmail[]> {
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // Calculate date for filtering (7 days back)
  const dateAfter = new Date();
  dateAfter.setDate(dateAfter.getDate() - daysBack);
  const afterQuery = `after:${Math.floor(dateAfter.getTime() / 1000)}`;

  // Fetch message IDs (from inbox, sent, or important categories)
  const response = await gmail.users.messages.list({
    userId: 'me',
    maxResults,
    q: `${afterQuery} (in:inbox OR in:sent) -in:spam -in:trash`,
  });

  const messages = response.data.messages || [];
  const emails: GmailEmail[] = [];

  // Fetch full message details for each ID
  for (const message of messages) {
    if (!message.id) continue;

    try {
      const fullMessage = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'full',
      });

      const headers = fullMessage.data.payload?.headers || [];
      const parsed = parseHeaders(headers);

      let body = '';
      const payload = fullMessage.data.payload;

      // Handle different email structures
      if (payload?.body?.data) {
        body = decodeBody(payload.body.data);
      } else if (payload?.parts) {
        body = extractTextFromParts(payload.parts);
      }

      emails.push({
        id: message.id,
        threadId: fullMessage.data.threadId || '',
        from: parsed.from,
        to: parsed.to,
        cc: parsed.cc,
        subject: parsed.subject,
        body: body || fullMessage.data.snippet || '',
        date: new Date(parsed.date),
        snippet: fullMessage.data.snippet || '',
      });
    } catch (error) {
      console.error(`Error fetching message ${message.id}:`, error);
    }
  }

  return emails;
}

/**
 * Fetch emails from Gmail by hours back
 */
export async function fetchEmailsByHours(
  oauth2Client: OAuth2Client,
  hoursBack: number = 12,
  maxResults: number = 50
): Promise<GmailEmail[]> {
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // Calculate date for filtering (N hours back)
  const dateAfter = new Date();
  dateAfter.setHours(dateAfter.getHours() - hoursBack);
  const afterQuery = `after:${Math.floor(dateAfter.getTime() / 1000)}`;

  // Fetch message IDs (from inbox, sent, or important categories)
  const response = await gmail.users.messages.list({
    userId: 'me',
    maxResults,
    q: `${afterQuery} (in:inbox OR in:sent) -in:spam -in:trash`,
  });

  const messages = response.data.messages || [];
  const emails: GmailEmail[] = [];

  // Fetch full message details for each ID
  for (const message of messages) {
    if (!message.id) continue;

    try {
      const fullMessage = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'full',
      });

      const headers = fullMessage.data.payload?.headers || [];
      const parsed = parseHeaders(headers);

      let body = '';
      const payload = fullMessage.data.payload;

      // Handle different email structures
      if (payload?.body?.data) {
        body = decodeBody(payload.body.data);
      } else if (payload?.parts) {
        body = extractTextFromParts(payload.parts);
      }

      emails.push({
        id: message.id,
        threadId: fullMessage.data.threadId || '',
        from: parsed.from,
        to: parsed.to,
        cc: parsed.cc,
        subject: parsed.subject,
        body: body || fullMessage.data.snippet || '',
        date: new Date(parsed.date),
        snippet: fullMessage.data.snippet || '',
      });
    } catch (error) {
      console.error(`Error fetching message ${message.id}:`, error);
    }
  }

  return emails;
}

/**
 * Extract email address from "Name <email@domain.com>" format
 */
export function extractEmailAddress(emailString: string): string {
  const match = emailString.match(/<(.+?)>/);
  return match ? match[1] : emailString.trim();
}

/**
 * Extract domain from email address
 */
export function extractDomain(email: string): string {
  const cleanEmail = extractEmailAddress(email);
  const parts = cleanEmail.split('@');
  return parts.length === 2 ? parts[1].toLowerCase() : '';
}

