// jwt utility helpers

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

export function sign(payload: object, opts?: any) {
  return jwt.sign(payload as any, JWT_SECRET, opts);
}

export function verify(token: string) {
  return jwt.verify(token, JWT_SECRET);
}

export default { sign, verify };
