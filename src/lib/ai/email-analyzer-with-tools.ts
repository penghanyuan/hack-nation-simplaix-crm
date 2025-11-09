import { generateText, Output, stepCountIs } from 'ai';
import { openai, createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { contactListTool } from './tools/contact-list';
import { taskListTool } from './tools/task-list';
import type { EmailData, EmailAnalysisResult } from './email-analyzer';

/**
 * Schema for contact information
 */
const contactInfoSchema = z.object({
  name: z.string().describe('Full name of the contact person'),
  email: z.string().describe('Email address of the contact - use empty string if not found'),
  companyName: z.string().nullable().describe('Company name if mentioned'),
  title: z.string().nullable().describe('Job title or position if mentioned'),
  phone: z.string().nullable().describe('Phone number if mentioned'),
  linkedin: z.string().nullable().describe('LinkedIn URL if mentioned'),
  x: z.string().nullable().describe('Twitter/X handle if mentioned'),
});

/**
 * Schema for contact update information
 */
const contactUpdateSchema = z.object({
  existingContactId: z.string().describe('ID of the existing contact from contactLookup tool'),
  name: z.string().describe('Full name of the contact person'),
  email: z.string().describe('Email address of the contact'),
  companyName: z.string().nullable().describe('Updated company name if changed'),
  title: z.string().nullable().describe('Updated job title if changed'),
  phone: z.string().nullable().describe('Updated phone number if changed'),
  linkedin: z.string().nullable().describe('Updated LinkedIn URL if changed'),
  x: z.string().nullable().describe('Updated Twitter/X handle if changed'),
  changes: z.array(z.object({
    field: z.string(),
    oldValue: z.string().nullable(),
    newValue: z.string().nullable(),
  })).describe('List of fields that changed'),
});

/**
 * Schema for task information
 */
const taskInfoSchema = z.object({
  title: z.string().describe('Title or summary of the task'),
  description: z.string().nullable().describe('Detailed description of what needs to be done'),
  companyName: z.string().nullable().describe('Company name if mentioned'),
  contactEmails: z.array(z.string().email()).describe('Array of contact emails related to this task'),
  status: z.enum(['todo', 'in_progress', 'done']).describe('Current status of the task (default: todo)'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).describe('Priority level of the task (default: medium)'),
  dueDate: z.string().nullable().describe('Due date for the task in ISO 8601 format'),
});

/**
 * Schema for deal information
 */
const dealInfoSchema = z.object({
  title: z.string().describe('Title or name of the deal (e.g., "Q4 Enterprise License - Acme Corp")'),
  companyName: z.string().nullable().describe('Company name involved in the deal'),
  contactEmail: z.string().nullable().describe('Primary contact email for this deal'),
  stage: z.enum(['new', 'in_discussion', 'proposal', 'won', 'lost']).describe('Current stage of the deal (default: new)'),
  amount: z.number().nullable().describe('Deal value/amount in dollars if mentioned'),
  nextAction: z.string().nullable().describe('Next action or step for this deal'),
  nextActionDate: z.string().nullable().describe('Date for next action in ISO 8601 format'),
});

/**
 * Multi-step analysis schema - extracts contacts, contact updates, tasks, and deals
 */
const emailAnalysisSchema = z.object({
  contacts: z.array(contactInfoSchema).describe('Array of NEW contacts found in the email that do not already exist in the database'),
  contactUpdates: z.array(contactUpdateSchema).describe('Array of EXISTING contacts with updated information (use data from contactLookup tool)').optional(),
  tasks: z.array(taskInfoSchema).describe('Array of tasks found in the email (can be empty if none found)').optional(),
  deals: z.array(dealInfoSchema).describe('Array of deals found in the email - ONLY extract from SENT emails (can be empty if none found)').optional(),
});

/**
 * Enhanced email analyzer that uses AI tools to check for existing contacts
 * This prevents duplicate contact creation by querying the database before extraction
 * 
 * @param emailData - The email data to analyze
 * @param options - Optional configuration
 * @returns Object containing arrays of new contacts and tasks
 * 
 * @example
 * ```typescript
 * const email = {
 *   subject: "Meeting Request with John",
 *   body: "Hi, I'm John Doe from Acme Corp. Let's schedule a product demo next week...",
 *   from: { email: "john@example.com", name: "John Doe" }
 * };
 * 
 * const result = await analyzeEmailWithTools(email);
 * // result.contacts will only contain contacts that don't exist in the database
 * // result.tasks will contain all extracted tasks
 * ```
 */
export async function analyzeEmailWithTools(
  emailData: EmailData,
  options?: {
    apiKey?: string;
    model?: string;
    maxSteps?: number;
  }
): Promise<EmailAnalysisResult> {
  const model = options?.model || 'gpt-5';
  const maxSteps = options?.maxSteps || 20;
  
  // Create the OpenAI client with optional API key
  const openaiClient = options?.apiKey 
    ? createOpenAI({ apiKey: options.apiKey })
    : openai;

  const systemPrompt = `You are an intelligent CRM email analyzer that extracts contacts, detects updates, finds tasks, and identifies deals while avoiding duplicates.
Don't generate tasks or contacts that are not related to client management.
IMPORTANT: You MUST retrieve the full contact and task lists first, then compare extracted items to avoid duplicates.

EMAIL TYPE DETECTION:
- Check the email metadata to determine if this is from INBOX or SENT folder
- INBOX emails: Extract contacts and tasks as usual
- SENT emails: Extract contacts, tasks, AND deals (opportunities you're pursuing with clients)

WORKFLOW:
1. FIRST: Call contactList tool to get ALL existing contacts from the database
2. SECOND: Call taskList tool to get ALL existing tasks from the database
3. Read the email and identify all potential contacts (sender, recipients, people mentioned)
4. For EACH potential contact, compare against the contact list retrieved in step 1:
   - Check for matches by email (most reliable), name, or combination of name + company
   - Use case-insensitive comparison and consider variations
   - If NO match found → Add to "contacts" array (new contact)
   - If match found with DIFFERENT information → Add to "contactUpdates" array with changes
   - If exact match found → Skip (no action needed)
5. Identify all potential tasks (action items, meetings, follow-ups, to-dos)
6. For EACH potential task, compare against the task list retrieved in step 2:
   - Check for matches by title similarity, or title + company + contact emails
   - Use case-insensitive comparison and consider semantic similarity
   - If NO match found → Add to "tasks" array (new task)
   - If match found → Skip (task already exists, avoid duplicates)
7. IF this is a SENT email: Identify potential deals (sales opportunities, proposals, negotiations)
8. Return the final structured output

CONTACT EXTRACTION RULES (NEW CONTACTS):
- Compare each potential contact against the full contact list from contactList tool
- Only include in "contacts" array if NO matching contact exists in database
- Extract ALL available fields:
  * name: Full name
  * email: Email address (must contain @)
  * companyName: Company name if mentioned (nullable)
  * title: Job title or position if mentioned (nullable)
  * phone: Phone number if mentioned (nullable)
  * linkedin: LinkedIn URL if mentioned (nullable)
  * x: Twitter/X handle if mentioned (nullable)

CONTACT UPDATE RULES (EXISTING CONTACTS WITH CHANGES):
- Compare each potential contact against the full contact list from contactList tool
- Include in "contactUpdates" array if a matching contact exists but has different information
- Matching logic: same email OR (same name AND same company)
- Extract ALL fields and note what changed:
  * existingContactId: Use the "id" from the matching contact in the list
  * name, email, companyName, title, phone, linkedin, x: Include all fields
  * changes: Array of objects showing field, oldValue, newValue for each changed field
- This helps track what information has been updated

TASK EXTRACTION RULES (AVOIDING DUPLICATES):
- Compare each potential task against the full task list from taskList tool
- Only include in "tasks" array if NO matching task exists in database
- Matching logic: same or very similar title, OR (same title + same company) OR (same title + same contact emails)
- Consider semantic similarity: "Schedule demo" vs "Book product demonstration" could be duplicates
- For each NEW task, extract:
  * title: Brief summary of the task (REQUIRED)
  * description: Detailed description (nullable)
  * companyName: Related company if mentioned (nullable)
  * contactEmails: Array of email addresses involved (nullable)
  * status: 'todo' (default), 'in_progress', or 'done'
  * priority: 'low', 'medium' (default), 'high', or 'urgent'
  * dueDate: ISO 8601 format if mentioned (nullable)

DEAL EXTRACTION RULES (FOR SENT EMAILS ONLY):
- ONLY extract deals from emails in the SENT folder (emails you sent to clients/prospects)
- Deals represent sales opportunities, business proposals, negotiations, or potential revenue
- Look for indicators like:
  * Proposals being sent
  * Pricing discussions
  * Contract negotiations
  * Product/service offerings
  * Demo or trial arrangements
  * Partnership discussions
  * Quote requests or responses
- For each deal, extract:
  * title: Name of the deal - be descriptive (e.g., "Q4 Enterprise License - Acme Corp")
  * companyName: Company involved (nullable)
  * contactEmail: Primary contact email (nullable)
  * stage: 'new' (default for first contact), 'in_discussion', 'proposal', 'won', or 'lost'
  * amount: Dollar value if mentioned (nullable)
  * nextAction: What needs to happen next (nullable)
  * nextActionDate: When the next action should occur (nullable, ISO 8601)
- Do NOT extract deals from inbox emails (incoming emails)
- Do NOT extract deals if the email is just a regular conversation without business opportunity context

IMPORTANT NOTES:
- ALWAYS call contactList and taskList tools FIRST before doing any extraction
- YOU are responsible for comparing and detecting duplicates, not the tools
- Be thorough and intelligent about duplicate detection - consider variations and synonyms
- Return empty arrays if no new contacts, no updates, no new tasks, or no deals found
- Consider semantic similarity, not just exact string matches
- Be conservative: when in doubt, treat as a duplicate rather than creating duplicates
- Deals are ONLY extracted from SENT emails, not INBOX emails`;

  const userPrompt = `Analyze this email and extract NEW contacts (that don't exist in DB), NEW tasks (that don't exist in DB), and deals (if SENT email):

Subject: ${emailData.subject}
From: ${emailData.from.name || 'Unknown'} <${emailData.from.email}>
${emailData.date ? `Date: ${emailData.date}` : ''}
Email Folder: ${(emailData as any).folder || 'inbox'}

Body:
${emailData.body}

STEPS:
1. FIRST: Call contactList tool to get all existing contacts
2. SECOND: Call taskList tool to get all existing tasks
3. Extract all potential contacts from the email
4. Compare each extracted contact against the contact list - only include if no duplicate exists
5. Extract all potential tasks from the email
6. Compare each extracted task against the task list - only include if no duplicate exists
7. IF this is a SENT email: Extract potential deals (business opportunities, proposals, negotiations)

Return a structured output with:
- contacts: array of NEW contacts only (not duplicates of existing contacts in database)
- contactUpdates: array of existing contacts with updated information (optional)
- tasks: array of NEW tasks only (not duplicates of existing tasks in database)
- deals: array of deals ONLY if this is a SENT email (empty array otherwise)`;

  try {
    console.log('🔍 Starting email analysis with full list retrieval...');
    
    const result = await generateText({
      model: openaiClient(model),
      prompt: userPrompt,
      system: systemPrompt,
      tools: {
        contactList: contactListTool,
        taskList: taskListTool,
      },
      stopWhen: stepCountIs(maxSteps), // Allow tool calls to retrieve lists
      experimental_output: Output.object({
        schema: emailAnalysisSchema,
      }),
    });

    const rawResult = result.experimental_output;
    console.log('✅ Analysis complete:', {
      contactsFound: rawResult.contacts?.length || 0,
      contactUpdatesFound: rawResult.contactUpdates?.length || 0,
      tasksFound: rawResult.tasks?.length || 0,
      dealsFound: rawResult.deals?.length || 0,
      stepsUsed: result.steps.length,
    });

    // Log tool calls for debugging
    const toolCalls = result.steps.flatMap(step => step.toolCalls);
    console.log(`🔧 Tool calls made: ${toolCalls.length}`);

    // Clean up the result - remove null values and filter valid emails
    const validContacts = (rawResult.contacts || [])
      .filter(contact => {
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
        phone: contact.phone || undefined,
        linkedin: contact.linkedin || undefined,
        x: contact.x || undefined,
      }));

    // Process contact updates
    const validContactUpdates = (rawResult.contactUpdates || [])
      .map(update => ({
        existingContactId: update.existingContactId,
        name: update.name,
        email: update.email,
        companyName: update.companyName || undefined,
        title: update.title || undefined,
        phone: update.phone || undefined,
        linkedin: update.linkedin || undefined,
        x: update.x || undefined,
        changes: update.changes,
      }));

    const cleanedResult: EmailAnalysisResult = {
      contacts: validContacts,
      contactUpdates: validContactUpdates.length > 0 ? validContactUpdates : undefined,
      tasks: rawResult.tasks?.map(task => ({
        title: task.title,
        description: task.description || undefined,
        companyName: task.companyName || undefined,
        contactEmails: task.contactEmails.filter(email => email && email.includes('@')),
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate || undefined,
      })) || [],
      deals: rawResult.deals?.map(deal => ({
        title: deal.title,
        companyName: deal.companyName || undefined,
        contactEmail: deal.contactEmail || undefined,
        stage: deal.stage,
        amount: deal.amount || undefined,
        nextAction: deal.nextAction || undefined,
        nextActionDate: deal.nextActionDate || undefined,
      })) || [],
    };

    console.log('🧹 Final result:', {
      newContacts: cleanedResult.contacts.length,
      contactUpdates: cleanedResult.contactUpdates?.length || 0,
      tasks: cleanedResult.tasks.length,
      deals: cleanedResult.deals.length,
    });

    return cleanedResult;
  } catch (error) {
    console.error('⚠️ Error analyzing email with tools:', error);
    return {
      contacts: [],
      tasks: [],
    };
  }
}

