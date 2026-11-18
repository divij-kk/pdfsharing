#!/usr/bin/env node
// One-off migration helper: import products from a CSV export of the old
// "TYPE" sheet into Firestore's `products` collection.
//
// Usage:
//   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json \
//     node scripts/import-products.mjs products.csv
//
// Expected CSV columns (header row required, any order):
//   sku, type, name, actual, booked, ready, pdf_url
//
// - sku becomes the Firestore document id (use the SKU code from the
//   sheet; if you don't have one, use the product name with spaces
//   replaced by underscores).
// - pdf_url can be left blank, a Google Drive share link (kept as-is and
//   converted for viewing in the app), or a Firebase Storage URL.
//
// This only ever ADDS/OVERWRITES the rows present in the CSV (merge:
// true) — it never deletes products that aren't in the file.

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';
import { parse } from 'csv-parse/sync';

const [, , csvPath] = process.argv;
if (!csvPath) {
  console.error('Usage: node scripts/import-products.mjs <path-to-csv>');
  process.exit(1);
}

const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!credPath) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to the service account JSON path.');
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(credPath, 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const rows = parse(readFileSync(csvPath, 'utf8'), {
  columns: true,
  skip_empty_lines: true,
  trim: true,
});

let count = 0;
for (const row of rows) {
  const sku = row.sku || row.name.replace(/\s+/g, '_').toUpperCase();
  await db.doc(`products/${sku}`).set(
    {
      type: row.type || '',
      name: row.name || '',
      actual: Number(row.actual || 0),
      booked: Number(row.booked || 0),
      ready: Number(row.ready || 0),
      pdfUrl: row.pdf_url || '',
    },
    { merge: true }
  );
  count += 1;
}

console.log(`Imported/updated ${count} products.`);
