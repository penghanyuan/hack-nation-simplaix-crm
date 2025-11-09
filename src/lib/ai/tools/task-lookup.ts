import { tool } from 'ai';
import { z } from 'zod';
import { db } from '@/db';
import { tasks } from '@/db/schema';
import { sql } from 'drizzle-orm';

/**
 * Task lookup result type
 */
export interface TaskLookupResult {
  found: boolean;
  task?: {
    id: string;
    title: string;
    description?: string;
    companyName?: string;
    contactEmails: string[];
    tags: string[];
    status: string;
    priority: string;
  };
  message: string;
}

/**
 * Search for a task in the database using case-insensitive comparison
 * Searches by title, description, company name, and contact emails
 * 
 * @param params - Search parameters (all text fields converted to lowercase for comparison)
 * @returns Task lookup result
 */
export async function searchTask(params: {
  title?: string;
  description?: string;
  companyName?: string;
  contactEmails?: string[];
}): Promise<TaskLookupResult> {
  const { title, description, companyName, contactEmails } = params;

  // At minimum, we need a title to search for a task
  if (!title) {
    return {
      found: false,
      message: 'Title is required to search for tasks',
    };
  }

  try {
    // Build the WHERE clause with case-insensitive matching
    const conditions = [];

    // Title is required and must match (case-insensitive)
    conditions.push(sql`LOWER(${tasks.title}) = LOWER(${title})`);

    // If description provided, it must match (case-insensitive)
    if (description) {
      conditions.push(sql`LOWER(${tasks.description}) = LOWER(${description})`);
    }

    // If company name provided, it must match (case-insensitive)
    if (companyName) {
      conditions.push(sql`LOWER(${tasks.companyName}) = LOWER(${companyName})`);
    }

    // Combine all conditions with AND
    const whereClause = conditions.reduce((acc, condition) => 
      acc ? sql`${acc} AND ${condition}` : condition
    );

    const result = await db
      .select()
      .from(tasks)
      .where(whereClause)
      .limit(10); // Get up to 10 potential matches

    // If we have contact emails, filter by those as well (requires JSON comparison)
    if (result.length > 0 && contactEmails && contactEmails.length > 0) {
      // Normalize contact emails for comparison (lowercase and sorted)
      const normalizedSearchEmails = contactEmails
        .map(e => e.toLowerCase())
        .sort()
        .join(',');

      for (const task of result) {
        if (task.contactEmails && Array.isArray(task.contactEmails)) {
          const normalizedTaskEmails = (task.contactEmails as string[])
            .map(e => e.toLowerCase())
            .sort()
            .join(',');

          // If emails match, we found a duplicate
          if (normalizedTaskEmails === normalizedSearchEmails) {
            return {
              found: true,
              task: {
                id: task.id,
                title: task.title,
                description: task.description || undefined,
                companyName: task.companyName || undefined,
                contactEmails: task.contactEmails as string[],
                tags: (task.tags as string[]) || ['auto'],
                status: task.status,
                priority: task.priority || 'medium',
              },
              message: `Task already exists: ${task.title}`,
            };
          }
        }
      }
    } else if (result.length > 0) {
      // If no contact emails to compare, and we have a match on other fields, consider it a duplicate
      const task = result[0];
      return {
        found: true,
        task: {
          id: task.id,
          title: task.title,
          description: task.description || undefined,
          companyName: task.companyName || undefined,
          contactEmails: (task.contactEmails as string[]) || [],
          tags: (task.tags as string[]) || ['auto'],
          status: task.status,
          priority: task.priority || 'medium',
        },
        message: `Task already exists: ${task.title}`,
      };
    }

    return {
      found: false,
      message: 'No matching task found in database',
    };
  } catch (error) {
    console.error('Error searching for task:', error);
    return {
      found: false,
      message: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * AI SDK tool for looking up tasks in the database
 * This tool allows the LLM to check if a task already exists before extracting it
 */
export const taskLookupTool = tool({
  description: `Search for an existing task in the CRM database using case-insensitive matching.
Use this tool to check if a task already exists before creating a new one.
Consider synonyms and variations of all the fields (title, description, companyName, contactEmails, etc.).
Search by title (required), description, company name, and contact emails.
Returns whether the task was found and its details if it exists.
Tasks are considered duplicates if they have the same title, description, company, and contact emails.`,
  
  inputSchema: z.object({
    title: z.string().describe('Task title to search for (required, case-insensitive)'),
    description: z.string().optional().describe('Task description to match (case-insensitive)'),
    companyName: z.string().optional().describe('Company name to match (case-insensitive)'),
    contactEmails: z.array(z.string().email()).optional().describe('Array of contact email addresses involved in the task'),
  }),
  
  execute: async (params: {
    title: string;
    description?: string;
    companyName?: string;
    contactEmails?: string[];
  }) => {
    const result = await searchTask(params);
    return result;
  },
});
