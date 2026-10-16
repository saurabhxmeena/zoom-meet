import mongoose, { Schema, Document } from 'mongoose';

export interface IUserDocument extends Document {
  displayName: string;
  email: string;
  passwordHash: string;
  avatarUrl?: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    displayName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    avatarUrl: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const UserModel = mongoose.models.User || mongoose.model<IUserDocument>('User', UserSchema);
