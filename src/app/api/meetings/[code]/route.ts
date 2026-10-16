import { NextRequest, NextResponse } from 'next/server';
import { findMeetingByCode, updateMeetingStatus } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    if (!code) {
      return NextResponse.json({ error: 'Meeting code is required' }, { status: 400 });
    }

    const meeting = await findMeetingByCode(code);
    if (!meeting) {
      return NextResponse.json(
        { error: 'Meeting not found. Please verify the meeting ID.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ meeting });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await req.json();
    const { status, hostUserId } = body;

    const meeting = await findMeetingByCode(code);
    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // FR-07: Server-side validation of host privileges
    const payload = getUserFromRequest(req);
    const requestingUserId = payload ? payload.userId : hostUserId;

    if (requestingUserId && meeting.hostUserId && requestingUserId !== meeting.hostUserId) {
      return NextResponse.json(
        { error: 'Forbidden: Only the meeting host can perform this action.' },
        { status: 403 }
      );
    }

    if (status === 'ended' || status === 'active') {
      const updated = await updateMeetingStatus(meeting.meetingCode, status);
      return NextResponse.json({ meeting: updated });
    }

    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
