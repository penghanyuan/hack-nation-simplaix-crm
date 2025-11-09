import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { taskResults } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const p = await params
    const taskId = p.id;

    const result = await db.query.taskResults.findFirst({
      where: eq(taskResults.taskId, taskId),
    });

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'No result found for this task' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('Error fetching task result:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

