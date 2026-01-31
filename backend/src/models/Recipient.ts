// Mongoose schema for Recipient
import { Schema, model } from 'mongoose';

const RecipientSchema = new Schema({
  email: String,
  name: String,
  emailId: { type: Schema.Types.ObjectId, ref: 'Email' }
});

export default model('Recipient', RecipientSchema);
