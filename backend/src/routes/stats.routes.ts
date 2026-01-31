import { Router } from 'express';
import authMiddleware from '../middleware/auth.middleware';
import statsController from '../controllers/statsController';

const router = Router();

router.get('/summary', authMiddleware, statsController.getSummary);
router.get('/emails', authMiddleware, statsController.getEmails);
router.get('/email/:id/recipients', authMiddleware, statsController.getRecipients);

export default router;
