# lendy-cloud-functions

Firebase backend for **Lendy** — a Paris-launch marketplace for renting
photo/video/drone gear between individuals. Firebase project:
**`gear-rent-bxqwef`**. Uses Firebase Authentication (Email/Password), Cloud
Firestore, and Cloud Storage.

See [DATA_MODEL.md](DATA_MODEL.md) for the full data model that
`firestore.rules` / `firestore.indexes.json` / `storage.rules` are built
against, and `Lendy_Master_Specification.md` for the product spec they
implement.

## Project structure

```
functions/
  src/index.ts        # Cloud Functions: ping/health samples, user-profile lifecycle triggers, rating aggregation
firebase.json          # auth, firestore, storage, and functions config
.firebaserc             # Firebase project: gear-rent-bxqwef
firestore.rules         # Firestore security rules — prototype, see note below
firestore.indexes.json  # Composite indexes for equipment/booking/conversation/review queries
storage.rules            # Cloud Storage security rules — prototype
DATA_MODEL.md              # Collections, fields, and expected queries
```

## Local setup

```bash
cd functions
npm install
npm run build
```

## Authenticate & deploy

> This repo's automated session could not run these steps itself — this
> sandbox's network policy blocks Firebase's auth/API endpoints
> (`auth.firebase.tools`, `firebase-public.firebaseio.com`). Run them from
> your own machine.

```bash
npx -y firebase-tools@latest login
npx -y firebase-tools@latest use gear-rent-bxqwef

# Auth (enables Email/Password) + Firestore (rules + indexes) + Storage
npx -y firebase-tools@latest deploy --only auth,firestore,storage

# Cloud Functions
npx -y firebase-tools@latest deploy --only functions
```

## Android app config

To fetch `google-services.json` for the existing Android app
(`1:937769197909:android:f593f42d17a34afe7a0fdc`):

```bash
npx -y firebase-tools@latest apps:sdkconfig ANDROID \
  1:937769197909:android:f593f42d17a34afe7a0fdc \
  --project gear-rent-bxqwef
```

Save the output as `google-services.json` in your Android/Flutter app module
(not in this repo — this repo is backend-only).

## Security rules — read before shipping

`firestore.rules` and `storage.rules` are **reviewed prototypes**, not a
guarantee of security:

- `users/{uid}`: owner-only read/write (contains email/phone). Payment and
  trust fields (`stripeAccountId`, `ratingAverage`, `identityVerificationStatus`,
  ...) are server-only — a Cloud Function writes them via the Admin SDK, which
  bypasses rules. Admin access is granted via a Firebase Auth **custom claim**
  (`token.admin == true`), never a Firestore field.
- `equipment/{id}`: readable by any authenticated user (no PII). New listings
  start at `pending_review`; only an admin can approve (`available`) or
  reject them — the owner can freely edit their own listing's fields and
  toggle `available`/`unavailable`/`archived` once approved, or resubmit a
  rejected listing back to `pending_review`.
- `bookings/{id}`: readable/writable only by the renter, the equipment
  owner, or an admin, with enforced status transitions
  (`requested → confirmed/declined → active → completed`, or `cancelled`).
  Payment fields (`stripePaymentIntentId`, `paymentStatus`, `depositStatus`,
  `platformFeeAmount`) are server-only — **not yet wired up** to real Stripe
  Connect calls, see DATA_MODEL.md "Not yet implemented".
- `conversations` / `conversations/{id}/messages`: readable/writable only by
  the two participants.
- `reviews/{id}`: readable by any authenticated user, immutable once created
  (doc ID `${bookingId}_${authorId}` prevents duplicate reviews per booking).

Known limitation: list-type fields (e.g. `equipment.photos`) are size-capped
but their individual elements aren't deeply validated — Firestore rules have
no loops, so this is a common, documented trade-off. Before opening the app
to real users, review the rules yourselves (or ask me to harden them further)
and test with the emulator suite:

```bash
npx -y firebase-tools@latest emulators:start --only auth,firestore,storage,functions
```

## Connecting from FlutterFlow

1. In FlutterFlow, go to **Settings & Integrations → Firebase** and link the
   app to project `gear-rent-bxqwef` (the existing Android app ID above).
2. Under **Authentication**, enable **Email/Password** as a sign-in method
   (mirrors the `auth.providers.emailPassword` config in `firebase.json`).
3. Under **Firestore**, define the `users`, `equipment`, `bookings`,
   `conversations` (+ `messages` subcollection), and `reviews` collections in
   FlutterFlow's schema editor using [DATA_MODEL.md](DATA_MODEL.md) — build
   the schema there before wiring up pages, so every page binds to the final
   field names/types from the start.
4. Under **Storage**, mirror the paths in `storage.rules` (`users/{uid}/profile/`,
   `equipment/{equipmentId}/`, `bookings/{bookingId}/pickup/` and `.../return/`).
5. For the `ping` callable function, add a **Custom Action** using the
   **Cloud Functions** integration — FlutterFlow handles the Firebase Auth
   token automatically. For `health`, use a plain **API Call** action.
6. Redeploy (`firebase deploy --only functions`) whenever you add or change a
   function, then refresh the function list on the FlutterFlow side.
