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

/**
 * Insert emails from Gmail, skipping duplicates
 */
export async function insertGmailEmails(gmailEmails: Array<{
  gmailId: string;
  subject: string;
  body: string;
  fromEmail: string;
  fromName?: string;
  toEmail?: string;
  receivedAt: Date;
}>): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0;
  let skipped = 0;

  for (const email of gmailEmails) {
    // Check if email already exists
    const existing = await getEmailByGmailId(email.gmailId);
    if (existing) {
      skipped++;
      continue;
    }

    // Insert new email
    await createEmail({
      gmailId: email.gmailId,
      subject: email.subject,
      body: email.body,
      fromEmail: email.fromEmail,
      fromName: email.fromName,
      toEmail: email.toEmail,
      receivedAt: email.receivedAt,
      status: 'pending',
    });

    inserted++;
  }

  return { inserted, skipped };
}

/**
 * Query emails by time range with optional filters
 */
export async function queryEmailsByTimeRange(params: {
  startDate?: Date;
  endDate?: Date;
  status?: 'pending' | 'processing' | 'processed' | 'error';
  limit?: number;
}): Promise<Email[]> {
  const { startDate, endDate, status, limit = 100 } = params;
  
  const { and, gte, lte } = await import('drizzle-orm');
  
  const conditions = [];
  
  if (startDate) {
    conditions.push(gte(emails.receivedAt, startDate));
  }
  
  if (endDate) {
    conditions.push(lte(emails.receivedAt, endDate));
  }
  
  if (status) {
    conditions.push(eq(emails.status, status));
  }
  
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  
  return db
    .select()
    .from(emails)
    .where(whereClause)
    .orderBy(desc(emails.receivedAt))
    .limit(limit);
}
