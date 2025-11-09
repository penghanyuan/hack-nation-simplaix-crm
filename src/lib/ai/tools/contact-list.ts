import { tool } from 'ai';
import { z } from 'zod';
import { db } from '@/db';
import { contacts } from '@/db/schema';

/**
 * Contact list result type
 */
export interface ContactListResult {
  contacts: {
    id: string;
    name: string;
    email: string;
    companyName?: string;
    title?: string;
    phone?: string;
    linkedin?: string;
    x?: string;
  }[];
  total: number;
  message: string;
}

/**
 * Get all contacts from the database
 * Returns the complete list of contacts for the AI to check for duplicates
 * 
 * @returns Contact list result with all contacts
 */
export async function getAllContacts(): Promise<ContactListResult> {
  try {
    const result = await db
      .select({
        id: contacts.id,
        name: contacts.name,
        email: contacts.email,
        companyName: contacts.companyName,
        title: contacts.title,
        phone: contacts.phone,
        linkedin: contacts.linkedin,
        x: contacts.x,
      })
      .from(contacts)
      .orderBy(contacts.name);

    console.log(`📋 Retrieved ${result.length} contacts from database`);

    return {
      contacts: result.map(contact => ({
        id: contact.id,
        name: contact.name,
        email: contact.email,
        companyName: contact.companyName || undefined,
        title: contact.title || undefined,
        phone: contact.phone || undefined,
        linkedin: contact.linkedin || undefined,
        x: contact.x || undefined,
      })),
      total: result.length,
      message: `Retrieved ${result.length} contacts from database`,
    };
  } catch (error) {
    console.error('Error retrieving contacts:', error);
    return {
      contacts: [],
      total: 0,
      message: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * AI SDK tool for getting all contacts from the database
 * This tool allows the LLM to retrieve the complete contact list and check for duplicates
 */
export const contactListTool = tool({
  description: `Retrieve all contacts from the CRM database.
Use this tool at the beginning of email/transcript analysis to get the full contact list.
The AI should then compare extracted contacts against this list to avoid duplicates.
Returns an array of all contacts with their complete information (id, name, email, companyName, title, phone, linkedin, x).`,
  
  inputSchema: z.object({}),
  
  execute: async () => {
    const result = await getAllContacts();
    return result;
  },
});

