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
    phone?: string;
    linkedin?: string;
    x?: string;
  };
  hasChanges?: boolean;
  changes?: {
    field: string;
    oldValue: string | null | undefined;
    newValue: string | null | undefined;
  }[];
  message: string;
}

/**
 * Search for a contact in the database using case-insensitive comparison
 * Searches by email, name, company name, and title (role)
 * Also detects if provided data has changes compared to existing contact
 * 
 * @param params - Search parameters (all fields converted to lowercase for comparison)
 * @returns Contact lookup result with change detection
 */
export async function searchContact(params: {
  email?: string;
  name?: string;
  companyName?: string;
  title?: string;
  phone?: string;
  linkedin?: string;
  x?: string;
}): Promise<ContactLookupResult> {
  const { email, name, companyName, title, phone, linkedin, x } = params;

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
      const contact = result[0];
      
      // Detect changes in fields
      const changes: { field: string; oldValue: string | null | undefined; newValue: string | null | undefined }[] = [];
      
      // Compare updatable fields (excluding email which is the primary identifier)
      if (name && name.toLowerCase() !== contact.name.toLowerCase()) {
        changes.push({ field: 'name', oldValue: contact.name, newValue: name });
      }
      if (companyName && companyName.toLowerCase() !== (contact.companyName || '').toLowerCase()) {
        changes.push({ field: 'companyName', oldValue: contact.companyName, newValue: companyName });
      }
      if (title && title.toLowerCase() !== (contact.title || '').toLowerCase()) {
        changes.push({ field: 'title', oldValue: contact.title, newValue: title });
      }
      if (phone && phone !== (contact.phone || '')) {
        changes.push({ field: 'phone', oldValue: contact.phone, newValue: phone });
      }
      if (linkedin && linkedin !== (contact.linkedin || '')) {
        changes.push({ field: 'linkedin', oldValue: contact.linkedin, newValue: linkedin });
      }
      if (x && x !== (contact.x || '')) {
        changes.push({ field: 'x', oldValue: contact.x, newValue: x });
      }
      
      const hasChanges = changes.length > 0;
      
      console.log(`Contact found: ${contact.email} | Changes: ${hasChanges ? changes.map(c => c.field).join(', ') : 'none'}`);
      
      return {
        found: true,
        contact: {
          id: contact.id,
          name: contact.name,
          email: contact.email,
          companyName: contact.companyName || undefined,
          title: contact.title || undefined,
          phone: contact.phone || undefined,
          linkedin: contact.linkedin || undefined,
          x: contact.x || undefined,
        },
        hasChanges,
        changes: hasChanges ? changes : undefined,
        message: hasChanges 
          ? `Contact found with ${changes.length} field(s) changed: ${changes.map(c => c.field).join(', ')}`
          : `Contact found: ${contact.name} (${contact.email})`,
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
 * Also detects if any fields have changed for update tracking
 */
export const contactLookupTool = tool({
  description: `Search for an existing contact in the CRM database using case-insensitive matching.
Use this tool to check if a contact already exists and detect if any information has changed.
Consider synonyms and variations of all the fields (name, companyName, title, phone, linkedin, x, etc.).
Search by email (most reliable), name, company name, or job title (role).
Returns whether the contact was found, their current details, and if any fields have changed.
If hasChanges is true, the contact exists but has updated information that should be tracked.`,
  
  inputSchema: z.object({
    email: z.string().optional().describe('Email address to search for (case-insensitive)'),
    name: z.string().optional().describe('Full name to search for (case-insensitive)'),
    companyName: z.string().optional().describe('Company name to search for (case-insensitive)'),
    title: z.string().optional().describe('Job title or role to search for (case-insensitive)'),
    phone: z.string().optional().describe('Phone number to check for changes'),
    linkedin: z.string().optional().describe('LinkedIn URL to check for changes'),
    x: z.string().optional().describe('Twitter/X handle to check for changes'),
  }),
  
  execute: async (params: {
    email?: string;
    name?: string;
    companyName?: string;
    title?: string;
    phone?: string;
    linkedin?: string;
    x?: string;
  }) => {
    const result = await searchContact(params);
    return result;
  },
});

