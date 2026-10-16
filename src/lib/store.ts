import { IUser, IMeeting, IMessage, IParticipant } from './types';
import bcrypt from 'bcryptjs';

// Pre-seeded users for instant academic evaluation & demo
const defaultUsers: IUser[] = [
  {
    _id: 'user_1',
    displayName: 'Aarav Sharma (Host)',
    email: 'demo@mait.ac.in',
    passwordHash: bcrypt.hashSync('password123', 10),
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'user_2',
    displayName: 'Priya Verma',
    email: 'student@ipu.ac.in',
    passwordHash: bcrypt.hashSync('password123', 10),
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    createdAt: new Date().toISOString(),
  },
];

// Pre-seeded meetings
const defaultMeetings: IMeeting[] = [
  {
    _id: 'meet_default_1',
    meetingCode: '784-920-315',
    title: '7th Sem Minor Project Evaluation - IT Dept',
    hostUserId: 'user_1',
    hostName: 'Aarav Sharma (Host)',
    passcode: 'mait2026',
    status: 'active',
    settings: {
      allowScreenShare: true,
      muteOnEntry: false,
      chatEnabled: true,
      requirePasscode: false,
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    endedAt: null,
  },
];

// Global in-memory storage singleton for serverless execution
declare global {
  // eslint-disable-next-line no-var
  var __zoomStore: {
    users: IUser[];
    meetings: IMeeting[];
    messages: IMessage[];
    participants: IParticipant[];
    signals: Map<string, Array<{ from: string; to: string; type: string; payload: unknown; timestamp: number }>>;
  } | undefined;
}

if (!global.__zoomStore) {
  global.__zoomStore = {
    users: [...defaultUsers],
    meetings: [...defaultMeetings],
    messages: [],
    participants: [],
    signals: new Map(),
  };
}

export const inMemoryStore = global.__zoomStore;
