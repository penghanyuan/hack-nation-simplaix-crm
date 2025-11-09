import { db } from '@/db';
import { activities, type Activity } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

export type ActivitySeed = {
  entityType: 'contact' | 'task' | 'deal';
  action?: 'create' | 'update';
  sourceType?: 'email' | 'meeting' | 'linkedin';
  extractedData: Record<string, unknown>;
  sourceEmailSubject?: string | null;
  sourceEmailFrom?: string | null;
  sourceEmailDate?: Date;
  sourceInteractionId?: string | null;
};

export async function getPendingActivities(limit = 20): Promise<Activity[]> {
  return db
    .select()
    .from(activities)
    .where(eq(activities.status, 'pending'))
    .orderBy(desc(activities.createdAt))
    .limit(limit);
}

export async function createPendingActivity(seed: ActivitySeed): Promise<Activity> {
  const [activity] = await db
    .insert(activities)
    .values({
      entityType: seed.entityType,
      action: seed.action || 'create',
      status: 'pending',
      sourceType: seed.sourceType || 'email',
      extractedData: seed.extractedData,
      sourceEmailSubject: seed.sourceEmailSubject,
      sourceEmailFrom: seed.sourceEmailFrom,
      sourceEmailDate: seed.sourceEmailDate,
      sourceInteractionId: seed.sourceInteractionId ?? undefined,
    })
    .returning();

  return activity;
}

export async function getActivityById(id: string): Promise<Activity | undefined> {
  return db.query.activities.findFirst({
    where: (table, { eq }) => eq(table.id, id),
  });
}

export async function markActivityStatus(
  id: string,
  status: 'pending' | 'accepted' | 'rejected',
  processedAt: Date = new Date()
): Promise<Activity | undefined> {
  const [activity] = await db
    .update(activities)
    .set({
      status,
      processedAt,
    })
    .where(eq(activities.id, id))
    .returning();

  return activity;
}
