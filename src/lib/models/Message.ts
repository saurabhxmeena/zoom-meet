import mongoose, { Schema, Document } from 'mongoose';

export interface IMessageDocument extends Document {
  meetingId: string;
  senderUserId: string;
  senderName: string;
  text: string;
  createdAt: Date;
}

const MessageSchema = new Schema<IMessageDocument>(
  {
    meetingId: { type: String, required: true, index: true },
    senderUserId: { type: String, required: true },
    senderName: { type: String, required: true },
    text: { type: String, required: true, maxlength: 1000 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const MessageModel = mongoose.models.Message || mongoose.model<IMessageDocument>('Message', MessageSchema);
