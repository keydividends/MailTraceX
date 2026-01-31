import mongoose, { Document } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IUser extends Document {
  email: string;
  password: string;
  createdAt: Date;
  comparePassword: (candidate: string) => Promise<boolean>;
}

const UserSchema = new mongoose.Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Hash password before saving when it's new or modified
UserSchema.pre('save', async function (next) {
  try {
    const user = this as IUser & mongoose.Document;
    // `isModified` may not be typed on IUser, use any-cast
    if (!(this as any).isModified || !(this as any).isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
    return next();
  } catch (err) {
    return next(err as any);
  }
});

// Instance method to compare a candidate password
UserSchema.methods.comparePassword = function (candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

const User = mongoose.model<IUser>('User', UserSchema);
export default User;
