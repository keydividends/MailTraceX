import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Email from '../models/Email';
import OpenEvent from '../models/OpenEvent';
import ClickEvent from '../models/ClickEvent';
import type { AuthRequest } from '../middleware/auth.middleware';

export async function getSummary(req: Request, res: Response) {
  try {
    const aReq = req as AuthRequest;
    const userId = aReq.userId;
    if (!userId) return res.status(401).json({ ok: false, message: 'Unauthorized' });

    const emails = await Email.find({ userId }).select('_id').lean().exec();
    const emailIds = emails.map((e: any) => new mongoose.Types.ObjectId(e._id));

    if (emailIds.length === 0) return res.json({ ok: true, totalOpens: 0, totalClicks: 0 });

    const totalOpens = await OpenEvent.countDocuments({ emailId: { $in: emailIds } }).exec();
    const totalClicks = await ClickEvent.countDocuments({ emailId: { $in: emailIds } }).exec();

    return res.json({ ok: true, totalOpens: totalOpens || 0, totalClicks: totalClicks || 0 });
  } catch (err) {
    console.error('getSummary error', err);
    return res.status(500).json({ ok: false, message: 'Internal server error' });
  }
}

export async function getEmails(req: Request, res: Response) {
  try {
    const aReq = req as AuthRequest;
    const userId = aReq.userId;
    if (!userId) return res.status(401).json({ ok: false, message: 'Unauthorized' });

    const emails = await Email.find({ userId }).select('_id subject createdAt').lean().exec();
    if (!emails || emails.length === 0) return res.json({ ok: true, emails: [] });
    const emailIds = emails.map((e: any) => new mongoose.Types.ObjectId(e._id));

    const opensAgg = await OpenEvent.aggregate([
      { $match: { emailId: { $in: emailIds } } },
      { $group: { _id: '$emailId', totalOpens: { $sum: 1 }, lastOpen: { $max: '$timestamp' } } }
    ]).exec();

    const clicksAgg = await ClickEvent.aggregate([
      { $match: { emailId: { $in: emailIds } } },
      { $group: { _id: '$emailId', totalClicks: { $sum: 1 }, lastClick: { $max: '$timestamp' } } }
    ]).exec();

    const opensMap = new Map<string, { totalOpens: number; lastOpen?: Date }>();
    for (const o of opensAgg) opensMap.set(String(o._id), { totalOpens: o.totalOpens || 0, lastOpen: o.lastOpen });

    const clicksMap = new Map<string, { totalClicks: number; lastClick?: Date }>();
    for (const c of clicksAgg) clicksMap.set(String(c._id), { totalClicks: c.totalClicks || 0, lastClick: c.lastClick });

    const result = emails.map((e: any) => {
      const id = String(e._id);
      const o = opensMap.get(id) || { totalOpens: 0, lastOpen: null };
      const c = clicksMap.get(id) || { totalClicks: 0, lastClick: null };
      return {
        emailId: id,
        subject: e.subject || '',
        createdAt: e.createdAt,
        totalOpens: o.totalOpens || 0,
        totalClicks: c.totalClicks || 0,
        lastOpen: o.lastOpen || null,
        lastClick: c.lastClick || null
      };
    });

    return res.json({ ok: true, emails: result });
  } catch (err) {
    console.error('getEmails error', err);
    return res.status(500).json({ ok: false, message: 'Internal server error' });
  }
}

export async function getRecipients(req: Request, res: Response) {
  try {
    const aReq = req as AuthRequest;
    const userId = aReq.userId;
    if (!userId) return res.status(401).json({ ok: false, message: 'Unauthorized' });

    const emailId = req.params.id;
    if (!emailId) return res.status(400).json({ ok: false, message: 'email id required' });

    const email = await Email.findOne({ _id: emailId, userId }).select('recipients').lean().exec();
    if (!email) return res.status(404).json({ ok: false, message: 'Email not found' });

    const recipients = Array.isArray(email.recipients) ? email.recipients : [];

    // aggregate opens and clicks by recipientToken for this email
    const opensAgg = await OpenEvent.aggregate([
      { $match: { emailId: email._id } },
      { $group: { _id: '$recipientToken', totalOpens: { $sum: 1 }, lastOpen: { $max: '$timestamp' } } }
    ]).exec();

    const clicksAgg = await ClickEvent.aggregate([
      { $match: { emailId: email._id } },
      { $group: { _id: '$recipientToken', totalClicks: { $sum: 1 }, lastClick: { $max: '$timestamp' } } }
    ]).exec();

    const opensMap = new Map<string, { totalOpens: number; lastOpen?: Date }>();
    for (const o of opensAgg) opensMap.set(String(o._id), { totalOpens: o.totalOpens || 0, lastOpen: o.lastOpen });

    const clicksMap = new Map<string, { totalClicks: number; lastClick?: Date }>();
    for (const c of clicksAgg) clicksMap.set(String(c._id), { totalClicks: c.totalClicks || 0, lastClick: c.lastClick });

    const result = recipients.map((r: any) => {
      const token = String(r.token);
      const o = opensMap.get(token) || { totalOpens: 0, lastOpen: null };
      const c = clicksMap.get(token) || { totalClicks: 0, lastClick: null };
      return {
        email: r.email,
        token: token,
        totalOpens: o.totalOpens || 0,
        totalClicks: c.totalClicks || 0,
        lastOpen: o.lastOpen || null,
        lastClick: c.lastClick || null
      };
    });

    return res.json({ ok: true, recipients: result });
  } catch (err) {
    console.error('getRecipients error', err);
    return res.status(500).json({ ok: false, message: 'Internal server error' });
  }
}

export default { getSummary, getEmails, getRecipients };
