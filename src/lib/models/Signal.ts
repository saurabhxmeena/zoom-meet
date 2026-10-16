import mongoose, { Schema, Document } from 'mongoose';

export interface ISignalDocument extends Document {
  meetingCode: string;
  from: string;
  to: string;
  type: string;
  payload: any;
  createdAt: Date;
}

const SignalSchema = new Schema<ISignalDocument>(
  {
    meetingCode: { type: String, required: true, index: true },
    from: { type: String, required: true },
    to: { type: String, default: 'all' },
    type: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now, expires: 120 }, // 120s TTL auto-cleanup
  },
  { timestamps: false }
);

export const SignalModel =
  mongoose.models.Signal || mongoose.model<ISignalDocument>('Signal', SignalSchema);
