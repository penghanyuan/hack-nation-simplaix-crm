import { db } from '@/db';
import { contacts, type Contact, type NewContact } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

type ContactUpdate = Partial<Omit<NewContact, 'id'>>;

export async function listContacts(): Promise<Contact[]> {
  return db
    .select()
    .from(contacts)
    .orderBy(desc(contacts.createdAt));
}

export async function createContact(data: ContactUpdate): Promise<Contact> {
  const [contact] = await db
    .insert(contacts)
    .values(data as NewContact)
    .returning();

  return contact;
}

export async function getContactByEmail(email: string): Promise<Contact | undefined> {
  return db.query.contacts.findFirst({
    where: (table, { eq }) => eq(table.email, email),
  });
}

export async function updateContact(id: string, data: ContactUpdate): Promise<Contact | undefined> {
  const [contact] = await db
    .update(contacts)
    .set({
      ...data,
      updatedAt: data.updatedAt ?? new Date(),
    })
    .where(eq(contacts.id, id))
    .returning();

  return contact;
}

export async function deleteContact(id: string): Promise<Contact | undefined> {
  const [contact] = await db
    .delete(contacts)
    .where(eq(contacts.id, id))
    .returning();

  return contact;
}

export async function getContactById(id: string): Promise<Contact | undefined> {
  return db.query.contacts.findFirst({
    where: (table, { eq }) => eq(table.id, id),
  });
}
