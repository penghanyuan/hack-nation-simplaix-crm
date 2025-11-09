import { NextResponse } from 'next/server';
import { createOAuth2Client, fetchEmailsByHours, extractEmailAddress } from '@/lib/gmail';
import { getUserSettings } from '@/services/userSettings';
import { createEmail, getEmailByGmailId } from '@/services/emailService';

/**
 * POST /api/emails/sync
 * Syncs emails from Gmail to the database based on configured time range
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { hoursBack } = body;

    console.log('🔄 Starting email sync from Gmail...');

    // Get user settings for Gmail credentials and sync hours
    const settings = await getUserSettings();

    if (!settings?.gmailAccessToken || !settings?.gmailRefreshToken) {
      return NextResponse.json(
        {
          error: 'Gmail not connected',
          details: 'Please connect your Gmail account first',
        },
        { status: 401 }
      );
    }

    // Use provided hours or fall back to user setting or default (12 hours)
    const syncHours = hoursBack ?? settings.emailSyncHours ?? 12;

    // Check if token is expired and needs refresh
    const oauth2Client = createOAuth2Client();
    const now = new Date();
    const tokenExpiry = settings.gmailTokenExpiry ? new Date(settings.gmailTokenExpiry) : null;

    if (tokenExpiry && tokenExpiry <= now) {
      console.log('🔑 Token expired, needs refresh');
      return NextResponse.json(
        {
          error: 'Token expired',
          details: 'Gmail token expired. Please reconnect your Gmail account',
        },
        { status: 401 }
      );
    }

    // Set credentials
    oauth2Client.setCredentials({
      access_token: settings.gmailAccessToken,
      refresh_token: settings.gmailRefreshToken,
      expiry_date: tokenExpiry?.getTime(),
    });

    // Fetch emails from Gmail
    console.log(`📧 Fetching emails from last ${syncHours} hours...`);
    const gmailEmails = await fetchEmailsByHours(oauth2Client, syncHours);
    console.log(`📬 Found ${gmailEmails.length} emails from Gmail`);

    const results = {
      total: gmailEmails.length,
      created: 0,
      skipped: 0,
      errors: 0,
      emails: [] as Array<{
        gmailId: string;
        subject: string;
        status: 'created' | 'skipped' | 'error';
        emailId?: string;
        message?: string;
      }>,
    };

    // Process each email
    for (const gmailEmail of gmailEmails) {
      try {
        // Check if email already exists in database
        const existing = await getEmailByGmailId(gmailEmail.id);

        if (existing) {
          console.log(`⏭️  Skipping email "${gmailEmail.subject}" - already in database`);
          results.skipped++;
          results.emails.push({
            gmailId: gmailEmail.id,
            subject: gmailEmail.subject,
            status: 'skipped',
            message: 'Already exists in database',
          });
          continue;
        }

        // Extract email addresses
        const fromEmail = extractEmailAddress(gmailEmail.from);
        const fromName = gmailEmail.from.replace(/<.+?>/, '').trim() || undefined;
        const toEmail = gmailEmail.to[0] ? extractEmailAddress(gmailEmail.to[0]) : undefined;

        // Create new email record with pending status
        const email = await createEmail({
          gmailId: gmailEmail.id,
          subject: gmailEmail.subject,
          body: gmailEmail.body,
          fromEmail,
          fromName,
          toEmail,
          receivedAt: gmailEmail.date,
          status: 'pending',
          metadata: {
            threadId: gmailEmail.threadId,
            snippet: gmailEmail.snippet,
            to: gmailEmail.to,
            cc: gmailEmail.cc,
            syncedAt: new Date().toISOString(),
          },
        });

        console.log(`✅ Created email record for "${gmailEmail.subject}"`);
        results.created++;
        results.emails.push({
          gmailId: gmailEmail.id,
          subject: gmailEmail.subject,
          status: 'created',
          emailId: email.id,
        });
      } catch (error) {
        console.error(`❌ Error processing email "${gmailEmail.subject}":`, error);
        results.errors++;
        results.emails.push({
          gmailId: gmailEmail.id,
          subject: gmailEmail.subject,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log('✅ Email sync complete:', results);

    const message = `Synced ${results.created} new emails. ${results.skipped} already existed. ${results.errors} errors.`;

    return NextResponse.json({
      success: true,
      results,
      message,
    });
  } catch (error) {
    console.error('❌ Error syncing emails:', error);

    return NextResponse.json(
      {
        error: 'Failed to sync emails',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/emails/sync
 * Returns sync status and info
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/emails/sync',
    method: 'POST',
    description: 'Syncs emails from Gmail to database',
    parameters: {
      hoursBack: 'Optional: number of hours to look back (defaults to user setting or 12)',
    },
  });
}
