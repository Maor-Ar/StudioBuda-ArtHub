/**
 * Admin smoke test against live Firestore (bypasses security rules).
 * Usage from StudioBuda-ArtHub/StudioBuda-ArtHub:
 *   node scripts/smokeAdultClassesAdmin.mjs
 *   node scripts/smokeAdultClassesAdmin.mjs --write
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const require = createRequire(path.join(root, 'backend', 'package.json'));
const dotenv = require('dotenv');
const admin = require('firebase-admin');
dotenv.config({ path: path.join(root, 'backend', '.env') });

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
if (privateKey.includes('\\n')) {
  privateKey = privateKey.replace(/\\n/g, '\n');
}

if (!projectId || !clientEmail || !privateKey) {
  console.error('Missing Firebase Admin credentials in backend/.env');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
});

const db = admin.firestore();
const DO_WRITE = process.argv.includes('--write');
const ADULT_START_TIMES = new Set(['18:00', '19:30']);

function toUtcMidnight(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function expand(event, startDate, endDate) {
  const results = [];
  if (!event.isRecurring || !event.recurringIntervalDays) return results;
  const baseDateRaw = event.date?.toDate ? event.date.toDate() : new Date(event.date);
  let currentDate = toUtcMidnight(baseDateRaw);
  const intervalDays = Number(event.recurringIntervalDays) || 7;
  const startDateUTC = toUtcMidnight(startDate);
  while (currentDate < startDateUTC) {
    currentDate = new Date(currentDate);
    currentDate.setUTCDate(currentDate.getUTCDate() + intervalDays);
    currentDate.setUTCHours(0, 0, 0, 0);
  }
  const endDateUTC = new Date(endDate);
  endDateUTC.setUTCHours(23, 59, 59, 999);
  while (currentDate <= endDateUTC) {
    results.push({
      occurrenceDate: new Date(currentDate),
      occurrenceDateKey: currentDate.toISOString().split('T')[0],
    });
    currentDate = new Date(currentDate);
    currentDate.setUTCDate(currentDate.getUTCDate() + intervalDays);
    currentDate.setUTCHours(0, 0, 0, 0);
  }
  return results;
}

async function main() {
  console.log('🔥 Admin smoke test for', projectId);
  const snap = await db.collection('events').where('isActive', '==', true).get();
  console.log('Active events:', snap.size);

  const adult = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((e) => ADULT_START_TIMES.has(String(e.startTime || '')))
    .filter((e) => !String(e.title || '').includes('ילדים') && !String(e.title || '').includes('נוער'));

  console.log('Adult evening classes:', adult.length);
  adult.forEach((e) => console.log(` - ${e.title} @ ${e.startTime} (${e.id})`));

  const rangeStart = toUtcMidnight(new Date());
  const rangeEnd = new Date(rangeStart);
  rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 14);

  const occurrences = [];
  for (const event of adult) {
    for (const occ of expand(event, rangeStart, rangeEnd)) {
      occurrences.push({
        baseEventId: event.id,
        title: event.title,
        startTime: event.startTime,
        maxRegistrations: Number(event.maxRegistrations) || 6,
        ...occ,
      });
    }
  }
  console.log('Occurrences next 14 days:', occurrences.length);

  const eventIds = [...new Set(occurrences.map((o) => o.baseEventId))];
  const counts = {};
  for (let i = 0; i < eventIds.length; i += 10) {
    const chunk = eventIds.slice(i, i + 10);
    const [realSnap, manualSnap] = await Promise.all([
      db.collection('event_registrations').where('eventId', 'in', chunk).where('status', '==', 'confirmed').get(),
      db.collection('event_manual_registrations').where('eventId', 'in', chunk).where('status', '==', 'confirmed').get(),
    ]);
    const add = (data) => {
      const dateField = data.occurrenceDate || data.date;
      if (!dateField) return;
      const regDate = dateField.toDate ? dateField.toDate() : new Date(dateField);
      const dateKey = toUtcMidnight(regDate).toISOString().split('T')[0];
      const key = `${data.eventId}:${dateKey}`;
      counts[key] = (counts[key] || 0) + 1;
    };
    realSnap.docs.forEach((d) => add(d.data()));
    manualSnap.docs.forEach((d) => add(d.data()));
  }

  const open = [];
  for (const occ of occurrences) {
    const cancel = await db.collection('event_cancellations').doc(`${occ.baseEventId}_${occ.occurrenceDateKey}`).get();
    if (cancel.exists && cancel.data()?.isActive !== false) continue;
    const registered = counts[`${occ.baseEventId}:${occ.occurrenceDateKey}`] || 0;
    const spots = occ.maxRegistrations - registered;
    if (spots > 0) open.push({ ...occ, availableSpots: spots });
  }

  console.log('Open occurrences:', open.length);
  open.slice(0, 15).forEach((o) => {
    console.log(`  ${o.occurrenceDateKey} ${o.startTime} ${o.title} (${o.availableSpots} spots)`);
  });

  if (DO_WRITE && open[0]) {
    const target = open[0];
    const occurrenceDate = new Date(`${target.occurrenceDateKey}T00:00:00.000Z`);
    const now = new Date();
    const ref = await db.collection('event_manual_registrations').add({
      customerName: 'Admin Smoke אוטומטי שיעור נסיון',
      eventId: target.baseEventId,
      occurrenceDate,
      date: occurrenceDate,
      status: 'confirmed',
      source: 'trial_site',
      createdAt: now,
      updatedAt: now,
    });
    console.log('Wrote smoke reservation', ref.id, 'then deleting...');
    await ref.delete();
    console.log('Deleted smoke reservation');
  }

  console.log('✅ Admin smoke OK');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌', err);
  process.exit(1);
});
