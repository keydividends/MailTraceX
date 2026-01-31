// Auth routes: register, login, refresh tokens
import { Router, Request, Response } from 'express';

const router = Router();

router.post('/register', (req: Request, res: Response) => {
  res.status(501).json({ message: 'Not implemented' });
});

router.post('/login', (req: Request, res: Response) => {
  res.status(501).json({ message: 'Not implemented' });
});

export default router;
