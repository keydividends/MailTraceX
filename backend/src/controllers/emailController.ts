import { Request, Response } from 'express';
import crypto from 'crypto';
import Email from '../models/Email';
import type { AuthRequest } from '../middleware/auth.middleware';

export async function createEmail(req: Request, res: Response) {
  try {
    const aReq = req as AuthRequest;
    const body = req.body || {};

    const userId = aReq.userId || body.userId;
    const subject = body.subject || '';
    // support both `body` and `bodyHtml` from clients
    const emailBody = body.bodyHtml || body.body || '';
    // recipients can be an array of strings (emails) or objects
    const rawRecipients = body.recipients ?? body.to ?? [];
    const recipientEmails = Array.isArray(rawRecipients)
      ? rawRecipients.map((r: any) => (typeof r === 'string' ? r : r.email))
      : typeof rawRecipients === 'string'
      ? [rawRecipients]
      : [];

    if (!userId) return res.status(400).json({ ok: false, message: 'userId is required' });

    // generate recipient entries with tokens
    const recipients = recipientEmails.map((email: string) => ({
      email,
      token: crypto.randomBytes(16).toString('hex')
    }));

    const links = Array.isArray(body.links) ? body.links : [];

    const emailDoc = await Email.create({
      userId,
      subject,
      body: emailBody,
      pixelUrl: body.pixelUrl || '',
      links,
      recipients,
    });

    return res.json({ ok: true, emailId: emailDoc._id, recipients: emailDoc.recipients });
  } catch (err: any) {
    console.error('createEmail error', err);
    return res.status(500).json({ ok: false, message: 'Internal server error' });
  }
}

export default { createEmail };
