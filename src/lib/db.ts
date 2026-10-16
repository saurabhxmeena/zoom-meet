import mongoose from 'mongoose';
import { inMemoryStore } from './store';
import { UserModel, IUserDocument } from './models/User';
import { MeetingModel, IMeetingDocument } from './models/Meeting';
import { MessageModel, IMessageDocument } from './models/Message';
import { ParticipantModel, IParticipantDocument } from './models/Participant';
import { IUser, IMeeting, IMessage, IParticipant } from './types';

const MONGODB_URI = process.env.MONGODB_URI;

let isConnected = false;

export async function connectDB(): Promise<boolean> {
  if (!MONGODB_URI) {
    return false;
  }
  if (isConnected) {
    return true;
  }
  try {
    await mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 4000,
    });
    isConnected = true;
    console.log('[MongoDB] Connected successfully');
    return true;
  } catch (err) {
    console.warn('[MongoDB] Connection failed, using in-memory store fallback:', (err as Error).message);
    return false;
  }
}

// ================= USER OPERATIONS =================
export async function findUserByEmail(email: string): Promise<IUser | null> {
  const dbReady = await connectDB();
  if (dbReady) {
    const user: any = await UserModel.findOne({ email: email.toLowerCase().trim() }).lean();
    if (user && !Array.isArray(user)) {
      return {
        _id: String(user._id),
        displayName: user.displayName,
        email: user.email,
        passwordHash: user.passwordHash,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      };
    }
    return null;
  }
  const match = inMemoryStore.users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
  return match || null;
}

export async function findUserById(id: string): Promise<IUser | null> {
  const dbReady = await connectDB();
  if (dbReady) {
    const user: any = await UserModel.findById(id).lean();
    if (user && !Array.isArray(user)) {
      return {
        _id: String(user._id),
        displayName: user.displayName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      };
    }
    return null;
  }
  const match = inMemoryStore.users.find((u) => u._id === id);
  return match || null;
}

export async function createUser(data: { displayName: string; email: string; passwordHash: string; avatarUrl?: string }): Promise<IUser> {
  const dbReady = await connectDB();
  if (dbReady) {
    const user = await UserModel.create({
      displayName: data.displayName,
      email: data.email.toLowerCase().trim(),
      passwordHash: data.passwordHash,
      avatarUrl: data.avatarUrl || '',
    });
    return {
      _id: String(user._id),
      displayName: user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    };
  }

  const newUser: IUser = {
    _id: 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    displayName: data.displayName,
    email: data.email.toLowerCase().trim(),
    passwordHash: data.passwordHash,
    avatarUrl: data.avatarUrl || '',
    createdAt: new Date().toISOString(),
  };
  inMemoryStore.users.push(newUser);
  return newUser;
}

// ================= MEETING OPERATIONS =================
export async function createMeeting(data: {
  title: string;
  hostUserId: string;
  hostName: string;
  passcode?: string;
  scheduledFor?: string | Date | null;
  status?: 'active' | 'ended' | 'scheduled';
  settings?: Partial<IMeeting['settings']>;
}): Promise<IMeeting> {
  // Generate a Zoom-style code e.g. "849-204-918"
  const generateMeetingCode = () => {
    const p1 = Math.floor(100 + Math.random() * 900);
    const p2 = Math.floor(100 + Math.random() * 900);
    const p3 = Math.floor(100 + Math.random() * 900);
    return `${p1}-${p2}-${p3}`;
  };

  const code = generateMeetingCode();
  const dbReady = await connectDB();

  const defaultSettings = {
    allowScreenShare: true,
    muteOnEntry: false,
    chatEnabled: true,
    requirePasscode: !!data.passcode,
    ...data.settings,
  };

  const scheduledDate = data.scheduledFor ? new Date(data.scheduledFor) : null;
  const initialStatus: 'active' | 'ended' | 'scheduled' =
    data.status || (scheduledDate && scheduledDate.getTime() > Date.now() ? 'scheduled' : 'active');

  if (dbReady) {
    const meet = await MeetingModel.create({
      meetingCode: code,
      title: data.title || 'Zoom Cloud Meeting',
      hostUserId: data.hostUserId,
      hostName: data.hostName,
      passcode: data.passcode || '',
      status: initialStatus,
      scheduledFor: scheduledDate,
      settings: defaultSettings,
    });
    return {
      _id: String(meet._id),
      meetingCode: meet.meetingCode,
      title: meet.title,
      hostUserId: meet.hostUserId,
      hostName: meet.hostName,
      passcode: meet.passcode,
      status: meet.status as 'active' | 'ended' | 'scheduled',
      scheduledFor: meet.scheduledFor ? new Date(meet.scheduledFor).toISOString() : null,
      settings: meet.settings,
      createdAt: meet.createdAt,
      endedAt: meet.endedAt,
    };
  }

  const newMeeting: IMeeting = {
    _id: 'meet_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    meetingCode: code,
    title: data.title || 'Zoom Cloud Meeting',
    hostUserId: data.hostUserId,
    hostName: data.hostName,
    passcode: data.passcode || '',
    status: initialStatus,
    scheduledFor: scheduledDate ? scheduledDate.toISOString() : null,
    settings: defaultSettings,
    createdAt: new Date().toISOString(),
    endedAt: null,
  };
  inMemoryStore.meetings.unshift(newMeeting);
  return newMeeting;
}

export async function findMeetingByCode(code: string): Promise<IMeeting | null> {
  const cleanCode = code.trim().toLowerCase();
  const dbReady = await connectDB();

  if (dbReady) {
    const meet: any = await MeetingModel.findOne({
      $or: [
        { meetingCode: cleanCode },
        { meetingCode: code.trim() },
        { meetingCode: cleanCode.replace(/[^a-zA-Z0-9]/g, '') },
      ],
    }).lean();

    if (meet && !Array.isArray(meet)) {
      return {
        _id: String(meet._id),
        meetingCode: meet.meetingCode,
        title: meet.title,
        hostUserId: meet.hostUserId,
        hostName: meet.hostName,
        passcode: meet.passcode,
        status: meet.status as 'active' | 'ended' | 'scheduled',
        scheduledFor: meet.scheduledFor ? new Date(meet.scheduledFor).toISOString() : null,
        settings: meet.settings,
        createdAt: meet.createdAt,
        endedAt: meet.endedAt,
      };
    }
  }

  const match = inMemoryStore.meetings.find(
    (m) =>
      m.meetingCode.toLowerCase() === cleanCode ||
      m.meetingCode.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === cleanCode.replace(/[^a-zA-Z0-9]/g, '')
  );
  return match || null;
}

export async function listMeetingsByUser(userId: string): Promise<IMeeting[]> {
  const dbReady = await connectDB();
  if (dbReady) {
    const list: any[] = await MeetingModel.find({ hostUserId: userId }).sort({ createdAt: -1 }).limit(20).lean();
    return list.map((m) => ({
      _id: String(m._id),
      meetingCode: m.meetingCode,
      title: m.title,
      hostUserId: m.hostUserId,
      hostName: m.hostName,
      passcode: m.passcode,
      status: m.status as 'active' | 'ended' | 'scheduled',
      scheduledFor: m.scheduledFor ? new Date(m.scheduledFor).toISOString() : null,
      settings: m.settings,
      createdAt: m.createdAt,
      endedAt: m.endedAt,
    }));
  }
  return inMemoryStore.meetings.filter((m) => m.hostUserId === userId);
}

export async function updateMeetingStatus(code: string, status: 'active' | 'ended'): Promise<IMeeting | null> {
  const dbReady = await connectDB();
  const endedAt = status === 'ended' ? new Date() : null;

  if (dbReady) {
    const meet: any = await MeetingModel.findOneAndUpdate(
      { meetingCode: code },
      { status, endedAt },
      { new: true }
    ).lean();
    if (meet && !Array.isArray(meet)) {
      return {
        _id: String(meet._id),
        meetingCode: meet.meetingCode,
        title: meet.title,
        hostUserId: meet.hostUserId,
        hostName: meet.hostName,
        passcode: meet.passcode,
        status: meet.status as 'active' | 'ended',
        settings: meet.settings,
        createdAt: meet.createdAt,
        endedAt: meet.endedAt,
      };
    }
  }

  const meet = inMemoryStore.meetings.find((m) => m.meetingCode === code);
  if (meet) {
    meet.status = status;
    meet.endedAt = endedAt ? endedAt.toISOString() : null;
    return meet;
  }
  return null;
}

// ================= MESSAGE OPERATIONS =================
export async function addMessage(data: {
  meetingId: string;
  senderUserId: string;
  senderSessionId?: string;
  senderName: string;
  text: string;
}): Promise<IMessage> {
  const dbReady = await connectDB();
  if (dbReady) {
    const msg = await MessageModel.create({
      meetingId: data.meetingId,
      senderUserId: data.senderUserId,
      senderSessionId: data.senderSessionId || '',
      senderName: data.senderName,
      text: data.text,
      reactions: {},
    });
    return {
      _id: String(msg._id),
      meetingId: msg.meetingId,
      senderUserId: msg.senderUserId,
      senderSessionId: msg.senderSessionId,
      senderName: msg.senderName,
      text: msg.text,
      reactions: msg.reactions || {},
      createdAt: msg.createdAt,
    };
  }

  const newMsg: IMessage = {
    _id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    meetingId: data.meetingId,
    senderUserId: data.senderUserId,
    senderSessionId: data.senderSessionId,
    senderName: data.senderName,
    text: data.text,
    reactions: {},
    createdAt: new Date().toISOString(),
  };
  inMemoryStore.messages.push(newMsg);
  return newMsg;
}

export async function getMessagesByMeeting(meetingId: string): Promise<IMessage[]> {
  const dbReady = await connectDB();
  if (dbReady) {
    const list: any[] = await MessageModel.find({ meetingId }).sort({ createdAt: 1 }).limit(100).lean();
    return list.map((m) => ({
      _id: String(m._id),
      meetingId: m.meetingId,
      senderUserId: m.senderUserId,
      senderSessionId: m.senderSessionId || '',
      senderName: m.senderName,
      text: m.text,
      reactions: m.reactions || {},
      createdAt: m.createdAt,
    }));
  }
  return inMemoryStore.messages.filter((m) => m.meetingId === meetingId);
}

// ================= PARTICIPANT / ATTENDANCE OPERATIONS =================
export async function recordParticipantJoin(data: {
  meetingId: string;
  userId: string;
  displayName: string;
  role: 'host' | 'participant';
}): Promise<IParticipant> {
  const dbReady = await connectDB();
  if (dbReady) {
    const part = await ParticipantModel.create({
      meetingId: data.meetingId,
      userId: data.userId,
      displayName: data.displayName,
      role: data.role,
    });
    return {
      _id: String(part._id),
      meetingId: part.meetingId,
      userId: part.userId,
      displayName: part.displayName,
      role: part.role as 'host' | 'participant',
      joinedAt: part.joinedAt,
      leftAt: part.leftAt,
    };
  }

  const newPart: IParticipant = {
    _id: 'part_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    meetingId: data.meetingId,
    userId: data.userId,
    displayName: data.displayName,
    role: data.role,
    joinedAt: new Date().toISOString(),
    leftAt: null,
  };
  inMemoryStore.participants.push(newPart);
  return newPart;
}

export async function recordParticipantLeave(meetingId: string, userId: string): Promise<void> {
  const dbReady = await connectDB();
  if (dbReady) {
    await ParticipantModel.updateMany(
      { meetingId, userId, leftAt: null },
      { leftAt: new Date() }
    );
    return;
  }
  const active = inMemoryStore.participants.filter(
    (p) => p.meetingId === meetingId && p.userId === userId && !p.leftAt
  );
  active.forEach((p) => {
    p.leftAt = new Date().toISOString();
  });
}

export async function getMeetingParticipants(meetingId: string): Promise<IParticipant[]> {
  const dbReady = await connectDB();
  if (dbReady) {
    const list: any[] = await ParticipantModel.find({ meetingId }).sort({ joinedAt: -1 }).lean();
    return list.map((p) => ({
      _id: String(p._id),
      meetingId: p.meetingId,
      userId: p.userId,
      displayName: p.displayName,
      role: p.role as 'host' | 'participant',
      joinedAt: p.joinedAt,
      leftAt: p.leftAt,
    }));
  }
  return inMemoryStore.participants.filter((p) => p.meetingId === meetingId);
}
