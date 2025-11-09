import { tool } from 'ai';
import { z } from 'zod';
import { db } from '@/db';
import { contacts } from '@/db/schema';
import { sql } from 'drizzle-orm';

/**
 * Contact lookup result type
 */
export interface ContactLookupResult {
  found: boolean;
  contact?: {
    id: string;
    name: string;
    email: string;
    companyName?: string;
    title?: string;
  };
  message: string;
}

/**
 * Search for a contact in the database using case-insensitive comparison
 * Searches by email, name, company name, and title (role)
 * 
 * @param params - Search parameters (all fields converted to lowercase for comparison)
 * @returns Contact lookup result
 */
export async function searchContact(params: {
  email?: string;
  name?: string;
  companyName?: string;
  title?: string;
}): Promise<ContactLookupResult> {
  const { email, name, companyName, title } = params;

  // Build the WHERE clause dynamically with case-insensitive matching
  const conditions = [];

  if (email) {
    conditions.push(sql`LOWER(${contacts.email}) = LOWER(${email})`);
  }
  if (name) {
    conditions.push(sql`LOWER(${contacts.name}) = LOWER(${name})`);
  }
  if (companyName) {
    conditions.push(sql`LOWER(${contacts.companyName}) = LOWER(${companyName})`);
  }

  // If no search criteria provided, return not found
  if (conditions.length === 0) {
    return {
      found: false,
      message: 'No search criteria provided',
    };
  }

  try {
    // Combine all conditions with OR
    const whereClause = conditions.reduce((acc, condition) => 
      acc ? sql`${acc} AND ${condition}` : condition
    );

    const result = await db
      .select()
      .from(contacts)
      .where(whereClause)
      .limit(1);

    if (result.length > 0) {
      console.log(`${result.length} contacts found, skipping...`);
      const contact = result[0];
      return {
        found: true,
        contact: {
          id: contact.id,
          name: contact.name,
          email: contact.email,
          companyName: contact.companyName || undefined,
          title: contact.title || undefined,
        },
        message: `Contact found: ${contact.name} (${contact.email})`,
      };
    }

    return {
      found: false,
      message: 'No matching contact found in database',
    };
  } catch (error) {
    console.error('Error searching for contact:', error);
    return {
      found: false,
      message: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * AI SDK tool for looking up contacts in the database
 * This tool allows the LLM to check if a contact already exists before extracting it
 */
export const contactLookupTool = tool({
  description: `Search for an existing contact in the CRM database using case-insensitive matching.
Use this tool to check if a contact already exists before creating a new one.
Search by email (most reliable), name, company name, or job title (role).
Returns whether the contact was found and their details if they exist.`,
  
  inputSchema: z.object({
    email: z.string().optional().describe('Email address to search for (case-insensitive)'),
    name: z.string().optional().describe('Full name to search for (case-insensitive)'),
    companyName: z.string().optional().describe('Company name to search for (case-insensitive)'),
    title: z.string().optional().describe('Job title or role to search for (case-insensitive)'),
  }),
  
  execute: async (params: {
    email?: string;
    name?: string;
    companyName?: string;
    title?: string;
  }) => {
    const result = await searchContact(params);
    return result;
  },
});

