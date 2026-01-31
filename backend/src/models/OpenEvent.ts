import mongoose, { Document, Schema } from 'mongoose';

export interface IOpenEvent extends Document {
  emailId: mongoose.Types.ObjectId | string;
  timestamp: Date;
  ip?: string;
  userAgent?: string;
  recipientToken?: string;
}

const OpenEventSchema = new Schema<IOpenEvent>({
  emailId: { type: Schema.Types.ObjectId, ref: 'Email', required: true },
  timestamp: { type: Date, default: Date.now },
  ip: { type: String },
  userAgent: { type: String },
  recipientToken: { type: String, index: true }
});

export default mongoose.model<IOpenEvent>('OpenEvent', OpenEventSchema);
