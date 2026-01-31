// Email creation and management routes

import { Router, Request, Response } from 'express';
const router = Router();

router.post('/', (req: Request, res: Response) => res.status(501).json({ message: 'Not implemented' }));
router.get('/', (req: Request, res: Response) => res.status(501).json({ message: 'Not implemented' }));

export default router;
