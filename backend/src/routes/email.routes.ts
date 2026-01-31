// Email creation and management routes

import { Router, Request, Response } from 'express';
import auth from '../middleware/auth.middleware';
import { createEmail } from '../controllers/emailController';

const router = Router();

// Protected: create an email record
router.post('/', auth, createEmail);

// Optionally list emails (not implemented)
router.get('/', (req: Request, res: Response) => res.status(501).json({ message: 'Not implemented' }));

export default router;
