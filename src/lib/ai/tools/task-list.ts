import { tool } from 'ai';
import { z } from 'zod';
import { db } from '@/db';
import { tasks } from '@/db/schema';

/**
 * Task list result type
 */
export interface TaskListResult {
  tasks: {
    id: string;
    title: string;
    description?: string;
    companyName?: string;
    contactEmails: string[];
    status: string;
    priority: string;
    dueDate?: string;
  }[];
  total: number;
  message: string;
}

/**
 * Get all tasks from the database
 * Returns the complete list of tasks for the AI to check for duplicates
 * 
 * @returns Task list result with all tasks
 */
export async function getAllTasks(): Promise<TaskListResult> {
  try {
    const result = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        companyName: tasks.companyName,
        contactEmails: tasks.contactEmails,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
      })
      .from(tasks)
      .orderBy(tasks.createdAt);

    console.log(`📋 Retrieved ${result.length} tasks from database`);

    return {
      tasks: result.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description || undefined,
        companyName: task.companyName || undefined,
        contactEmails: (task.contactEmails as string[]) || [],
        status: task.status,
        priority: task.priority || 'medium',
        dueDate: task.dueDate ? task.dueDate.toISOString() : undefined,
      })),
      total: result.length,
      message: `Retrieved ${result.length} tasks from database`,
    };
  } catch (error) {
    console.error('Error retrieving tasks:', error);
    return {
      tasks: [],
      total: 0,
      message: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * AI SDK tool for getting all tasks from the database
 * This tool allows the LLM to retrieve the complete task list and check for duplicates
 */
export const taskListTool = tool({
  description: `Retrieve all tasks from the CRM database.
Use this tool at the beginning of email/transcript analysis to get the full task list.
The AI should then compare extracted tasks against this list to avoid duplicates.
Returns an array of all tasks with their complete information (id, title, description, companyName, contactEmails, status, priority, dueDate).
Tasks are considered duplicates if they have very similar title and description, or same title with same company/contacts.`,
  
  inputSchema: z.object({}),
  
  execute: async () => {
    const result = await getAllTasks();
    return result;
  },
});

