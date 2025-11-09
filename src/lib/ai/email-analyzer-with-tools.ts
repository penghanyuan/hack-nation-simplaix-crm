import { generateText, Output, stepCountIs } from 'ai';
import { openai, createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { contactLookupTool } from './tools/contact-lookup';
import { taskLookupTool } from './tools/task-lookup';
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
 * Multi-step analysis schema - extracts contacts, contact updates, and tasks
 */
const emailAnalysisSchema = z.object({
  contacts: z.array(contactInfoSchema).describe('Array of NEW contacts found in the email that do not already exist in the database'),
  contactUpdates: z.array(contactUpdateSchema).describe('Array of EXISTING contacts with updated information (use data from contactLookup tool)').optional(),
  tasks: z.array(taskInfoSchema).describe('Array of tasks found in the email (can be empty if none found)').optional(),
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
  const model = options?.model || 'gpt-5-mini-2025-08-07';
  const maxSteps = options?.maxSteps || 20;
  
  // Create the OpenAI client with optional API key
  const openaiClient = options?.apiKey 
    ? createOpenAI({ apiKey: options.apiKey })
    : openai;

  const systemPrompt = `You are an intelligent CRM email analyzer that extracts contacts, detects updates, and finds tasks while avoiding duplicates.
Don't generate tasks or contacts that are not related to client management.
IMPORTANT: Before extracting any contact or task, you MUST use the lookup tools to check if they already exist in the database.

WORKFLOW:
1. Read the email and identify all potential contacts (sender, recipients, people mentioned)
2. For EACH potential contact, call the contactLookup tool with ALL available information:
   - Always include: email, name, companyName, title
   - Also include if found: phone, linkedin, x (Twitter/X)
3. Based on contactLookup response:
   - If found: false → Add to "contacts" array (new contact)
   - If found: true AND hasChanges: true → Add to "contactUpdates" array with the changes
   - If found: true AND hasChanges: false → Skip (no changes needed)
4. Identify all potential tasks (action items, meetings, follow-ups, to-dos)
5. For EACH potential task, call the taskLookup tool with task information:
   - Always include: title (required)
   - Also include if available: description, companyName, contactEmails
6. Based on taskLookup response:
   - If found: false → Add to "tasks" array (new task)
   - If found: true → Skip (task already exists, no duplicates)
7. Return the final structured output

CONTACT EXTRACTION RULES (NEW CONTACTS):
- Use contactLookup tool for EVERY potential contact
- Only include in "contacts" array if contactLookup returns found: false
- Extract ALL available fields:
  * name: Full name
  * email: Email address (must contain @)
  * companyName: Company name if mentioned (nullable)
  * title: Job title or position if mentioned (nullable)
  * phone: Phone number if mentioned (nullable)
  * linkedin: LinkedIn URL if mentioned (nullable)
  * x: Twitter/X handle if mentioned (nullable)

CONTACT UPDATE RULES (EXISTING CONTACTS WITH CHANGES):
- Include in "contactUpdates" array if contactLookup returns found: true AND hasChanges: true
- Extract ALL fields that changed (from contactLookup response):
  * existingContactId: Use the "id" from contactLookup result
  * name, email, companyName, title, phone, linkedin, x: Include all fields
  * changes: Copy the "changes" array from contactLookup result
- This helps track what information has been updated

TASK EXTRACTION RULES (AVOIDING DUPLICATES):
- Use taskLookup tool for EVERY potential task
- Only include in "tasks" array if taskLookup returns found: false
- For each NEW task, extract:
  * title: Brief summary of the task (REQUIRED)
  * description: Detailed description (nullable)
  * companyName: Related company if mentioned (nullable)
  * contactEmails: Array of email addresses involved (nullable)
  * status: 'todo' (default), 'in_progress', or 'done'
  * priority: 'low', 'medium' (default), 'high', or 'urgent'
  * dueDate: ISO 8601 format if mentioned (nullable)
- Tasks are considered duplicates if they have the same title, description, company, and contact emails
- DO NOT include tasks where taskLookup returns found: true

IMPORTANT NOTES:
- ALWAYS call contactLookup for each contact with ALL available information
- ALWAYS call taskLookup for each task with ALL available information (title, description, company, emails)
- The tools detect duplicates automatically - only include items where found: false
- Return empty arrays if no new contacts, no updates, or no new tasks found
- Consider synonyms and variations of all the fields (name, companyName, title, phone, linkedin, x, task description,task title, etc.).
- Be thorough - check each contact and task individually with their respective lookup tools`;

  const userPrompt = `Analyze this email and extract NEW contacts (that don't exist in DB) and NEW tasks (that don't exist in DB):

Subject: ${emailData.subject}
From: ${emailData.from.name || 'Unknown'} <${emailData.from.email}>
${emailData.date ? `Date: ${emailData.date}` : ''}

Body:
${emailData.body}

STEPS:
1. Use contactLookup tool to check each potential contact
2. Only extract contacts NOT found in the database (or with changes)
3. Use taskLookup tool to check each potential task
4. Only extract tasks NOT found in the database

Return a structured output with:
- contacts: array of NEW contacts only (not found in database)
- contactUpdates: array of existing contacts with changes (optional)
- tasks: array of NEW tasks only (not found in database)`;

  try {
    console.log('🔍 Starting email analysis with contact lookup...');
    
    const result = await generateText({
      model: openaiClient(model),
      prompt: userPrompt,
      system: systemPrompt,
      tools: {
        contactLookup: contactLookupTool,
        taskLookup: taskLookupTool,
      },
      stopWhen: stepCountIs(maxSteps), // Allow multiple tool calls to check each contact and task
      experimental_output: Output.object({
        schema: emailAnalysisSchema,
      }),
    });

    const rawResult = result.experimental_output;
    console.log('✅ Analysis complete:', {
      contactsFound: rawResult.contacts?.length || 0,
      contactUpdatesFound: rawResult.contactUpdates?.length || 0,
      tasksFound: rawResult.tasks?.length || 0,
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
    };

    console.log('🧹 Final result:', {
      newContacts: cleanedResult.contacts.length,
      contactUpdates: cleanedResult.contactUpdates?.length || 0,
      tasks: cleanedResult.tasks.length,
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

