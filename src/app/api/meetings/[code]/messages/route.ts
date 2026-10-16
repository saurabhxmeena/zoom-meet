import { NextRequest, NextResponse } from 'next/server';
import { findMeetingByCode, addMessage, getMessagesByMeeting } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const meeting = await findMeetingByCode(code);
    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    const messages = await getMessagesByMeeting(meeting._id);
    return NextResponse.json({ messages });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await req.json();
    const { text, senderName, senderUserId } = body;

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    if (text.length > 1000) {
      return NextResponse.json({ error: 'Message exceeds maximum length of 1000 characters' }, { status: 400 });
    }

    const meeting = await findMeetingByCode(code);
    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    if (meeting.status === 'ended') {
      return NextResponse.json({ error: 'Meeting has ended. Chat is closed.' }, { status: 410 });
    }

    const payload = getUserFromRequest(req);
    const resolvedUserId = senderUserId || (payload ? payload.userId : 'guest_user');
    const resolvedName = (senderName && senderName.trim()) || (payload ? payload.displayName : 'Participant');

    const message = await addMessage({
      meetingId: meeting._id,
      senderUserId: resolvedUserId,
      senderName: resolvedName,
      text: text.trim(),
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
