import { Router, Request, Response } from 'express';
import OpenEvent from '../models/OpenEvent';
import ClickEvent from '../models/ClickEvent';

const router = Router();

// 1x1 transparent PNG (base64)
const TRANSPARENT_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
const PNG_BUFFER = Buffer.from(TRANSPARENT_PNG_BASE64, 'base64');

router.get('/pixel/:emailId/:recipientToken.png', async (req: Request, res: Response) => {
  try {
    const { emailId, recipientToken } = req.params;
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip || '';
    const userAgent = String(req.headers['user-agent'] || '');

    // Record open event in global collection and associate recipientToken
    try {
      await OpenEvent.create({ emailId, recipientToken, ip, userAgent });
    } catch (e) {
      console.error('Failed to record open event', e);
    }

    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    return res.status(200).send(PNG_BUFFER);
  } catch (err) {
    console.error('pixel handler error', err);
    // still return a pixel to callers
    res.set('Content-Type', 'image/png');
    return res.status(200).send(PNG_BUFFER);
  }
});

router.get('/click/:emailId/:recipientToken/:encodedUrl', async (req: Request, res: Response) => {
  try {
    const { emailId, recipientToken, encodedUrl } = req.params;

    // Try URL decoding (URI component) first, fall back to base64 decoding
    let url = '';
    try {
      url = decodeURIComponent(encodedUrl);
    } catch (e) {
      try {
        url = Buffer.from(encodedUrl, 'base64').toString('utf8');
      } catch (e2) {
        url = '/';
      }
    }

    // Ensure URL has a protocol; if not, default to http
    if (!/^https?:\/\//i.test(url)) {
      url = 'http://' + url;
    }

    const ip = (req.headers['x-forwarded-for'] as string) || req.ip || '';
    const userAgent = String(req.headers['user-agent'] || '');

    try {
      await ClickEvent.create({ emailId, recipientToken, ip, userAgent, url });
    } catch (e) {
      console.error('Failed to record click event', e);
    }

    return res.redirect(url);
  } catch (err) {
    console.error('click handler error', err);
    return res.redirect('/');
  }
});

export default router;
