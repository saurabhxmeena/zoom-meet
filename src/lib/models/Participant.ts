import mongoose, { Schema, Document } from 'mongoose';

export interface IParticipantDocument extends Document {
  meetingId: string;
  userId: string;
  displayName: string;
  role: 'host' | 'participant';
  joinedAt: Date;
  leftAt?: Date | null;
}

const ParticipantSchema = new Schema<IParticipantDocument>(
  {
    meetingId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    displayName: { type: String, required: true },
    role: { type: String, enum: ['host', 'participant'], default: 'participant' },
    leftAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'joinedAt', updatedAt: false } }
);

export const ParticipantModel = mongoose.models.Participant || mongoose.model<IParticipantDocument>('Participant', ParticipantSchema);
