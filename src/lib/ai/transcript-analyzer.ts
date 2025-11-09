import { generateText, Output, stepCountIs } from 'ai';
import { openai, createOpenAI } from '@ai-sdk/openai';

import { z } from 'zod';
import { contactLookupTool } from './tools/contact-lookup';
import { taskLookupTool } from './tools/task-lookup';

/**
 * Transcript data structure
 */
export interface TranscriptData {
  content: string;
  filename?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Result of transcript analysis
 */
export interface TranscriptAnalysisResult {
  contacts: Array<{
    name: string;
    email: string;
    companyName?: string;
    title?: string;
    phone?: string;
    linkedin?: string;
    x?: string;
  }>;
  contactUpdates?: Array<{
    existingContactId: string;
    name: string;
    email: string;
    companyName?: string;
    title?: string;
    phone?: string;
    linkedin?: string;
    x?: string;
    changes: Array<{
      field: string;
      oldValue: string | null | undefined;
      newValue: string | null | undefined;
    }>;
  }>;
  tasks: Array<{
    title: string;
    description?: string;
    companyName?: string;
    contactEmails: string[];
    status: 'todo' | 'in_progress' | 'done';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    dueDate?: string;
  }>;
  meetingSummary?: string;
  keyPoints?: string[];
}

/**
 * Schema for contact information
 */
const contactInfoSchema = z.object({
  name: z.string().describe('Full name of the contact person'),
  email: z.string().describe('Email address of the contact'),
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
 * Multi-step analysis schema for transcripts
 */
const transcriptAnalysisSchema = z.object({
  contacts: z.array(contactInfoSchema).describe('Array of NEW contacts found in the transcript that do not already exist in the database'),
  contactUpdates: z.array(contactUpdateSchema).describe('Array of EXISTING contacts with updated information (use data from contactLookup tool)').optional(),
  tasks: z.array(taskInfoSchema).describe('Array of NEW tasks/action items found in the transcript').optional(),
  meetingSummary: z.string().describe('Brief summary of the meeting/conversation').optional(),
  keyPoints: z.array(z.string()).describe('Key points or decisions from the meeting').optional(),
});

/**
 * Analyze a meeting transcript to extract contacts, tasks, and meeting insights
 * Uses AI tools to check for existing contacts and tasks to prevent duplicates
 * 
 * @param transcriptData - The transcript data to analyze
 * @param options - Optional configuration
 * @returns Object containing contacts, tasks, and meeting insights
 */
export async function analyzeTranscriptWithTools(
  transcriptData: TranscriptData,
  options?: {
    apiKey?: string;
    model?: string;
    maxSteps?: number;
  }
): Promise<TranscriptAnalysisResult> {
  const model = options?.model || 'gpt-5';
  const maxSteps = options?.maxSteps || 50; // Generous steps for complex transcript analysis with tools

  const openaiClient = options?.apiKey
    ? createOpenAI({ apiKey: options.apiKey })
    : openai;

  const systemPrompt = `You are an intelligent CRM meeting transcript analyzer that extracts contacts, detects updates, finds action items, and summarizes meetings while avoiding duplicates.

Don't generate tasks or contacts that are not related to client management.
IMPORTANT: Before extracting any contact or task, you MUST use the lookup tools to check if they already exist in the database.

WORKFLOW:
1. Read the transcript and identify all participants and mentioned people
2. For EACH potential contact, call the contactLookup tool with ALL available information:
   - Always include: email (if available), name, companyName, title
   - Also include if found: phone, linkedin, x (Twitter/X)
3. Based on contactLookup response:
   - If found: false → Add to "contacts" array (new contact)
   - If found: true AND hasChanges: true → Add to "contactUpdates" array with the changes
   - If found: true AND hasChanges: false → Skip (no changes needed)
4. Identify all action items, follow-ups, and tasks mentioned in the meeting
5. For EACH potential task, call the taskLookup tool with task information:
   - Always include: title (required)
   - Also include if available: description, companyName, contactEmails
6. Based on taskLookup response:
   - If found: false → Add to "tasks" array (new task)
   - If found: true → Skip (task already exists, no duplicates)
7. Generate a meeting summary and extract key points/decisions
8. Return the final structured output

CONTACT EXTRACTION RULES (NEW CONTACTS):
- Use contactLookup tool for EVERY potential contact mentioned
- Only include in "contacts" array if contactLookup returns found: false
- Extract ALL available fields from the transcript:
  * name: Full name of the person
  * email: Email address if mentioned (if not available, try to infer or skip)
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

TASK EXTRACTION RULES (ACTION ITEMS):
- Use taskLookup tool for EVERY potential task/action item
- Only include in "tasks" array if taskLookup returns found: false
- Look for:
  * Action items assigned to specific people
  * Follow-up tasks mentioned
  * Deliverables with deadlines
  * Next steps agreed upon
- For each NEW task, extract:
  * title: Brief summary of the action item (REQUIRED)
  * description: Detailed description from the conversation (nullable)
  * companyName: Related company if mentioned (nullable)
  * contactEmails: Emails of people responsible or involved (nullable)
  * status: Usually 'todo' for new tasks from meetings
  * priority: Infer from urgency mentioned in the transcript
  * dueDate: Extract if specific deadline mentioned (ISO 8601 format)
- DO NOT include tasks where taskLookup returns found: true

MEETING INSIGHTS:
- meetingSummary: Create a concise 2-3 sentence summary of the meeting
- keyPoints: Extract 3-7 key decisions, insights, or important discussion points

IMPORTANT NOTES:
- ALWAYS call contactLookup for each contact with ALL available information
- ALWAYS call taskLookup for each task with ALL available information
- Consider synonyms and variations of all the fields
- If email is not explicitly mentioned for a contact, try to infer from context or skip that contact
- Be thorough - check each contact and task individually with their respective lookup tools
- Focus on business-relevant information and actionable items`;

  const userPrompt = `Analyze this meeting transcript and extract NEW contacts, NEW tasks, and meeting insights:

${transcriptData.filename ? `Filename: ${transcriptData.filename}\n` : ''}
Transcript:
${transcriptData.content}

STEPS:
1. Use contactLookup tool to check each participant/mentioned person
2. Only extract contacts NOT found in the database (or with changes)
3. Use taskLookup tool to check each action item/task
4. Only extract tasks NOT found in the database
5. Summarize the meeting and extract key points

Return a structured output with:
- contacts: array of NEW contacts only (not found in database)
- contactUpdates: array of existing contacts with changes (optional)
- tasks: array of NEW action items/tasks (not found in database)
- meetingSummary: brief summary of the meeting
- keyPoints: key decisions or discussion points`;

  try {
    console.log('🔍 Starting transcript analysis...');

    const result = await generateText({
      model: openaiClient(model),
      prompt: userPrompt,
      system: systemPrompt,
      tools: {
        contactLookup: contactLookupTool,
        taskLookup: taskLookupTool,
      },
      stopWhen: stepCountIs(maxSteps),
      experimental_output: Output.object({
        schema: transcriptAnalysisSchema,
      }),
    });

    const rawResult = result.experimental_output;
    console.log('✅ Transcript analysis complete:', {
      contactsFound: rawResult.contacts?.length || 0,
      contactUpdatesFound: rawResult.contactUpdates?.length || 0,
      tasksFound: rawResult.tasks?.length || 0,
      keyPointsFound: rawResult.keyPoints?.length || 0,
      stepsUsed: result.steps.length,
    });

    // Log tool calls for debugging
    const toolCalls = result.steps.flatMap(step => step.toolCalls);
    console.log(`🔧 Tool calls made: ${toolCalls.length}`);

    // Clean up contacts - filter valid emails
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

    const cleanedResult: TranscriptAnalysisResult = {
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
      meetingSummary: rawResult.meetingSummary || undefined,
      keyPoints: rawResult.keyPoints || undefined,
    };

    console.log('🧹 Final transcript result:', {
      newContacts: cleanedResult.contacts.length,
      contactUpdates: cleanedResult.contactUpdates?.length || 0,
      tasks: cleanedResult.tasks.length,
      hasSummary: !!cleanedResult.meetingSummary,
      keyPointsCount: cleanedResult.keyPoints?.length || 0,
    });

    return cleanedResult;
  } catch (error) {
    console.error('⚠️ Error analyzing transcript with tools:', error);
    return {
      contacts: [],
      tasks: [],
    };
  }
}

