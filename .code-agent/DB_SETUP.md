# Database Setup - Phase 1 Complete ✅

## Overview
Successfully set up Drizzle ORM with Neon PostgreSQL for the Zero-Click CRM project.

## Completed Tasks

### 1. Dependencies Installed
- `drizzle-orm` - ORM for type-safe database queries
- `@neondatabase/serverless` - Neon's serverless driver
- `drizzle-kit` - Migration and schema management tool

### 2. Database Schema Created (`src/db/schema.ts`)

#### Tables:
1. **contacts** - Store contact information
   - Fields: id, name, email (unique), company_name, title, timestamps
   
2. **companies** - Store company information
   - Fields: id, name, domain (unique), last_activity_at, timestamps
   
3. **deals** - Store deal/opportunity information
   - Fields: id, title, company_name, contact_email, stage, amount, next_action, next_action_date, last_activity_at, timestamps
   - Stages: new, in_discussion, proposal, won, lost
   
4. **interactions** - Store email and meeting interactions
   - Fields: id, type (email/meeting), datetime, participants (JSON), summary, sentiment, contact_email, created_at
   - Sentiment: positive, neutral, negative
   
5. **pending_changes** - Store CRM updates awaiting approval (HIL)
   - Fields: id, entity_type, action (create/update), data (JSON), source_data (JSON), status (pending/approved/rejected), created_at

#### Enums:
- `deal_stage` - Deal pipeline stages
- `interaction_type` - Email or meeting
- `sentiment` - Positive, neutral, or negative
- `pending_change_status` - Pending, approved, or rejected
- `pending_change_action` - Create or update
- `pending_change_entity_type` - Contact, company, or deal

#### Type Exports:
All tables have inferred TypeScript types exported for type-safe operations throughout the app.

### 3. Database Client Setup (`src/db/index.ts`)
- Configured Neon HTTP client
- Initialized Drizzle with schema
- Connection uses `STORAGE_DATABASE_URL` from `.env.development.local`

### 4. Drizzle Configuration (`drizzle.config.ts`)
Already configured to:
- Load environment variables from `.env.development.local`
- Point to schema at `./src/db/schema.ts`
- Use PostgreSQL dialect
- Output migrations to `./drizzle` directory

### 5. Migration Scripts Added to `package.json`
```json
"db:generate": "drizzle-kit generate"   // Generate migration files
"db:migrate": "drizzle-kit migrate"     // Apply migrations to database
"db:studio": "drizzle-kit studio"       // Open Drizzle Studio GUI
"db:push": "drizzle-kit push"           // Push schema without migrations
```

### 6. Initial Migration Executed
- Generated: `drizzle/0000_faithful_ozymandias.sql`
- Successfully applied to Neon database
- All 5 tables created with correct structure

## Database Usage Example

```typescript
import { db } from '@/db';
import { contacts, deals, pendingChanges } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Insert a new contact
await db.insert(contacts).values({
  name: 'John Doe',
  email: 'john@example.com',
  companyName: 'Acme Corp',
  title: 'CTO'
});

// Query contacts
const allContacts = await db.select().from(contacts);

// Update a contact
await db.update(contacts)
  .set({ title: 'VP of Engineering' })
  .where(eq(contacts.email, 'john@example.com'));

// Query with filtering
const pendingApprovals = await db.select()
  .from(pendingChanges)
  .where(eq(pendingChanges.status, 'pending'));
```

## Next Steps
Ready to proceed with:
- Phase 2: Gmail API Integration
- Phase 3: AI Extraction Pipeline
- Phase 4: Review Queue UI
- Phase 5: CRM Dashboard

## Environment Variables Required
Ensure `.env.development.local` contains:
```
STORAGE_DATABASE_URL=postgresql://...@neon.tech/...
```

## Useful Commands
- `pnpm db:studio` - Open Drizzle Studio to browse/edit data visually
- `pnpm db:generate` - Generate new migration after schema changes
- `pnpm db:migrate` - Apply pending migrations

