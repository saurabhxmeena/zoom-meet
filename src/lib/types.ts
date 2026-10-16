export interface IUser {
  _id: string;
  displayName: string;
  email: string;
  passwordHash?: string;
  avatarUrl?: string;
  createdAt: string | Date;
}

export interface IMeetingSettings {
  allowScreenShare: boolean;
  muteOnEntry: boolean;
  chatEnabled: boolean;
  requirePasscode: boolean;
}

export interface IMeeting {
  _id: string;
  meetingCode: string; // e.g. "abc-defg-hij" or "849204918"
  title: string;
  hostUserId: string;
  hostName: string;
  passcode?: string;
  status: 'active' | 'ended';
  settings: IMeetingSettings;
  createdAt: string | Date;
  endedAt?: string | Date | null;
}

export interface IMessage {
  _id: string;
  meetingId: string;
  senderUserId: string;
  senderName: string;
  text: string;
  reactions?: Record<string, string[]>; // emoji -> array of sender displayNames
  createdAt: string | Date;
}

export interface IParticipant {
  _id: string;
  meetingId: string;
  userId: string;
  displayName: string;
  role: 'host' | 'participant';
  joinedAt: string | Date;
  leftAt?: string | Date | null;
}

export interface IPeerConnection {
  peerId: string;
  userId: string;
  displayName: string;
  stream?: MediaStream;
  isAudioMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  isSpeaking?: boolean;
}

export interface IReaction {
  id: string;
  emoji: string;
  senderName: string;
  createdAt: number;
}
