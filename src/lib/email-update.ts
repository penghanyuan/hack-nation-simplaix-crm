import type { EmailAnalysisResult } from '@/lib/ai';

/**
 * Email update utilities
 * Handles fetching, saving, and analyzing emails from Gmail
 */

export interface EmailUpdateResult {
  success: boolean;
  message: string;
  analysis?: EmailAnalysisResult;
  error?: string;
}

export interface EmailUpdateCallbacks {
  onStart?: () => void;
  onFetchEmail?: (email: SyncedEmail) => void;
  onSaveEmail?: () => void;
  onAnalyze?: (analysis: EmailAnalysisResult) => void;
  onComplete?: (result: EmailUpdateResult) => void;
  onError?: (error: Error) => void;
}

export interface SyncedEmail {
  id?: string;
  threadId?: string;
  from: string;
  to: string[];
  subject: string;
  body: string;
  date: string;
}

/**
 * Fetches the latest email from Gmail, saves it to the database,
 * and analyzes it using AI
 * 
 * @param callbacks - Optional callbacks for different stages
 * @returns Result object with success status and data
 */
export async function updateLatestEmail(
  callbacks?: EmailUpdateCallbacks
): Promise<EmailUpdateResult> {
  try {
    callbacks?.onStart?.();
    console.log('🔄 Starting email update...');

    // 1. Fetch latest email from Gmail
    console.log('📧 Fetching latest email from Gmail...');
    const emailResponse = await fetch('/api/gmail/latest');
    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      throw new Error(emailData.error || 'Failed to fetch email');
    }

    if (!emailData.email) {
      console.log('ℹ️ No new emails found');
      return {
        success: false,
        message: 'No new emails found in inbox',
      };
    }

    const email = emailData.email as SyncedEmail;
    console.log('✅ Email fetched:', {
      from: email.from,
      subject: email.subject,
      date: email.date,
    });
    callbacks?.onFetchEmail?.(email);

    // Parse sender info
    const fromMatch = email.from.match(/(.*?)\s*<(.+?)>/);
    const fromName = fromMatch ? fromMatch[1].trim() : email.from;
    const fromEmail = fromMatch ? fromMatch[2].trim() : email.from;

    // 2. Save to interactions table
    console.log('💾 Saving email to database...');
    const interactionResponse = await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'email',
        datetime: email.date,
        participants: [fromEmail, ...email.to],
        summary: email.subject,
        sentiment: 'neutral',
        contactEmail: fromEmail,
      }),
    });

    if (!interactionResponse.ok) {
      throw new Error('Failed to save email to database');
    }
    console.log('✅ Email saved to interactions table');
    callbacks?.onSaveEmail?.();

    // 3. Analyze email with AI
    console.log('🤖 Analyzing email with AI...');
    const analysisResponse = await fetch('/api/ai/analyze-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: {
          subject: email.subject,
          body: email.body,
          from: {
            email: fromEmail,
            name: fromName,
          },
          to: email.to.join(', '),
          date: email.date,
        },
      }),
    });

    type AnalyzeEmailResponse = {
      success: boolean;
      analysis?: EmailAnalysisResult;
      error?: string;
    };

    const analysisData = await analysisResponse.json() as AnalyzeEmailResponse;

    if (!analysisResponse.ok || !analysisData.success || !analysisData.analysis) {
      throw new Error(analysisData.error || 'Failed to analyze email');
    }

    console.log('✅ Email analysis complete:');
    console.log('📊 Analysis Result:', JSON.stringify(analysisData.analysis, null, 2));
    console.log(`👥 Contacts found: ${analysisData.analysis.contacts.length}`);
    console.log(`📋 Tasks found: ${analysisData.analysis.tasks.length}`);

    if (analysisData.analysis.contacts.length > 0) {
      console.log('👤 Contacts:', analysisData.analysis.contacts);
    }
    if (analysisData.analysis.tasks.length > 0) {
      console.log('📋 Tasks:', analysisData.analysis.tasks);
    }

    callbacks?.onAnalyze?.(analysisData.analysis);

    const result: EmailUpdateResult = {
      success: true,
      message: 'Email analyzed successfully',
      analysis: analysisData.analysis,
    };

    callbacks?.onComplete?.(result);
    return result;

  } catch (error) {
    console.error('❌ Error during update:', error);
    const errorResult: EmailUpdateResult = {
      success: false,
      message: 'Failed to update email',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    
    callbacks?.onError?.(error instanceof Error ? error : new Error('Unknown error'));
    return errorResult;
  }
}

/**
 * Parse email sender information
 * Extracts name and email from formats like "John Doe <john@example.com>"
 */
export function parseEmailSender(from: string): { name: string; email: string } {
  const match = from.match(/(.*?)\s*<(.+?)>/);
  if (match) {
    return {
      name: match[1].trim(),
      email: match[2].trim(),
    };
  }
  return {
    name: from,
    email: from,
  };
}

/**
 * Format analysis result for display
 */
export function formatAnalysisMessage(result: EmailUpdateResult): string {
  if (!result.success) {
    return `❌ ${result.message}\n${result.error || ''}`;
  }

  if (!result.analysis) {
    return `ℹ️ ${result.message}`;
  }

  const contactCount = result.analysis.contacts.length;
  const taskCount = result.analysis.tasks.length;

  if (contactCount === 0 && taskCount === 0) {
    return `ℹ️ No contacts or tasks found in the email.`;
  }

  const parts = ['✅ Email analyzed successfully!'];
  
  if (contactCount > 0) {
    parts.push(`\n👥 ${contactCount} contact${contactCount > 1 ? 's' : ''} found`);
  }
  
  if (taskCount > 0) {
    parts.push(`\n📋 ${taskCount} task${taskCount > 1 ? 's' : ''} found`);
  }

  parts.push('\n\nCheck console for full details.');
  
  return parts.join('');
}
