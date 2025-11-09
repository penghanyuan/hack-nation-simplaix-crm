import { NextRequest, NextResponse } from 'next/server';
import { getActivityById, markActivityStatus } from '@/services/activityService';
import { createContact, getContactByEmail, updateContact } from '@/services/contactService';
import { createTask } from '@/services/taskService';
import type { ContactActivityPayload, TaskActivityPayload } from '@/lib/activity-payloads';

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
    const activity = await getActivityById(id);

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
      const contactData = activity.extractedData as ContactActivityPayload;
      const {
        action: contactAction = 'create',
        existingContactId,
        changes,
        ...contactFields
      } = contactData;

      if (contactAction === 'update' && existingContactId) {
        insertedRecord = await updateContact(existingContactId, contactFields);

        await markActivityStatus(id, 'accepted');

        return NextResponse.json({
          success: true,
          message: 'Contact updated successfully',
          action: 'updated',
          record: insertedRecord,
          changes: changes || [],
        });
      }

      const existingContact = await getContactByEmail(contactFields.email);

      if (existingContact) {
        await markActivityStatus(id, 'accepted');

        return NextResponse.json({
          success: true,
          message: 'Contact already exists',
          action: 'already_exists',
          record: existingContact,
        });
      }

      insertedRecord = await createContact(contactFields);
    }
    // Handle task activity
    else if (activity.entityType === 'task') {
      const taskData = activity.extractedData as TaskActivityPayload;

      // Insert new task
      insertedRecord = await createTask({
        title: taskData.title,
        description: taskData.description || undefined,
        companyName: taskData.companyName,
        contactEmails: taskData.contactEmails,
        status: taskData.status || 'todo',
        priority: taskData.priority || 'medium',
        dueDate: taskData.dueDate
          ? new Date(taskData.dueDate)
          : undefined,
      });
    }

    // Mark activity as accepted
    await markActivityStatus(id, 'accepted');

    const extractedAction = (
      activity.extractedData as Partial<{ action?: 'create' | 'update' }>
    )?.action ?? 'create';

    return NextResponse.json({
      success: true,
      message: `${activity.entityType} accepted and ${extractedAction === 'update' ? 'updated' : 'created'}`,
      action: extractedAction,
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
