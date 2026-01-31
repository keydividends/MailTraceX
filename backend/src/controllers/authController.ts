import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import env from '../config/env';
import User from '../models/User';

function signToken(userId: string) {
  const payload = { sub: userId };
  const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '1h' });
  return token;
}

export async function register(req: Request, res: Response) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ ok: false, message: 'Email and password are required' });
console.log('Register attempt for', email);
console.log('Register attempt for', password);
    const existing = await User.findOne({ email: email.toLowerCase().trim() }).exec();
    if (existing) return res.status(409).json({ ok: false, message: 'Email already registered' });

    const user = new User({ email: email.toLowerCase().trim(), password });
    await user.save();

    const token = signToken(user._id.toString());
    const userObj = user.toObject();
    delete (userObj as any).password;

    return res.json({ ok: true, token, user: userObj });
  } catch (err: any) {
    console.error('Register error', err);
    return res.status(500).json({ ok: false, message: 'Internal server error' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ ok: false, message: 'Email and password are required' });
    console.log('Login attempt for', email);
    console.log('Login attempt for', password);

    const user = await User.findOne({ email: email.toLowerCase().trim() }).exec();
    console.log('Login user', user);
    if (!user) return res.status(401).json({ ok: false, message: 'Invalid email or password' });

   // const valid = await user.comparePassword(password);
   // if (!valid) return res.status(401).json({ ok: false, message: 'Invalid email or password' });

    const token = signToken(user._id.toString());
    const userObj = user.toObject();
    delete (userObj as any).password;

    return res.json({ ok: true, token, user: userObj });
  } catch (err: any) {
    console.error('Login error', err);
    return res.status(500).json({ ok: false, message: 'Internal server error' });
  }
}

export async function refreshToken(req: Request, res: Response) {
  try {
    // Support token in body or Authorization header
    const token = req.body?.token || (req.headers.authorization ? String(req.headers.authorization).replace(/^Bearer\s+/i, '') : null);
    if (!token) return res.status(400).json({ ok: false, message: 'Token required' });

    try {
      const decoded: any = jwt.verify(token, env.JWT_SECRET);
      const userId = decoded && decoded.sub;
      if (!userId) return res.status(401).json({ ok: false, message: 'Invalid token' });

      const newToken = signToken(userId);
      return res.json({ ok: true, token: newToken });
    } catch (e) {
      return res.status(401).json({ ok: false, message: 'Invalid or expired token' });
    }
  } catch (err: any) {
    console.error('Refresh token error', err);
    return res.status(500).json({ ok: false, message: 'Internal server error' });
  }
}
