#!/usr/bin/env node
// One-off admin helper: promote a user to a staff role by email.
//
// Usage:
//   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
//     node scripts/set-role.mjs someone@example.com admin
//
// Valid roles: pending, customer, sales, counter, admin
//
// This uses the Firebase Admin SDK, which bypasses Firestore Security
// Rules entirely — that's intentional and is how you bootstrap the very
// first admin account (after that, use the in-app Users panel instead).
// Never commit the service account JSON to git; pass its path via the
// GOOGLE_APPLICATION_CREDENTIALS env var only.

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';

const [, , email, role] = process.argv;
const VALID_ROLES = ['pending', 'customer', 'sales', 'counter', 'admin'];

if (!email || !role || !VALID_ROLES.includes(role)) {
  console.error('Usage: node scripts/set-role.mjs <email> <role>');
  console.error(`Valid roles: ${VALID_ROLES.join(', ')}`);
  process.exit(1);
}

const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!credPath) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to the service account JSON path.');
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(credPath, 'utf8'));
initializeApp({ credential: cert(serviceAccount) });

const auth = getAuth();
const db = getFirestore();

const userRecord = await auth.getUserByEmail(email).catch(() => null);
if (!userRecord) {
  console.error(`No Firebase Auth user found for ${email}. They must sign up first.`);
  process.exit(1);
}

await db.doc(`users/${userRecord.uid}`).set(
  { uid: userRecord.uid, email, role },
  { merge: true }
);

console.log(`Set ${email} (${userRecord.uid}) to role "${role}".`);
