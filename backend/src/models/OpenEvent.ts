// Mongoose schema for OpenEvent
import { Schema, model } from 'mongoose';

const OpenEventSchema = new Schema({
  emailId: { type: Schema.Types.ObjectId, ref: 'Email' },
  recipientId: { type: Schema.Types.ObjectId, ref: 'Recipient' },
  ip: String,
  userAgent: String,
  geo: Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now }
});

export default model('OpenEvent', OpenEventSchema);
