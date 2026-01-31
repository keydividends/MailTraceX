// Mongoose schema for TrackingLink (redirect mapping)
import { Schema, model } from 'mongoose';

const TrackingLinkSchema = new Schema({
  emailId: { type: Schema.Types.ObjectId, ref: 'Email' },
  originalUrl: String,
  shortId: String,
  createdAt: { type: Date, default: Date.now }
});

export default model('TrackingLink', TrackingLinkSchema);
