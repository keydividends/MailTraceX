// Tracking endpoints for pixel and redirect links
import { Router, Request, Response } from 'express';
const router = Router();

router.get('/pixel/:id', (req: Request, res: Response) => {
  // return 1x1 transparent pixel placeholder
  res.set('Content-Type', 'image/gif');
  res.status(200).send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64'));
});

router.get('/r/:id', (req: Request, res: Response) => res.status(501).json({ message: 'Not implemented' }));

export default router;
