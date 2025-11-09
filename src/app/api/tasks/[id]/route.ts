import { NextRequest, NextResponse } from 'next/server';
import { deleteTask, getTaskById, updateTask } from '@/services/taskService';

/**
 * GET /api/tasks/[id]
 * Get a specific task by ID
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const task = await getTaskById(id);

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      task,
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch task',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tasks/[id]
 * Update a task
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      title,
      description,
      companyName,
      contactEmails,
      status,
      priority,
      dueDate,
      completedAt,
    } = body;

    // Build update object with only provided fields
    const updateData: Partial<{
      title: string;
      description: string | null;
      companyName: string | null;
      contactEmails: string[] | null;
      status: string;
      priority: string | null;
      dueDate: Date | null;
      completedAt: Date | null;
      updatedAt: Date;
    }> = {
      updatedAt: new Date(),
    };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (companyName !== undefined) updateData.companyName = companyName;
    if (contactEmails !== undefined) updateData.contactEmails = contactEmails;
    if (status !== undefined) {
      updateData.status = status;
      // Auto-set completedAt when status changes to done
      if (status === 'done' && !completedAt) {
        updateData.completedAt = new Date();
      } else if (status !== 'done') {
        updateData.completedAt = null;
      }
    }
    if (priority !== undefined) updateData.priority = priority;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (completedAt !== undefined) updateData.completedAt = completedAt ? new Date(completedAt) : null;

    const updatedTask = await updateTask(id, updateData);

    if (!updatedTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Trigger email drafting if task moved to in_progress with 'auto' and 'email' tags
    if (status === 'in_progress' && updatedTask.tags) {
      const taskTags = Array.isArray(updatedTask.tags) ? updatedTask.tags : [];
      if (taskTags.includes('auto') && taskTags.includes('email')) {
        // Trigger email drafting asynchronously (don't await)
        fetch(`${request.nextUrl.origin}/api/tasks/${id}/draft-email`, {
          method: 'POST',
        }).catch(error => {
          console.error('Error triggering email draft:', error);
        });
      }
    }

    return NextResponse.json({
      success: true,
      task: updatedTask,
    });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      {
        error: 'Failed to update task',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tasks/[id]
 * Delete a task
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const deletedTask = await deleteTask(id);

    if (!deletedTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete task',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
