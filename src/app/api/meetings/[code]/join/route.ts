import { NextRequest, NextResponse } from 'next/server';
import { findMeetingByCode, recordParticipantJoin, recordParticipantLeave, getMeetingParticipants } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await req.json().catch(() => ({}));
    const { displayName, passcode, userId } = body;

    const meeting = await findMeetingByCode(code);
    if (!meeting) {
      return NextResponse.json({ error: 'Meeting does not exist' }, { status: 404 });
    }

    if (meeting.status === 'ended') {
      return NextResponse.json(
        { error: 'This meeting has ended and is no longer accepting participants.' },
        { status: 410 }
      );
    }

    // Check passcode if required
    if (meeting.settings.requirePasscode && meeting.passcode) {
      if (!passcode || passcode.trim() !== meeting.passcode.trim()) {
        return NextResponse.json(
          { error: 'Incorrect meeting passcode.' },
          { status: 401 }
        );
      }
    }

    const payload = getUserFromRequest(req);
    const resolvedUserId = payload ? payload.userId : userId || 'guest_' + Math.random().toString(36).substring(2, 9);
    const resolvedDisplayName = payload ? payload.displayName : displayName || 'Guest Participant';
    const isHost = resolvedUserId === meeting.hostUserId;

    const participant = await recordParticipantJoin({
      meetingId: meeting._id,
      userId: resolvedUserId,
      displayName: resolvedDisplayName,
      role: isHost ? 'host' : 'participant',
    });

    const activeParticipants = await getMeetingParticipants(meeting._id);

    return NextResponse.json({
      success: true,
      meeting,
      participant,
      participants: activeParticipants,
      isHost,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    const meeting = await findMeetingByCode(code);
    if (!meeting || !userId) {
      return NextResponse.json({ success: false });
    }

    await recordParticipantLeave(meeting._id, userId);
    return NextResponse.json({ success: true, message: 'Participant departed' });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
