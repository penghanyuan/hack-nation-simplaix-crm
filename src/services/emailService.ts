import { db } from '@/db';
import { emails, type Email, type NewEmail } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

/**
 * Get all emails
 */
export async function listEmails(): Promise<Email[]> {
  return db
    .select()
    .from(emails)
    .orderBy(desc(emails.receivedAt));
}

/**
 * Get an email by ID
 */
export async function getEmailById(id: string): Promise<Email | undefined> {
  return db.query.emails.findFirst({
    where: (table, { eq }) => eq(table.id, id),
  });
}

/**
 * Get an email by Gmail ID
 */
export async function getEmailByGmailId(gmailId: string): Promise<Email | undefined> {
  return db.query.emails.findFirst({
    where: (table, { eq }) => eq(table.gmailId, gmailId),
  });
}

/**
 * Create a new email record
 */
export async function createEmail(data: Omit<NewEmail, 'id' | 'createdAt' | 'updatedAt'>): Promise<Email> {
  const [email] = await db
    .insert(emails)
    .values(data)
    .returning();

  return email;
}

/**
 * Update an email
 */
export async function updateEmail(
  id: string,
  data: Partial<Omit<NewEmail, 'id' | 'createdAt'>>
): Promise<Email | undefined> {
  const [email] = await db
    .update(emails)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(emails.id, id))
    .returning();

  return email;
}

/**
 * Delete an email
 */
export async function deleteEmail(id: string): Promise<Email | undefined> {
  const [email] = await db
    .delete(emails)
    .where(eq(emails.id, id))
    .returning();

  return email;
}

/**
 * Get pending emails (not yet processed)
 */
export async function getPendingEmails(): Promise<Email[]> {
  return db
    .select()
    .from(emails)
    .where(eq(emails.status, 'pending'))
    .orderBy(desc(emails.receivedAt));
}
