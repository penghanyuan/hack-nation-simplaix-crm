import { pgTable, text, timestamp, jsonb, integer, uuid, pgEnum, boolean } from 'drizzle-orm/pg-core';

// Enums
export const dealStageEnum = pgEnum('deal_stage', [
  'new',
  'in_discussion',
  'proposal',
  'won',
  'lost'
]);

export const taskStatusEnum = pgEnum('task_status', [
  'todo',
  'in_progress',
  'done'
]);

export const taskPriorityEnum = pgEnum('task_priority', [
  'low',
  'medium',
  'high',
  'urgent'
]);

export const interactionTypeEnum = pgEnum('interaction_type', [
  'email',
  'meeting'
]);

export const sentimentEnum = pgEnum('sentiment', [
  'positive',
  'neutral',
  'negative'
]);

export const pendingChangeStatusEnum = pgEnum('pending_change_status', [
  'pending',
  'approved',
  'rejected'
]);

export const pendingChangeActionEnum = pgEnum('pending_change_action', [
  'create',
  'update'
]);

export const pendingChangeEntityTypeEnum = pgEnum('pending_change_entity_type', [
  'contact',
  'company',
  'deal'
]);

export const activityStatusEnum = pgEnum('activity_status', [
  'pending',
  'accepted',
  'rejected'
]);

export const activityEntityTypeEnum = pgEnum('activity_entity_type', [
  'contact',
  'task'
]);

// Tables
export const contacts = pgTable('contacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  companyName: text('company_name'),
  title: text('title'),
  phone: text('phone'),
  city: text('city'),
  linkedin: text('linkedin'),
  x: text('x'), // Twitter/X handle
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const companies = pgTable('companies', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  domain: text('domain').unique(),
  lastActivityAt: timestamp('last_activity_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const deals = pgTable('deals', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  companyName: text('company_name'),
  contactEmail: text('contact_email'),
  stage: dealStageEnum('stage').default('new').notNull(),
  amount: integer('amount'),
  nextAction: text('next_action'),
  nextActionDate: timestamp('next_action_date'),
  lastActivityAt: timestamp('last_activity_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  companyName: text('company_name'),
  contactEmails: jsonb('contact_emails').$type<string[]>(),
  status: taskStatusEnum('status').default('todo').notNull(),
  priority: taskPriorityEnum('priority').default('medium'),
  dueDate: timestamp('due_date'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const interactions = pgTable('interactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: interactionTypeEnum('type').notNull(),
  datetime: timestamp('datetime').notNull(),
  participants: jsonb('participants').$type<string[]>(),
  summary: text('summary'),
  sentiment: sentimentEnum('sentiment'),
  contactEmail: text('contact_email'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const pendingChanges = pgTable('pending_changes', {
  id: uuid('id').defaultRandom().primaryKey(),
  entityType: pendingChangeEntityTypeEnum('entity_type').notNull(),
  action: pendingChangeActionEnum('action').notNull(),
  data: jsonb('data').notNull(),
  sourceData: jsonb('source_data').notNull(),
  status: pendingChangeStatusEnum('status').default('pending').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const userSettings = pgTable('user_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').default('default').notNull().unique(),
  gmailAccessToken: text('gmail_access_token'),
  gmailRefreshToken: text('gmail_refresh_token'),
  gmailTokenExpiry: timestamp('gmail_token_expiry'),
  autoApproveMode: boolean('auto_approve_mode').default(false).notNull(),
  lastGmailSync: timestamp('last_gmail_sync'),
  lastActivitySync: timestamp('last_activity_sync'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const activities = pgTable('activities', {
  id: uuid('id').defaultRandom().primaryKey(),
  entityType: activityEntityTypeEnum('entity_type').notNull(),
  status: activityStatusEnum('status').default('pending').notNull(),
  extractedData: jsonb('extracted_data').notNull(),
  sourceInteractionId: uuid('source_interaction_id').references(() => interactions.id),
  sourceEmailSubject: text('source_email_subject'),
  sourceEmailFrom: text('source_email_from'),
  sourceEmailDate: timestamp('source_email_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  processedAt: timestamp('processed_at'),
});

// Types
export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;

export type Deal = typeof deals.$inferSelect;
export type NewDeal = typeof deals.$inferInsert;

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

export type Interaction = typeof interactions.$inferSelect;
export type NewInteraction = typeof interactions.$inferInsert;

export type PendingChange = typeof pendingChanges.$inferSelect;
export type NewPendingChange = typeof pendingChanges.$inferInsert;

export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;

export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;

