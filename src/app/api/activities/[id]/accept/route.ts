import { NextRequest, NextResponse } from 'next/server';
import { getActivityById, markActivityStatus } from '@/services/activityService';
import { createContact, getContactByEmail, updateContact } from '@/services/contactService';
import { createTask } from '@/services/taskService';

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
      const contactData = activity.extractedData as {
        name: string;
        email: string;
        companyName?: string;
        title?: string;
        phone?: string;
        linkedin?: string;
        x?: string;
        action?: 'create' | 'update';
        existingContactId?: string;
        changes?: Array<{
          field: string;
          oldValue: string | null | undefined;
          newValue: string | null | undefined;
        }>;
      };

      // Check if this is an update or create action
      if (contactData.action === 'update' && contactData.existingContactId) {
        // This is a contact update - update the existing contact
        const { existingContactId, changes, action, ...updateFields } = contactData;
        
        insertedRecord = await updateContact(existingContactId, updateFields);

        await markActivityStatus(id, 'accepted');

        return NextResponse.json({
          success: true,
          message: 'Contact updated successfully',
          action: 'updated',
          record: insertedRecord,
          changes: changes || [],
        });
      } else {
        // This is a new contact - create it
        const { action, existingContactId, changes, ...newContactData } = contactData;

        // Check if contact already exists (double-check)
        const existingContact = await getContactByEmail(newContactData.email);

        if (existingContact) {
          // Contact already exists, just mark activity as accepted
          await markActivityStatus(id, 'accepted');

          return NextResponse.json({
            success: true,
            message: 'Contact already exists',
            action: 'already_exists',
            record: existingContact,
          });
        }

        // Insert new contact
        insertedRecord = await createContact(newContactData);
      }
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

    return NextResponse.json({
      success: true,
      message: `${activity.entityType} accepted and ${(activity.extractedData as any)?.action === 'update' ? 'updated' : 'created'}`,
      action: (activity.extractedData as any)?.action || 'create',
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
