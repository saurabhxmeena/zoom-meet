import mongoose, { Schema, Document } from 'mongoose';

export interface IMeetingDocument extends Document {
  meetingCode: string;
  title: string;
  hostUserId: string;
  hostName: string;
  passcode?: string;
  status: 'active' | 'ended';
  settings: {
    allowScreenShare: boolean;
    muteOnEntry: boolean;
    chatEnabled: boolean;
    requirePasscode: boolean;
  };
  createdAt: Date;
  endedAt?: Date | null;
}

const MeetingSchema = new Schema<IMeetingDocument>(
  {
    meetingCode: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, default: 'Zoom Cloud Meeting' },
    hostUserId: { type: String, required: true, index: true },
    hostName: { type: String, required: true },
    passcode: { type: String, default: '' },
    status: { type: String, enum: ['active', 'ended'], default: 'active' },
    settings: {
      allowScreenShare: { type: Boolean, default: true },
      muteOnEntry: { type: Boolean, default: false },
      chatEnabled: { type: Boolean, default: true },
      requirePasscode: { type: Boolean, default: false },
    },
    endedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export const MeetingModel = mongoose.models.Meeting || mongoose.model<IMeetingDocument>('Meeting', MeetingSchema);
