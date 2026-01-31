// MongoDB connection helper
import mongoose from 'mongoose';

export async function connectDb(uri: string) {
  return mongoose.connect(uri);
}

export default connectDb;
