import { NextResponse } from 'next/server';
import { getPendingEmails, updateEmail } from '@/services/emailService';
import { analyzeEmailWithTools, type EmailData } from '@/lib/ai';
import { createPendingActivity } from '@/services/activityService';

/**
 * POST /api/emails/analyze-pending
 * Analyzes all pending emails one by one
 * Creates activities for each analysis result
 */
export async function POST() {
  try {
    console.log('🔍 Checking for pending emails...');

    // Get all pending emails
    const pendingEmails = await getPendingEmails();

    if (pendingEmails.length === 0) {
      console.log('⚠️ No pending emails found');
      
      // Debug: Check if there are ANY emails in the database
      const { listEmails } = await import('@/services/emailService');
      const allEmails = await listEmails();
      console.log(`📊 Total emails in database: ${allEmails.length}`);
      
      if (allEmails.length > 0) {
        console.log('📋 Email statuses:', allEmails.slice(0, 5).map(e => ({
          gmailId: e.gmailId,
          subject: e.subject.substring(0, 30),
          status: e.status,
          createdAt: e.createdAt
        })));
      }
      
      return NextResponse.json({
        success: true,
        message: 'No pending emails to analyze',
        results: {
          total: 0,
          processed: 0,
          failed: 0,
          activities: 0,
        },
      });
    }

    console.log(`📧 Found ${pendingEmails.length} pending emails`);
    console.log('📋 Pending email details:', pendingEmails.map(e => ({
      gmailId: e.gmailId,
      subject: e.subject.substring(0, 40),
      status: e.status
    })));

    const results = {
      total: pendingEmails.length,
      processed: 0,
      failed: 0,
      activities: 0,
      emails: [] as Array<{
        emailId: string;
        subject: string;
        status: 'success' | 'error';
        activitiesCreated?: number;
        error?: string;
      }>,
    };

    // Process each email one by one
    for (const email of pendingEmails) {
      try {
        console.log(`🤖 Analyzing email: ${email.subject}`);

        // Update status to processing
        await updateEmail(email.id, { status: 'processing' });

        // Get folder from email metadata
        const emailMetadata = email.metadata as Record<string, unknown> || {};
        const folder = emailMetadata.folder as 'inbox' | 'sent' || 'inbox';

        // Prepare email data for analysis
        const emailData: EmailData & { folder?: 'inbox' | 'sent' } = {
          subject: email.subject,
          body: email.body,
          from: {
            email: email.fromEmail,
            name: email.fromName || undefined,
          },
          to: email.toEmail || undefined,
          date: email.receivedAt.toISOString(),
          folder,
        };

        // Analyze the email with tool-based contact/task lookup
        const analysis = await analyzeEmailWithTools(emailData);

        console.log('✅ Analysis complete:', {
          contacts: analysis.contacts.length,
          contactUpdates: analysis.contactUpdates?.length || 0,
          tasks: analysis.tasks.length,
          deals: analysis.deals?.length || 0,
        });

        let activitiesCreated = 0;

        // Create activity for each extracted contact (new contacts)
        for (const contactData of analysis.contacts) {
          await createPendingActivity({
            entityType: 'contact',
            action: 'create',
            sourceType: 'email',
            extractedData: { ...contactData, action: 'create' },
            sourceInteractionId: null,
            sourceEmailSubject: email.subject,
            sourceEmailFrom: email.fromEmail,
            sourceEmailDate: email.receivedAt,
          });
          activitiesCreated++;
        }

        // Create activity for each contact update
        if (analysis.contactUpdates) {
          for (const updateData of analysis.contactUpdates) {
            await createPendingActivity({
              entityType: 'contact',
              action: 'update',
              sourceType: 'email',
              extractedData: { ...updateData, action: 'update' },
              sourceInteractionId: null,
              sourceEmailSubject: email.subject,
              sourceEmailFrom: email.fromEmail,
              sourceEmailDate: email.receivedAt,
            });
            activitiesCreated++;
          }
        }

        // Create activity for each extracted task
        for (const taskData of analysis.tasks) {
          await createPendingActivity({
            entityType: 'task',
            action: 'create',
            sourceType: 'email',
            extractedData: taskData,
            sourceInteractionId: null,
            sourceEmailSubject: email.subject,
            sourceEmailFrom: email.fromEmail,
            sourceEmailDate: email.receivedAt,
          });
          activitiesCreated++;
        }

        // Create activity for each extracted deal (from sent emails)
        if (analysis.deals && analysis.deals.length > 0) {
          for (const dealData of analysis.deals) {
            await createPendingActivity({
              entityType: 'deal',
              action: 'create',
              sourceType: 'email',
              extractedData: dealData,
              sourceInteractionId: null,
              sourceEmailSubject: email.subject,
              sourceEmailFrom: email.fromEmail,
              sourceEmailDate: email.receivedAt,
            });
            activitiesCreated++;
          }
        }

        // Update email with analysis results
        await updateEmail(email.id, {
          status: 'processed',
          processedAt: new Date(),
          metadata: {
            ...(email.metadata as Record<string, unknown> || {}),
            analysis: {
              contactCount: analysis.contacts.length,
              contactUpdateCount: analysis.contactUpdates?.length || 0,
              taskCount: analysis.tasks.length,
              dealCount: analysis.deals?.length || 0,
              folder,
              analyzedAt: new Date().toISOString(),
            },
          },
        });

        results.processed++;
        results.activities += activitiesCreated;
        results.emails.push({
          emailId: email.id,
          subject: email.subject,
          status: 'success',
          activitiesCreated,
        });

        console.log(`✅ Completed ${email.subject}: ${activitiesCreated} activities created`);
      } catch (error) {
        console.error(`❌ Error analyzing ${email.subject}:`, error);

        // Update email status to error
        await updateEmail(email.id, {
          status: 'error',
          metadata: {
            ...(email.metadata as Record<string, unknown> || {}),
            error: error instanceof Error ? error.message : 'Unknown error',
            errorAt: new Date().toISOString(),
          },
        }).catch(console.error);

        results.failed++;
        results.emails.push({
          emailId: email.id,
          subject: email.subject,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log('✅ Email analysis batch complete:', results);

    return NextResponse.json({
      success: true,
      message: `Analyzed ${results.processed}/${results.total} emails. ${results.activities} activities created.`,
      results,
    });
  } catch (error) {
    console.error('❌ Error analyzing pending emails:', error);

    return NextResponse.json(
      {
        error: 'Failed to analyze pending emails',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
