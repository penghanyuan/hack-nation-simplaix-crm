/**
 * AI Tools for CRM operations
 * Export all tools from this module for easy access
 */

export { contactLookupTool, searchContact } from './contact-lookup';
export type { ContactLookupResult } from './contact-lookup';

export { taskLookupTool, searchTask } from './task-lookup';
export type { TaskLookupResult } from './task-lookup';

export { contactListTool, getAllContacts } from './contact-list';
export type { ContactListResult } from './contact-list';

export { taskListTool, getAllTasks } from './task-list';
export type { TaskListResult } from './task-list';

