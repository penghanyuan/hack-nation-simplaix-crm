import { generateText, Output, stepCountIs } from 'ai';
import { openai, createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { contactLookupTool } from './tools/contact-lookup';
import type { EmailData, EmailAnalysisResult } from './email-analyzer';

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
 * Multi-step analysis schema - extracts both contacts and tasks
 */
const emailAnalysisSchema = z.object({
  contacts: z.array(contactInfoSchema).describe('Array of NEW contacts found in the email that do not already exist in the database'),
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

  const systemPrompt = `You are an intelligent CRM email analyzer that extracts contacts and tasks while avoiding duplicates.

IMPORTANT: Before extracting any contact, you MUST use the contactLookup tool to check if they already exist in the database.

WORKFLOW:
1. Read the email and identify all potential contacts (sender, recipients, people mentioned)
2. For EACH potential contact, call the contactLookup tool with their information:
   - Search by email (most reliable if available)
   - Also search by name, company, or title if email is not available
3. ONLY extract contacts that are NOT FOUND in the database (contactLookup returns found: false)
4. Extract all tasks from the email
5. Return the final structured output with new contacts and all tasks

CONTACT EXTRACTION RULES:
- Use contactLookup tool for EVERY potential contact before adding them to the results
- If contactLookup finds the contact (found: true), DO NOT include them in the output
- Only include contacts where contactLookup returns found: false
- For each NEW contact, extract:
  * name: Full name
  * email: Email address (use sender's email from From: field, or empty string "" if not found)
  * companyName: Company name if mentioned (nullable)
  * title: Job title or position if mentioned (nullable)
- Filter out contacts without valid email addresses (must contain @)

TASK EXTRACTION RULES:
- Extract ALL action items, meetings, follow-ups, or to-dos
- For each task, extract:
  * title: Brief summary
  * description: Detailed description (nullable)
  * companyName: Related company if mentioned (nullable)
  * contactEmails: Array of email addresses involved
  * status: 'todo' (default), 'in_progress', or 'done'
  * priority: 'low', 'medium' (default), 'high', or 'urgent'
  * dueDate: ISO 8601 format if mentioned (nullable)

IMPORTANT NOTES:
- Always check existing contacts using the contactLookup tool - this is critical to avoid duplicates
- Return empty arrays if no new contacts or no tasks are found
- Be thorough - check each contact individually with the tool
- The tool performs case-insensitive matching on all fields`;

  const userPrompt = `Analyze this email and extract NEW contacts (that don't exist in DB) and tasks:

Subject: ${emailData.subject}
From: ${emailData.from.name || 'Unknown'} <${emailData.from.email}>
${emailData.date ? `Date: ${emailData.date}` : ''}

Body:
${emailData.body}

STEPS:
1. Use contactLookup tool to check each potential contact
2. Only extract contacts NOT found in the database
3. Extract all tasks from the email

Return a structured output with:
- contacts: array of NEW contacts only (not found in database)
- tasks: array of all tasks found`;

  try {
    console.log('🔍 Starting email analysis with contact lookup...');
    
    const result = await generateText({
      model: openaiClient(model),
      prompt: userPrompt,
      system: systemPrompt,
      tools: {
        contactLookup: contactLookupTool,
      },
      stopWhen: stepCountIs(maxSteps), // Allow multiple tool calls to check each contact
      experimental_output: Output.object({
        schema: emailAnalysisSchema,
      }),
    });

    const rawResult = result.experimental_output;
    console.log('✅ Analysis complete:', {
      contactsFound: rawResult.contacts?.length || 0,
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
      }));

    const cleanedResult: EmailAnalysisResult = {
      contacts: validContacts,
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

