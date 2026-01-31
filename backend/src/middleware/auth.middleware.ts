import { Request, Response, NextFunction } from 'express';
import { verify } from '../utils/jwt';

export interface AuthRequest extends Request {
  userId?: string;
}

export default function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ ok: false, message: 'Unauthorized' });

  const token = auth.slice('Bearer '.length).trim();
  try {
    const payload: any = verify(token);
    // support JWT that sets user id in `sub` or `userId`
    const userId = payload?.sub || payload?.userId;
    if (!payload || !userId) return res.status(401).json({ ok: false, message: 'Invalid token' });
    req.userId = userId;
    return next();
  } catch (err) {
    console.error('authMiddleware verify error', err);
    return res.status(401).json({ ok: false, message: 'Invalid token' });
  }
}
