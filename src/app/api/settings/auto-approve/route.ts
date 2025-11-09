import { NextResponse } from 'next/server';
import { getUserSettings, updateAutoApproveMode } from '@/services/userSettings';

const DEFAULT_USER_ID = 'default';

// GET - Get auto-approve mode status
export async function GET() {
  try {
    const settings = await getUserSettings(DEFAULT_USER_ID);
    return NextResponse.json({ 
      autoApproveMode: settings?.autoApproveMode ?? false 
    });
  } catch (error) {
    console.error('Error fetching auto-approve mode:', error);
    return NextResponse.json(
      { error: 'Failed to fetch auto-approve mode' },
      { status: 500 }
    );
  }
}

// POST - Update auto-approve mode status
export async function POST(request: Request) {
  try {
    const { enabled } = await request.json();
    
    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid input: enabled must be a boolean' },
        { status: 400 }
      );
    }

    await updateAutoApproveMode(DEFAULT_USER_ID, enabled);

    return NextResponse.json({ 
      success: true,
      autoApproveMode: enabled 
    });
  } catch (error) {
    console.error('Error updating auto-approve mode:', error);
    return NextResponse.json(
      { error: 'Failed to update auto-approve mode' },
      { status: 500 }
    );
  }
}

