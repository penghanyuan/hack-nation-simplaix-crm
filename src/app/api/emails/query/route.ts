import { NextResponse } from 'next/server';
import { db } from '@/db';
import { emails } from '@/db/schema';
import { and, gte, lte, eq, desc } from 'drizzle-orm';

/**
 * GET /api/emails/query
 * Query emails by time range and optional filters
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const limitParam = searchParams.get('limit');
    
    // Parse limit with default of 100
    const limit = limitParam ? parseInt(limitParam, 10) : 100;
    
    if (isNaN(limit) || limit <= 0 || limit > 1000) {
      return NextResponse.json(
        { error: 'Limit must be a number between 1 and 1000' },
        { status: 400 }
      );
    }
    
    // Build where conditions
    const conditions = [];
    
    if (startDate) {
      const parsedStart = new Date(startDate);
      if (isNaN(parsedStart.getTime())) {
        return NextResponse.json(
          { error: 'Invalid startDate format. Use ISO 8601 format (e.g., 2024-01-01T00:00:00Z)' },
          { status: 400 }
        );
      }
      conditions.push(gte(emails.receivedAt, parsedStart));
    }
    
    if (endDate) {
      const parsedEnd = new Date(endDate);
      if (isNaN(parsedEnd.getTime())) {
        return NextResponse.json(
          { error: 'Invalid endDate format. Use ISO 8601 format (e.g., 2024-12-31T23:59:59Z)' },
          { status: 400 }
        );
      }
      conditions.push(lte(emails.receivedAt, parsedEnd));
    }
    
    if (status) {
      const validStatuses = ['pending', 'processing', 'processed', 'error'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Valid values are: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
      conditions.push(eq(emails.status, status as 'pending' | 'processing' | 'processed' | 'error'));
    }
    
    // Query database
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const results = await db
      .select()
      .from(emails)
      .where(whereClause)
      .orderBy(desc(emails.receivedAt))
      .limit(limit);
    
    return NextResponse.json({
      count: results.length,
      emails: results,
      query: {
        startDate: startDate || null,
        endDate: endDate || null,
        status: status || null,
        limit,
      },
    });
  } catch (error) {
    console.error('Error querying emails:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to query emails' },
      { status: 500 }
    );
  }
}

