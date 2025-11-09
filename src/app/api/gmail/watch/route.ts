import { NextRequest, NextResponse } from 'next/server';
import { createOAuth2Client, fetchEmailsSinceHistory, extractEmailAddress } from '@/lib/gmail';
import { getUserSettings, updateGmailHistoryId } from '@/services/userSettings';
import { insertGmailEmails } from '@/services/emailService';
import { emailNotifications } from '@/lib/email-notifications';

/**
 * Interface for Pub/Sub push notification
 */
interface PubSubMessage {
  message: {
    data: string; // base64 encoded
    messageId: string;
    publishTime: string;
  };
  subscription: string;
}

/**
 * Interface for Gmail notification data
 */
interface GmailNotificationData {
  emailAddress: string;
  historyId: string;
}

/**
 * POST /api/gmail/watch
 * Webhook endpoint to receive Gmail push notifications from Cloud Pub/Sub
 */
export async function POST(request: NextRequest) {
  try {
    // Parse Pub/Sub message
    const body = await request.json() as PubSubMessage;

    // Decode the base64 message data
    const decodedData = Buffer.from(body.message.data, 'base64').toString('utf-8');
    const notificationData: GmailNotificationData = JSON.parse(decodedData);

    console.log('Received Gmail notification:', {
      emailAddress: notificationData.emailAddress,
      historyId: notificationData.historyId,
      messageId: body.message.messageId,
    });

    // Get stored tokens and last historyId
    const userSetting = await getUserSettings('default');

    if (!userSetting || !userSetting.gmailAccessToken) {
      console.error('Gmail not connected');
      // Return 200 to acknowledge receipt even if we can't process
      return NextResponse.json({ success: false, error: 'Gmail not connected' });
    }

    // If we don't have a previous historyId, just store the new one and skip fetching
    if (!userSetting.gmailHistoryId) {
      await updateGmailHistoryId('default', notificationData.historyId);
      return NextResponse.json({
        success: true,
        message: 'Initial historyId stored',
      });
    }

    // Create OAuth client with stored tokens
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
      access_token: userSetting.gmailAccessToken,
      refresh_token: userSetting.gmailRefreshToken,
      expiry_date: userSetting.gmailTokenExpiry?.getTime(),
    });

    // Fetch emails since last historyId
    const newEmails = await fetchEmailsSinceHistory(
      oauth2Client,
      userSetting.gmailHistoryId
    );

    console.log(`Fetched ${newEmails.length} new emails`);

    // Insert emails into database
    if (newEmails.length > 0) {
      const emailsToInsert = newEmails.map(email => {
        const fromEmail = extractEmailAddress(email.from);
        const fromName = email.from.replace(/<.*>/, '').trim() || undefined;
        const toEmail = email.to.length > 0 ? extractEmailAddress(email.to[0]) : undefined;

        return {
          gmailId: email.id,
          subject: email.subject,
          body: email.body,
          fromEmail,
          fromName,
          toEmail,
          receivedAt: email.date,
        };
      });

      const result = await insertGmailEmails(emailsToInsert);
      console.log(`Inserted ${result.inserted} emails, skipped ${result.skipped} duplicates`);
    }

    // Update historyId to the latest
    await updateGmailHistoryId('default', notificationData.historyId);

    // Notify frontend to trigger activity queue update (if we inserted any emails)
    if (newEmails.length > 0) {
      console.log(`📢 Notifying frontend of ${newEmails.length} new emails`);
      
      // Broadcast notification to all connected SSE clients
      // This will trigger the activity queue's "Update" button via Zustand store
      emailNotifications.notify({ 
        newEmailsCount: newEmails.length 
      });
      
      console.log(`✅ Notification sent to ${emailNotifications.getListenerCount()} active listeners`);
    }

    return NextResponse.json({
      success: true,
      newEmails: newEmails.length,
      message: `Processed ${newEmails.length} new emails and notified frontend`,
    });
  } catch (error) {
    console.error('Error processing Gmail notification:', error);
    const notificationError = error as { code?: number; message?: string };

    // Return 200 to acknowledge receipt even on error (prevents retries)
    return NextResponse.json({
      success: false,
      error: 'Failed to process notification',
      details: notificationError?.message ?? 'Unknown error',
    });
  }
}

/**
 * GET /api/gmail/watch
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Gmail watch webhook is active',
  });
}

