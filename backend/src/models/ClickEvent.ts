import mongoose, { Document, Schema } from 'mongoose';

export interface IClickEvent extends Document {
  emailId: mongoose.Types.ObjectId | string;
  timestamp: Date;
  ip?: string;
  userAgent?: string;
  url: string;
  recipientToken?: string;
}

const ClickEventSchema = new Schema<IClickEvent>({
  emailId: { type: Schema.Types.ObjectId, ref: 'Email', required: true },
  timestamp: { type: Date, default: Date.now },
  ip: { type: String },
  userAgent: { type: String },
  url: { type: String, required: true },
  recipientToken: { type: String, index: true }
});

export default mongoose.model<IClickEvent>('ClickEvent', ClickEventSchema);
