import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { tasks, taskResults, contacts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const p = await params
    const taskId = p.id;

    // Get the task
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    // Check if task has both 'auto' and 'email' tags
    const taskTags = (task.tags as string[]) || [];
    if (!taskTags.includes('auto') || !taskTags.includes('email')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Task must have both "auto" and "email" tags' 
        },
        { status: 400 }
      );
    }

    // Check if task is in 'in_progress' status
    if (task.status !== 'in_progress') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Task must be in "in_progress" status' 
        },
        { status: 400 }
      );
    }

    // Check if a result already exists
    const existingResult = await db.query.taskResults.findFirst({
      where: eq(taskResults.taskId, taskId),
    });

    let resultId: string;

    if (existingResult) {
      // Update existing result to processing
      await db
        .update(taskResults)
        .set({
          status: 'processing',
          updatedAt: new Date(),
        })
        .where(eq(taskResults.id, existingResult.id));
      resultId = existingResult.id;
    } else {
      // Create a new result entry
      const [newResult] = await db
        .insert(taskResults)
        .values({
          taskId,
          status: 'processing',
        })
        .returning();
      resultId = newResult.id;
    }

    // Fetch contact information if available
    let contactInfo = '';
    if (task.contactEmails && Array.isArray(task.contactEmails) && task.contactEmails.length > 0) {
      const contactRecords = await db
        .select()
        .from(contacts)
        .where(eq(contacts.email, task.contactEmails[0]));
      
      if (contactRecords.length > 0) {
        const contact = contactRecords[0];
        contactInfo = `
Contact Information:
- Name: ${contact.name}
- Email: ${contact.email}
- Company: ${contact.companyName || 'N/A'}
- Title: ${contact.title || 'N/A'}
`;
      }
    }

    // Generate email draft asynchronously (don't await)
    generateEmailDraft(resultId, task, contactInfo);

    return NextResponse.json({
      success: true,
      message: 'Email draft generation started',
      resultId,
    });
  } catch (error) {
    console.error('Error starting email draft generation:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

async function generateEmailDraft(
  resultId: string,
  task: any,
  contactInfo: string
) {
  try {
    const prompt = `You are an AI assistant helping to draft a professional email based on a task.

Task Details:
- Title: ${task.title}
- Description: ${task.description || 'No description provided'}
- Company: ${task.companyName || 'N/A'}
- Priority: ${task.priority || 'medium'}
- Due Date: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Not set'}
${contactInfo}

Based on the task information above, draft a professional email that addresses the task requirements. 
The email should be:
1. Professional and courteous
2. Clear and concise
3. Action-oriented
4. Appropriate for the context

Generate ONLY the email content. Do not include meta-commentary or explanations.
Format: Provide both a subject line and body.

Subject: [Your subject here]

[Email body here]`;

    const result = await generateText({
      model: openai('gpt-4o-mini'),
      prompt,
      temperature: 0.7,
      maxTokens: 1000,
    });

    const emailContent = result.text.trim();
    
    // Parse subject and body
    const subjectMatch = emailContent.match(/Subject:\s*(.+?)(\n|$)/i);
    const subject = subjectMatch ? subjectMatch[1].trim() : 'Follow-up';
    
    // Remove subject line from body
    const body = emailContent
      .replace(/Subject:\s*.+?(\n|$)/i, '')
      .trim();

    // Update the result with the generated email
    await db
      .update(taskResults)
      .set({
        status: 'completed',
        emailSubject: subject,
        emailBody: body,
        updatedAt: new Date(),
      })
      .where(eq(taskResults.id, resultId));

    console.log(`✅ Email draft generated for task ${task.id}`);
  } catch (error) {
    console.error('Error generating email draft:', error);
    
    // Update result with error
    await db
      .update(taskResults)
      .set({
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        updatedAt: new Date(),
      })
      .where(eq(taskResults.id, resultId));
  }
}

