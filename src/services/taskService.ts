import { db } from '@/db';
import { tasks, type Task, type NewTask } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

type TaskUpdate = Partial<Omit<NewTask, 'id'>>;

export async function listTasks(): Promise<Task[]> {
  return db
    .select()
    .from(tasks)
    .orderBy(desc(tasks.createdAt));
}

export async function createTask(data: TaskUpdate): Promise<Task> {
  const [task] = await db
    .insert(tasks)
    .values(data)
    .returning();

  return task;
}

export async function getTaskById(id: string): Promise<Task | undefined> {
  return db.query.tasks.findFirst({
    where: (table, { eq }) => eq(table.id, id),
  });
}

export async function updateTask(id: string, data: TaskUpdate): Promise<Task | undefined> {
  const [task] = await db
    .update(tasks)
    .set({
      ...data,
      updatedAt: data.updatedAt ?? new Date(),
    })
    .where(eq(tasks.id, id))
    .returning();

  return task;
}

export async function deleteTask(id: string): Promise<Task | undefined> {
  const [task] = await db
    .delete(tasks)
    .where(eq(tasks.id, id))
    .returning();

  return task;
}
