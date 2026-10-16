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

    const meeting = await createMeeting({
      title: body.title || 'Zoom Cloud Meeting',
      hostUserId,
      hostName,
      passcode: body.passcode || '',
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
