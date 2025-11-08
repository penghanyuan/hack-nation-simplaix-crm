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
 * Schema for contact information
 */
const contactInfoSchema = z.object({
  name: z.string().describe('Full name of the contact person'),
  email: z.string().describe('Email address of the contact - use empty string if not found'),
  companyName: z.string().nullable().describe('Company name if mentioned'),
  title: z.string().nullable().describe('Job title or position if mentioned'),
});

/**
 * Schema for task/deal information
 */
const taskInfoSchema = z.object({
  title: z.string().describe('Title or summary of the task/deal'),
  companyName: z.string().nullable().describe('Company name if mentioned'),
  contactEmails: z.array(z.string().email()).describe('Array of contact emails related to this task/deal'),
  stage: z.enum(['new', 'in_discussion', 'proposal', 'won', 'lost']).describe('Current stage of the deal'),
  amount: z.number().nullable().describe('Deal amount in dollars if mentioned'),
  nextAction: z.string().nullable().describe('Next action item or follow-up required'),
  nextActionDate: z.string().nullable().describe('Date for next action in ISO 8601 format'),
});

/**
 * Multi-step analysis schema - extracts both contacts and tasks
 */
const emailAnalysisSchema = z.object({
  contacts: z.array(contactInfoSchema).describe('Array of contacts found in the email (can be empty if none found)').optional(),
  tasks: z.array(taskInfoSchema).describe('Array of tasks/deals found in the email (can be empty if none found)').optional(),
});

/**
 * Result type for email analysis
 */
export interface EmailAnalysisResult {
  contacts: Array<{
    name: string;
    email: string;
    companyName?: string;
    title?: string;
  }>;
  tasks: Array<{
    title: string;
    companyName?: string;
    contactEmails: string[];
    stage: 'new' | 'in_discussion' | 'proposal' | 'won' | 'lost';
    amount?: number;
    nextAction?: string;
    nextActionDate?: string;
  }>;
}

export type ContactEntry = EmailAnalysisResult['contacts'][0];
export type TaskEntry = EmailAnalysisResult['tasks'][0];

/**
 * Multi-step agent that analyzes email content and extracts both contacts and tasks
 * Returns all extracted information without throwing errors
 * 
 * @param emailData - The email data to analyze
 * @param apiKey - OpenAI API key (optional, uses OPENAI_API_KEY env var by default)
 * @returns Object containing arrays of contacts and tasks found in the email
 * 
 * @example
 * ```typescript
 * const email = {
 *   subject: "Meeting Request with John",
 *   body: "Hi, I'm John Doe from Acme Corp. Let's schedule a $50k deal discussion...",
 *   from: { email: "john@example.com", name: "John Doe" }
 * };
 * 
 * const result = await analyzeEmail(email);
 * // result.contacts = [{ name: "John Doe", email: "john@example.com", ... }]
 * // result.tasks = [{ title: "Schedule deal discussion", amount: 50000, ... }]
 * 
 * // Insert all contacts
 * for (const contact of result.contacts) {
 *   await db.insert(contacts).values(contact);
 * }
 * 
 * // Insert all tasks
 * for (const task of result.tasks) {
 *   await db.insert(deals).values(task);
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

  const systemPrompt = `You are a multi-step AI agent that extracts structured information from emails for a CRM system.

Your task is performed in TWO STEPS:

STEP 1: Extract ALL contact information
- Look for people mentioned in the email (sender, recipients, people mentioned in the body)
- For each person, extract:
  * name: Full name of the person
  * email: Email address (use the sender's email from "From:" field, or recipient's email if available)
           If the person is mentioned in the body but no email is found, use empty string ""
  * companyName: Company name if mentioned
  * title: Job title or position if mentioned
- Return an array of contacts (can be empty [] if no contacts found)
- Always try to extract at least the sender's information with their actual email address from the From: field
- For people mentioned in email signatures, extract their contact info including email if provided

STEP 2: Extract ALL task/deal information
- Look for any business opportunities, action items, meetings, proposals, or follow-ups
- For each task/deal, extract:
  * title: Summary of the task/deal
  * companyName: Related company name
  * contactEmails: Array of email addresses of people involved in this task
  * stage: 'new' (default), 'in_discussion', 'proposal', 'won', or 'lost'
  * amount: Dollar amount if mentioned as a number
  * nextAction: What needs to be done next
  * nextActionDate: When it needs to be done (ISO 8601 format)
- Return an array of tasks (can be empty [] if no tasks found)

Important Guidelines:
- Extract BOTH contacts AND tasks from the same email if both exist
- If no contacts found, return empty array for contacts (not null)
- If no tasks found, return empty array for tasks (not null)
- Extract dates in ISO 8601 format (e.g., "2024-01-15T14:00:00Z")
- For amounts, only extract if clearly stated as a number (e.g., "$50,000" → 50000)
- Default stage for tasks is 'new' unless context suggests otherwise
- If only partial information is available, still extract what you can
- Do not throw errors or fail - always return a valid response with empty arrays if needed

Examples:
- Simple greeting email → { contacts: [sender info], tasks: [] }
- Meeting request → { contacts: [sender info], tasks: [meeting task] }
- Multi-person deal email → { contacts: [person1, person2, ...], tasks: [deal info] }
- Email with signature → extract contact info from signature (name, title, company, email if provided)
- Spam/irrelevant → { contacts: [], tasks: [] }

Important: When extracting contacts, prioritize real email addresses:
- Sender's email from the "From:" header is always reliable
- Email addresses in signatures may be formatted as text (e.g., "john@example.com" or "📧 john@example.com")
- If a person is only mentioned by name without email, use empty string "" for their email field`;

  const userPrompt = `Extract all contacts and tasks from this email:

Subject: ${emailData.subject}
From: ${emailData.from.name || 'Unknown'} <${emailData.from.email}>
${emailData.date ? `Date: ${emailData.date}` : ''}

Body:
${emailData.body}

Return a JSON object with two arrays:
- contacts: array of all contacts found
- tasks: array of all tasks/deals found

If nothing is found in a category, return an empty array for that category.`;

  try {
    const result = await generateObject({
      model: openaiClient(model),
      schema: emailAnalysisSchema,
      prompt: userPrompt,
      system: systemPrompt,
    });

    const rawResult = result.object;
    console.log('✅ Analysis complete:', {
      contactsFound: rawResult.contacts?.length || 0,
      tasksFound: rawResult.tasks?.length || 0,
    });

    // Clean up the result - remove null values and convert to undefined
    // Filter out contacts without valid email addresses (required for DB)
    const validContacts = (rawResult.contacts || [])
      .filter(contact => {
        // Check if email is valid (not empty and contains @)
        const isValidEmail = contact.email && contact.email.includes('@');
        if (!isValidEmail) {
          console.log(`⚠️ Skipping contact "${contact.name}" - no valid email found`);
        }
        return isValidEmail;
      })
      .map(contact => ({
        name: contact.name,
        email: contact.email,
        companyName: contact.companyName || undefined,
        title: contact.title || undefined,
      }));

    const cleanedResult: EmailAnalysisResult = {
      contacts: validContacts,
      tasks: rawResult.tasks?.map(task => ({
        title: task.title,
        companyName: task.companyName || undefined,
        contactEmails: task.contactEmails.filter(email => email && email.includes('@')), // Filter valid emails only
        stage: task.stage,
        amount: task.amount || undefined,
        nextAction: task.nextAction || undefined,
        nextActionDate: task.nextActionDate || undefined,
      })) || [],
    };

    console.log('🧹 Cleaned result:', cleanedResult);
    console.log('📊 Final result:', {
      validContacts: cleanedResult.contacts.length,
      tasks: cleanedResult.tasks.length,
    });

    return cleanedResult;
  } catch (error) {
    // Don't throw errors - return empty result instead
    console.error('⚠️ Error analyzing email, returning empty result:', error);
    return {
      contacts: [],
      tasks: [],
    };
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

