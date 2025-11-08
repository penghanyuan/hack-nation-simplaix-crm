import { generateObject } from 'ai';
import { openai, createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';

/**
 * Email data structure for analysis
 */
export interface EmailData {
  subject: string;
  body: string;
  from: {
    email: string;
    name?: string;
  };
  to?: string;
  date?: string;
}

/**
 * Schema for email analysis result
 * Using a single object schema with conditional fields based on type
 */
const emailAnalysisSchema = z.object({
  type: z.enum(['contact', 'task']).describe('Whether this email is about a contact or a task/deal'),
  // Contact fields (used when type === 'contact')
  contactName: z.string().nullable().describe('Full name of the contact person (only for contact type)'),
  contactEmail: z.string().email().nullable().describe('Email address of the contact (only for contact type)'),
  companyName: z.string().nullable().describe('Company name if mentioned'),
  title: z.string().nullable().describe('Job title or position if mentioned (only for contact type)'),
  // Task/Deal fields (used when type === 'task')
  taskTitle: z.string().nullable().describe('Title or summary of the task/deal (only for task type)'),
  taskContactEmail: z.string().email().nullable().describe('Related contact email for the task (only for task type)'),
  stage: z.enum(['new', 'in_discussion', 'proposal', 'won', 'lost']).nullable().describe('Current stage of the deal (only for task type)'),
  amount: z.number().nullable().describe('Deal amount in dollars if mentioned (only for task type)'),
  nextAction: z.string().nullable().describe('Next action item or follow-up required (only for task type)'),
  nextActionDate: z.string().nullable().describe('Date for next action in ISO format (only for task type)'),
});

// Transform the flat schema result into the expected discriminated union format
export type EmailAnalysisResult = 
  | {
      type: 'contact';
      data: {
        name: string;
        email: string;
        companyName?: string;
        title?: string;
      };
    }
  | {
      type: 'task';
      data: {
        title: string;
        companyName?: string;
        contactEmail?: string;
        stage: 'new' | 'in_discussion' | 'proposal' | 'won' | 'lost';
        amount?: number;
        nextAction?: string;
        nextActionDate?: string;
      };
    };

export type ContactEntry = Extract<EmailAnalysisResult, { type: 'contact' }>;
export type TaskEntry = Extract<EmailAnalysisResult, { type: 'task' }>;

/**
 * Analyzes email content and determines if it's a contact or task entry
 * Returns structured data ready for database insertion
 * 
 * @param emailData - The email data to analyze
 * @param apiKey - OpenAI API key (optional, uses OPENAI_API_KEY env var by default)
 * @returns Structured object containing either contact or task data
 * 
 * @example
 * ```typescript
 * const email = {
 *   subject: "Meeting Request",
 *   body: "Hi, I'd like to schedule a demo...",
 *   from: { email: "john@example.com", name: "John Doe" }
 * };
 * 
 * const result = await analyzeEmail(email);
 * if (result.type === 'contact') {
 *   // Insert into contacts table
 *   await db.insert(contacts).values(result.data);
 * } else {
 *   // Insert into deals table
 *   await db.insert(deals).values(result.data);
 * }
 * ```
 */
export async function analyzeEmail(
  emailData: EmailData,
  options?: {
    apiKey?: string;
    model?: string;
  }
): Promise<EmailAnalysisResult> {
  const model = options?.model || 'gpt-4o';
  
  // Create the OpenAI client with optional API key
  const openaiClient = options?.apiKey 
    ? createOpenAI({ apiKey: options.apiKey })
    : openai;

  const systemPrompt = `You are an AI assistant that analyzes emails to extract structured information for a CRM system.

Your task is to:
1. Analyze the email content (subject, body, sender information)
2. Determine if this email is primarily about:
   - A CONTACT: New person introduction, networking, contact information exchange
   - A TASK/DEAL: Business opportunity, sales lead, project discussion, meeting request, action item

3. Set the "type" field to either "contact" or "task"

4. Extract relevant information based on the type:

For CONTACT type (set type="contact"):
- Fill contactName: person's full name
- Fill contactEmail: person's email address
- Fill companyName: company name if mentioned
- Fill title: job title or position if mentioned
- Set all task fields (taskTitle, taskContactEmail, stage, amount, nextAction, nextActionDate) to null

For TASK type (set type="task"):
- Fill taskTitle: title or summary of the task/deal
- Fill taskContactEmail: related contact email if mentioned
- Fill companyName: company name if mentioned
- Fill stage: one of 'new', 'in_discussion', 'proposal', 'won', 'lost' (default 'new')
- Fill amount: deal amount in dollars if mentioned
- Fill nextAction: next action item or follow-up required
- Fill nextActionDate: date for next action in ISO 8601 format
- Set all contact fields (contactName, contactEmail, title) to null

Guidelines:
- If the email is about introducing a new person or exchanging contact info → type="contact"
- If the email discusses business opportunities, meetings, proposals, or requires follow-up → type="task"
- Default to type="task" if uncertain, as tasks can reference contacts
- Extract dates in ISO 8601 format (e.g., "2024-01-15T14:00:00Z")
- For deal stages: use 'new' for initial outreach, 'in_discussion' for ongoing conversations
- Be conservative with amounts - only extract if clearly stated as a number
- Set unused fields to null based on the type`;

  const userPrompt = `Analyze this email and determine if it's a contact entry or a task/deal entry:

Subject: ${emailData.subject}
From: ${emailData.from.name || 'Unknown'} <${emailData.from.email}>
${emailData.to ? `To: ${emailData.to}` : ''}
${emailData.date ? `Date: ${emailData.date}` : ''}

Body:
${emailData.body}

Extract the appropriate information and return it as a structured object.`;

  try {
    const result = await generateObject({
      model: openaiClient(model),
      schema: emailAnalysisSchema,
      prompt: userPrompt,
      system: systemPrompt,
      temperature: 0.3, // Lower temperature for more consistent extraction
    });

    const rawResult = result.object;

    // Transform the flat schema result into the discriminated union format
    console.log('rawResult', rawResult)
    if (rawResult.type === 'contact') {
      return {
        type: 'contact',
        data: {
          name: rawResult.contactName || '',
          email: rawResult.contactEmail || '',
          companyName: rawResult.companyName || undefined,
          title: rawResult.title || undefined,
        },
      };
    } else {
      return {
        type: 'task',
        data: {
          title: rawResult.taskTitle || '',
          companyName: rawResult.companyName || undefined,
          contactEmail: rawResult.taskContactEmail || undefined,
          stage: rawResult.stage || 'new',
          amount: rawResult.amount || undefined,
          nextAction: rawResult.nextAction || undefined,
          nextActionDate: rawResult.nextActionDate || undefined,
        },
      };
    }
  } catch (error) {
    console.error('Error analyzing email:', error);
    throw new Error(`Failed to analyze email: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Batch analyze multiple emails
 * @param emails - Array of email data to analyze
 * @param options - Optional configuration
 * @returns Array of analysis results
 */
export async function analyzeEmails(
  emails: EmailData[],
  options?: {
    apiKey?: string;
    model?: string;
    concurrency?: number;
  }
): Promise<EmailAnalysisResult[]> {
  const concurrency = options?.concurrency || 5;
  const results: EmailAnalysisResult[] = [];
  
  // Process emails in batches to avoid rate limits
  for (let i = 0; i < emails.length; i += concurrency) {
    const batch = emails.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(email => analyzeEmail(email, options))
    );
    results.push(...batchResults);
  }
  
  return results;
}

