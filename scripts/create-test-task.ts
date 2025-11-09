import { db } from '../src/db';
import { tasks } from '../src/db/schema';

async function createTestTask() {
  try {
    const [task] = await db
      .insert(tasks)
      .values({
        title: 'Send pricing proposal and estimated project timeline to ACME Inc.',
        description: 'Prepare and send a detailed pricing proposal and estimated project timeline to ACME Inc. Include breakdown of costs, milestones, and deliverables.',
        companyName: 'ACME Inc.',
        contactEmails: ['hyria.peng@icloud.com'],
        tags: ['auto', 'email'],
        status: 'todo',
        priority: 'medium',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      })
      .returning();

    console.log('✅ Test task created successfully!');
    console.log('📋 Task ID:', task.id);
    console.log('📧 Task has "auto" and "email" tags');
    console.log('\n🎯 To test the email drafting feature:');
    console.log('1. Go to http://localhost:3000/tasks');
    console.log('2. Move this task to the "In Progress" column');
    console.log('3. Wait a few seconds for the email draft to generate');
    console.log('4. Look for the red dot indicator on the task card');
    console.log('5. Click on the task card to view the generated email');
    console.log('6. Use the "Copy Email" button to copy the content\n');
  } catch (error) {
    console.error('❌ Error creating test task:', error);
    process.exit(1);
  }

  process.exit(0);
}

createTestTask();

