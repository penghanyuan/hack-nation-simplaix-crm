/**
 * AI utilities for the CRM system
 * Exports email analyzers and AI tools
 */

// Email analyzers
export {
  analyzeEmail,
  analyzeEmails,
  type EmailData,
  type EmailAnalysisResult,
  type ContactEntry,
  type TaskEntry,
} from './email-analyzer';

export {
  analyzeEmailWithTools,
} from './email-analyzer-with-tools';

// AI Tools
export {
  contactLookupTool,
  searchContact,
  type ContactLookupResult,
} from './tools';
