export type ContactChange = {
  field: string;
  oldValue: string | null | undefined;
  newValue: string | null | undefined;
};

export type ContactActivityPayload = {
  name: string;
  email: string;
  companyName?: string;
  title?: string;
  phone?: string;
  linkedin?: string;
  x?: string;
  city?: string;
  action?: 'create' | 'update';
  existingContactId?: string;
  changes?: ContactChange[];
};

export type TaskActivityPayload = {
  title: string;
  description?: string;
  companyName?: string;
  contactEmails: string[];
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
};

export type DealActivityPayload = {
  title: string;
  companyName?: string;
  contactEmail?: string;
  stage: 'new' | 'in_discussion' | 'proposal' | 'won' | 'lost';
  amount?: number;
  nextAction?: string;
  nextActionDate?: string;
};
