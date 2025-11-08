import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { activities, contacts, tasks } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * PATCH /api/activities/[id]/accept
 * Accept an activity and insert the extracted data into the appropriate table
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch the activity
    const [activity] = await db
      .select()
      .from(activities)
      .where(eq(activities.id, id))
      .limit(1);

    if (!activity) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

    if (activity.status !== 'pending') {
      return NextResponse.json(
        { error: 'Activity is not pending' },
        { status: 400 }
      );
    }

    let insertedRecord = null;

    // Handle contact activity
    if (activity.entityType === 'contact') {
      const contactData = activity.extractedData as {
        name: string;
        email: string;
        companyName?: string;
        title?: string;
      };

      // Check if contact already exists
      const existingContact = await db.query.contacts.findFirst({
        where: (contacts, { eq }) => eq(contacts.email, contactData.email),
      });

      if (existingContact) {
        // Contact already exists, just mark activity as accepted
        await db
          .update(activities)
          .set({ status: 'accepted', processedAt: new Date() })
          .where(eq(activities.id, id));

        return NextResponse.json({
          success: true,
          message: 'Contact already exists',
          existed: true,
          record: existingContact,
        });
      }

      // Insert new contact
      const [newContact] = await db
        .insert(contacts)
        .values(contactData)
        .returning();

      insertedRecord = newContact;
    }
    // Handle task activity
    else if (activity.entityType === 'task') {
      const taskData = activity.extractedData as {
        title: string;
        description?: string;
        companyName?: string;
        contactEmails: string[];
        status: 'todo' | 'in_progress' | 'done';
        priority: 'low' | 'medium' | 'high' | 'urgent';
        dueDate?: string;
      };

      // Insert new task
      const [newTask] = await db
        .insert(tasks)
        .values({
          title: taskData.title,
          description: taskData.description || undefined,
          companyName: taskData.companyName,
          contactEmails: taskData.contactEmails,
          status: taskData.status || 'todo',
          priority: taskData.priority || 'medium',
          dueDate: taskData.dueDate
            ? new Date(taskData.dueDate)
            : undefined,
        })
        .returning();

      insertedRecord = newTask;
    }

    // Mark activity as accepted
    await db
      .update(activities)
      .set({ status: 'accepted', processedAt: new Date() })
      .where(eq(activities.id, id));

    return NextResponse.json({
      success: true,
      message: `${activity.entityType} accepted and created`,
      existed: false,
      record: insertedRecord,
    });
  } catch (error) {
    console.error('Error accepting activity:', error);

    return NextResponse.json(
      {
        error: 'Failed to accept activity',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
