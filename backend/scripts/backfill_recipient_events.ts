/**
 * Migration script: backfill embedded recipient opens/clicks into OpenEvent and ClickEvent collections
 * Run with: `ts-node backend/scripts/backfill_recipient_events.ts` (from repo root)
 */
import connectDb from '../src/config/db';
import env from '../src/config/env';
import Email from '../src/models/Email';
import OpenEvent from '../src/models/OpenEvent';
import ClickEvent from '../src/models/ClickEvent';

async function main() {
  try {
    const mongoUri = env.MONGODB_URI || process.env.MONGODB_URI;
    if (!mongoUri) throw new Error('MONGODB_URI not set');
    await connectDb(mongoUri);
    console.log('Connected to MongoDB for backfill');

    // Find emails that still have embedded opens/clicks in recipients
    const emails = await Email.find({
      $or: [
        { 'recipients.opens.0': { $exists: true } },
        { 'recipients.clicks.0': { $exists: true } }
      ]
    }).lean().exec();

    if (!emails || emails.length === 0) {
      console.log('No embedded recipient events found. Nothing to backfill.');
      process.exit(0);
    }

    const openEvents: any[] = [];
    const clickEvents: any[] = [];

    for (const email of emails) {
      const emailId = email._id;
      if (!Array.isArray(email.recipients)) continue;
      for (const r of email.recipients) {
        const token = r && r.token;
        if (!token) continue;
        if (Array.isArray(r.opens)) {
          for (const o of r.opens) {
            openEvents.push({
              emailId,
              recipientToken: token,
              timestamp: o?.timestamp || new Date(),
              ip: o?.ip,
              userAgent: o?.userAgent
            });
          }
        }
        if (Array.isArray(r.clicks)) {
          for (const c of r.clicks) {
            clickEvents.push({
              emailId,
              recipientToken: token,
              timestamp: c?.timestamp || new Date(),
              ip: c?.ip,
              userAgent: c?.userAgent,
              url: c?.url || ''
            });
          }
        }
      }
    }

    if (openEvents.length) {
      console.log(`Inserting ${openEvents.length} OpenEvent documents...`);
      await OpenEvent.insertMany(openEvents, { ordered: false });
    }
    if (clickEvents.length) {
      console.log(`Inserting ${clickEvents.length} ClickEvent documents...`);
      await ClickEvent.insertMany(clickEvents, { ordered: false });
    }
    console.log('Backfill complete.');

    // Cleanup: remove embedded opens/clicks from recipients for the migrated emails
    try {
      const migratedEmailIds = emails.map((e: any) => e._id);
      if (migratedEmailIds.length) {
        console.log('Removing embedded opens/clicks from Email.recipients...');
        await Email.updateMany(
          { _id: { $in: migratedEmailIds } },
          { $unset: { 'recipients.$[].opens': '', 'recipients.$[].clicks': '' } }
        ).exec();
        console.log('Cleanup complete.');
      }
    } catch (cleanupErr) {
      console.error('Cleanup failed', cleanupErr);
    }
    process.exit(0);
  } catch (err) {
    console.error('Backfill failed', err);
    process.exit(1);
  }
}

main();
