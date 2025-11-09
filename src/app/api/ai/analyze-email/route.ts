import { NextRequest, NextResponse } from 'next/server';
import { analyzeEmailWithTools, type EmailData } from '@/lib/ai';
import { createPendingActivity, markActivityStatus } from '@/services/activityService';
import { createContact, getContactByEmail, updateContact } from '@/services/contactService';
import { createTask } from '@/services/taskService';

/**
 * POST /api/ai/analyze-email
 * 
 * Analyzes email content and optionally inserts into database
 * 
 * Request body:
 * {
 *   email: EmailData,
 *   autoInsert?: boolean (default: false)
 * }
 * 
 * Response:
 * {
 *   analysis: EmailAnalysisResult,
 *   inserted?: { type: 'contact' | 'task', data: Contact | Deal }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, autoInsert = false } = body;

    // Validate email data
    if (!email || !email.subject || !email.body || !email.from?.email) {
      return NextResponse.json(
        { error: 'Invalid email data. Required: subject, body, from.email' },
        { status: 400 }
      );
    }

    // Analyze the email (multi-step agent extracts both contacts and tasks)
    const analysis = await analyzeEmailWithTools(email as EmailData, { model: 'gpt-5-mini-2025-08-07' });

    // Save all extracted data as pending activities
    const createdActivities = [];

    // Create activity for each extracted contact (new contacts)
    for (const contactData of analysis.contacts) {
      const activity = await createPendingActivity({
        entityType: 'contact',
        action: 'create',
        extractedData: { ...contactData, action: 'create' },
        sourceEmailSubject: email.subject,
        sourceEmailFrom: `${email.from.name || ''} <${email.from.email}>`.trim(),
        sourceEmailDate: email.date ? new Date(email.date) : new Date(),
      });

      createdActivities.push(activity);
    }

    // Create activity for each contact update (existing contacts with changes)
    if (analysis.contactUpdates) {
      for (const updateData of analysis.contactUpdates) {
        const activity = await createPendingActivity({
          entityType: 'contact',
          action: 'update',
          extractedData: { ...updateData, action: 'update' },
          sourceEmailSubject: email.subject,
          sourceEmailFrom: `${email.from.name || ''} <${email.from.email}>`.trim(),
          sourceEmailDate: email.date ? new Date(email.date) : new Date(),
        });

        createdActivities.push(activity);
      }
    }

    // Create activity for each extracted task
    for (const taskData of analysis.tasks) {
      const activity = await createPendingActivity({
        entityType: 'task',
        extractedData: taskData,
        sourceEmailSubject: email.subject,
        sourceEmailFrom: `${email.from.name || ''} <${email.from.email}>`.trim(),
        sourceEmailDate: email.date ? new Date(email.date) : new Date(),
      });

      createdActivities.push(activity);
    }

    // If autoInsert is true, auto-accept all activities
    let insertedData = null;
    if (autoInsert) {
      const insertedContacts = [];
      const updatedContacts = [];
      const insertedTasks = [];

      // Auto-accept contact activities
      for (const activity of createdActivities.filter(a => a.entityType === 'contact')) {
        const contactData = activity.extractedData as any;

        // Check if this is an update or create action
        if (contactData.action === 'update') {
          // This is a contact update - update the existing contact
          const { existingContactId, changes, action, ...updateFields } = contactData;
          
          // Update the contact in the database
          const updatedContact = await updateContact(existingContactId, updateFields);

          if (updatedContact) {
            updatedContacts.push({ 
              data: updatedContact, 
              action: 'updated',
              changes: changes 
            });

            // Mark activity as accepted
            await markActivityStatus(activity.id, 'accepted');
          }
        } else {
          // This is a new contact - create it
          const { action, ...newContactFields } = contactData;
          
          // Check if contact already exists (double check)
          const existingContact = await getContactByEmail(newContactFields.email);

          if (!existingContact) {
            const newContact = await createContact(newContactFields);

            insertedContacts.push({ data: newContact, action: 'created' });

            // Mark activity as accepted
            await markActivityStatus(activity.id, 'accepted');
          } else {
            insertedContacts.push({ data: existingContact, action: 'already_exists' });

            // Mark activity as accepted (but contact existed)
            await markActivityStatus(activity.id, 'accepted');
          }
        }
      }

      // Auto-accept task activities
      for (const activity of createdActivities.filter(a => a.entityType === 'task')) {
        const taskData = activity.extractedData as typeof analysis.tasks[0];

        const newTask = await createTask({
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

        insertedTasks.push(newTask);

        // Mark activity as accepted
        await markActivityStatus(activity.id, 'accepted');
      }

      insertedData = {
        contacts: insertedContacts,
        contactUpdates: updatedContacts,
        tasks: insertedTasks,
      };
    }

    return NextResponse.json({
      success: true,
      analysis,
      activities: createdActivities,
      inserted: insertedData,
    });

  } catch (error) {
    console.error('Error analyzing email:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to analyze email', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/analyze-email
 * 
 * Returns API information
 */
export async function GET() {
  return NextResponse.json({
    name: 'Email Analyzer API',
    version: '1.0.0',
    description: 'AI-powered email analysis for CRM data extraction',
    endpoints: {
      POST: {
        description: 'Analyze email content and optionally insert into database',
        body: {
          email: {
            subject: 'string (required)',
            body: 'string (required)',
            from: {
              email: 'string (required)',
              name: 'string (optional)',
            },
            to: 'string (optional)',
            date: 'string (optional)',
          },
          autoInsert: 'boolean (optional, default: false)',
        },
        response: {
          success: 'boolean',
          analysis: {
            type: '"contact" | "task"',
            data: 'ContactEntry | TaskEntry',
          },
          inserted: 'object | null (if autoInsert = true)',
        },
      },
    },
    examples: {
      curl: `curl -X POST http://localhost:3000/api/ai/analyze-email \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": {
      "subject": "Meeting Request",
      "body": "Hi, I would like to schedule a demo...",
      "from": { "email": "john@example.com", "name": "John Doe" }
    },
    "autoInsert": false
  }'`,
    },
  });
}
