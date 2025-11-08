import { NextResponse } from 'next/server';
import { db } from '@/db';
import { tasks } from '@/db/schema';
import { desc } from 'drizzle-orm';

/**
 * GET /api/tasks
 * Retrieve all tasks from the database
 */
export async function GET() {
  try {
    const allTasks = await db
      .select()
      .from(tasks)
      .orderBy(desc(tasks.createdAt));

    return NextResponse.json({
      success: true,
      tasks: allTasks,
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch tasks',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tasks
 * Create a new task
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      companyName,
      contactEmails,
      status,
      priority,
      dueDate,
    } = body;

    // Validate required fields
    if (!title) {
      return NextResponse.json(
        { error: 'Missing required field: title' },
        { status: 400 }
      );
    }

    // Insert new task
    const [newTask] = await db
      .insert(tasks)
      .values({
        title,
        description: description || undefined,
        companyName: companyName || undefined,
        contactEmails: contactEmails || [],
        status: status || 'todo',
        priority: priority || 'medium',
        dueDate: dueDate ? new Date(dueDate) : undefined,
      })
      .returning();

    return NextResponse.json({
      success: true,
      task: newTask,
    });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      {
        error: 'Failed to create task',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

