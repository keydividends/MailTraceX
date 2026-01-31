// Mongoose schema for Email
import { Schema, model } from 'mongoose';

const EmailSchema = new Schema({
  subject: String,
  body: String,
  senderId: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

export default model('Email', EmailSchema);
