// Mongoose schema for User
import { Schema, model } from 'mongoose';

const UserSchema = new Schema({
  email: { type: String, required: true, unique: true },
  name: String,
  passwordHash: String,
  createdAt: { type: Date, default: Date.now }
});

export default model('User', UserSchema);
