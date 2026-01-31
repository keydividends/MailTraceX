// Mongoose schema for ClickEvent
import { Schema, model } from 'mongoose';

const ClickEventSchema = new Schema({
  emailId: { type: Schema.Types.ObjectId, ref: 'Email' },
  recipientId: { type: Schema.Types.ObjectId, ref: 'Recipient' },
  url: String,
  ip: String,
  userAgent: String,
  geo: Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now }
});

export default model('ClickEvent', ClickEventSchema);
