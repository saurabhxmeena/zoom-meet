import { NextRequest, NextResponse } from 'next/server';
import { createMeeting, listMeetingsByUser } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // If authenticated, use user's identity; otherwise guest/host can provide hostName
    const hostUserId = payload ? payload.userId : body.hostUserId || 'guest_' + Math.random().toString(36).substring(2, 8);
    const hostName = payload ? payload.displayName : body.hostName || 'Meeting Host';

    let scheduledDate: Date | null = null;
    if (body.scheduledFor) {
      scheduledDate = new Date(body.scheduledFor);
      if (isNaN(scheduledDate.getTime())) {
        return NextResponse.json({ error: 'Invalid scheduled date and time format' }, { status: 400 });
      }
      // Allow 2-minute leeway for clock differences/form submission delay
      if (scheduledDate.getTime() < Date.now() - 120000) {
        return NextResponse.json({ error: 'Scheduled meeting time must be in the future' }, { status: 400 });
      }
    }

    const meeting = await createMeeting({
      title: body.title || 'Zoom Cloud Meeting',
      hostUserId,
      hostName,
      passcode: body.passcode || '',
      scheduledFor: scheduledDate ? scheduledDate.toISOString() : null,
      settings: body.settings || {},
    });

    return NextResponse.json({ meeting }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to create meeting: ' + (err as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);
    const userId = payload ? payload.userId : 'user_1'; // fallback to default demo user

    const meetings = await listMeetingsByUser(userId);
    return NextResponse.json({ meetings });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
