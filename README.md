# KK Umbrellas — PDF Sharing App

Standalone replacement for the three Google Apps Script web apps (Sales
Team, Customer Catalog, Sales Counter), rebuilt as one React app with
role-based access:

- **Customer** — browse the catalog (categories → products, alphabetical,
  no stock shown) and view PDFs. Requires creating an account (email +
  password, or a passwordless email link) so there's a log of registered
  viewers.
- **Sales** — stock table, WhatsApp message builder, "Combine PDFs" (merges
  selected products' PDFs into one file with a generated table of
  contents).
- **Counter** — stock table for every SKU (with or without a PDF) and PDF
  viewing, no merge tool.
- **Admin** — everything Sales can do, plus a Users panel to assign roles.

Stack: React + Vite + TypeScript, Firebase (Auth, Firestore, Storage),
deployed on Cloudflare Pages.

## 1. One-time Firebase setup (already done for `kk-pdfsharing`)

These two steps can't be run from this environment's sandbox (its network
can't reach Firebase/Google Cloud APIs), so do them directly in the
[Firebase Console](https://console.firebase.google.com/project/kk-pdfsharing):

**Publish the security rules**

1. Firestore Database → **Rules** tab → paste the contents of
   [`firestore.rules`](./firestore.rules) → **Publish**.
2. Storage → **Rules** tab → paste the contents of
   [`storage.rules`](./storage.rules) → **Publish**.

**Create the first admin account**

1. Open the deployed app (or `npm run dev` locally) and **Register** with
   your own email — this signs you up with role `customer`.
2. In the Firebase Console → Firestore Database → `users` collection →
   find the document with your email → edit the `role` field from
   `customer` to `admin`.
3. Reload the app — you'll now see **Dashboard** and **Users** in the nav.
   From then on, assign every other role (sales/counter/customer) from the
   in-app **Users** page, no more manual Firestore edits needed.

## 2. Adding products

Products live in Firestore's `products` collection, one document per SKU:

```
{ type: "Golf Umbrella", name: "GU-204 Navy", actual: 120, booked: 20, ready: 100, pdfUrl: "" }
```

- For a handful of products, add them directly in the Firebase Console
  (Firestore → Start collection → `products`).
- To bulk-import from the old Google Sheet: export the "TYPE" tab as CSV
  with columns `sku,type,name,actual,booked,ready,pdf_url`, then **on your
  own computer** (not in this sandbox — it can't reach Firebase's API
  either) run:

  ```bash
  npm install
  export GOOGLE_APPLICATION_CREDENTIALS=/path/to/the/service-account.json
  node scripts/import-products.mjs path/to/products.csv
  ```

  (The service account JSON is the one already generated for this project
  in Project settings → Service accounts — keep it out of git.)

- `pdf_url` can be a Google Drive share link (viewable, but can't be used
  by "Combine PDFs" — Drive blocks the cross-origin fetch that needs) or a
  Firebase Storage download URL (viewable AND mergeable). To get the
  latter, upload the PDF under Storage's `pdfs/` folder and copy its
  download URL into `pdfUrl`.

## 3. Local development

```bash
npm install
cp .env.example .env.local   # already has the real public Firebase config
npm run dev
```

## 4. Deploying — Cloudflare Pages

This sandbox's network is also blocked from reaching `api.cloudflare.com`,
so the project is deployed the normal Cloudflare Pages way — connected
directly to GitHub, no API token needed day-to-day:

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git** → pick `divij-kk/pdfsharing`.
2. Build settings:
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Build output directory: `dist`
3. Add environment variables (Settings → Environment variables) — copy
   every `VITE_FIREBASE_*` key from `.env.example`/`.env.local`. These are
   Firebase's public web config values, safe to set here.
4. Save and deploy. Every push to `main` auto-deploys from now on.

## Known limitations of this first cut

- Combine-PDFs only works for products whose PDF is in Firebase Storage
  (not a Drive link) — see note above.
- Firestore Security Rules restrict what the UI shows, but a signed-in
  customer could still read raw stock numbers via a direct API call to
  `products` (the UI never shows them, but the rule allows any signed-in
  user to read the collection). Tightening this further — e.g. a separate
  public-safe `catalog` collection with no stock fields — is a good
  next step if that matters.
- No automated tests yet.
