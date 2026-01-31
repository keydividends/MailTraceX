// Mongoose schema for Email
import { Schema, model } from 'mongoose';

const RecipientSchema = new Schema({
  email: { type: String, required: true },
  token: { type: String, required: true, index: true }
});

const EmailSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, default: '' },
  body: { type: String, default: '' },
  pixelUrl: { type: String, default: '' },
  links: { type: [String], default: [] },
  recipients: { type: [RecipientSchema], default: [] },
  createdAt: { type: Date, default: Date.now }
});

export default model('Email', EmailSchema);
