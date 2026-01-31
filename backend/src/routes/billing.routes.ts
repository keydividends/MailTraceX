// Billing endpoints (customer, subscription, invoices)
import { Router, Request, Response } from 'express';
const router = Router();

router.get('/status', (req: Request, res: Response) => res.status(501).json({ message: 'Not implemented' }));

export default router;
