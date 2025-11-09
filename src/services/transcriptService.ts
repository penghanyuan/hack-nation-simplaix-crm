import { db } from '@/db';
import { transcripts, type Transcript, type NewTranscript } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

/**
 * Get all transcripts
 */
export async function listTranscripts(): Promise<Transcript[]> {
  return db
    .select()
    .from(transcripts)
    .orderBy(desc(transcripts.createdAt));
}

/**
 * Get a transcript by ID
 */
export async function getTranscriptById(id: string): Promise<Transcript | undefined> {
  return db.query.transcripts.findFirst({
    where: (table, { eq }) => eq(table.id, id),
  });
}

/**
 * Get a transcript by blob URL
 */
export async function getTranscriptByUrl(blobUrl: string): Promise<Transcript | undefined> {
  return db.query.transcripts.findFirst({
    where: (table, { eq }) => eq(table.blobUrl, blobUrl),
  });
}

/**
 * Create a new transcript record
 */
export async function createTranscript(data: Omit<NewTranscript, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transcript> {
  const [transcript] = await db
    .insert(transcripts)
    .values(data)
    .returning();

  return transcript;
}

/**
 * Update a transcript
 */
export async function updateTranscript(
  id: string,
  data: Partial<Omit<NewTranscript, 'id' | 'createdAt'>>
): Promise<Transcript | undefined> {
  const [transcript] = await db
    .update(transcripts)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(transcripts.id, id))
    .returning();

  return transcript;
}

/**
 * Delete a transcript
 */
export async function deleteTranscript(id: string): Promise<Transcript | undefined> {
  const [transcript] = await db
    .delete(transcripts)
    .where(eq(transcripts.id, id))
    .returning();

  return transcript;
}

/**
 * Get pending transcripts (not yet processed)
 */
export async function getPendingTranscripts(): Promise<Transcript[]> {
  return db
    .select()
    .from(transcripts)
    .where(eq(transcripts.status, 'pending'))
    .orderBy(desc(transcripts.createdAt));
}

