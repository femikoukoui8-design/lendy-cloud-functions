# lendy-cloud-functions

Firebase backend for an electronics rental app (cameras, lenses, drones,
audio/lighting gear). Firebase project: **`gear-rent-bxqwef`**. Uses Firebase
Authentication (Email/Password) and Cloud Firestore.

See [DATA_MODEL.md](DATA_MODEL.md) for the full Firestore data model that
`firestore.rules` / `firestore.indexes.json` are built against.

## Project structure

```
functions/
  src/index.ts        # Cloud Functions (ping/health samples + user-profile lifecycle triggers)
firebase.json          # auth, firestore, and functions config
.firebaserc             # Firebase project: gear-rent-bxqwef
firestore.rules         # Firestore security rules — prototype, see note below
firestore.indexes.json  # Composite indexes for booking/equipment queries
DATA_MODEL.md            # Collections, fields, and expected queries
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

# Auth (enables Email/Password) + Firestore (rules + indexes)
npx -y firebase-tools@latest deploy --only auth,firestore

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

## Firestore security rules — read before shipping

`firestore.rules` is a **reviewed prototype**, not a guarantee of security:

- `users/{uid}`: owner-only read/write (contains email/phone). Admin access
  is granted via a Firebase Auth **custom claim** (`token.admin == true`),
  never a Firestore field — set it with the Admin SDK, not from the client.
- `equipment/{id}`: readable by any authenticated user (no PII), writable
  only by its owner or an admin.
- `bookings/{id}`: readable/writable only by the renter, the equipment
  owner, or an admin, with enforced status transitions
  (`requested → confirmed/declined → active → completed`, or `cancelled`).

Known limitation: list-type fields (e.g. `equipment.photos`) are size-capped
but their individual elements aren't deeply validated — Firestore rules have
no loops, so this is a common, documented trade-off. Before opening the app
to real users, review the rules yourselves (or ask me to harden them further)
and test with the Firestore emulator:

```bash
npx -y firebase-tools@latest emulators:start --only auth,firestore,functions
```

## Connecting from FlutterFlow

1. In FlutterFlow, go to **Settings & Integrations → Firebase** and link the
   app to project `gear-rent-bxqwef` (the existing Android app ID above).
2. Under **Authentication**, enable **Email/Password** as a sign-in method
   (mirrors the `auth.providers.emailPassword` config in `firebase.json`).
3. Under **Firestore**, FlutterFlow will read the collections once documents
   exist; you can also define the `users`, `equipment`, and `bookings`
   collections/fields manually in FlutterFlow's schema editor using
   [DATA_MODEL.md](DATA_MODEL.md).
4. For the `ping` callable function, add a **Custom Action** using the
   **Cloud Functions** integration — FlutterFlow handles the Firebase Auth
   token automatically. For `health`, use a plain **API Call** action.
5. Redeploy (`firebase deploy --only functions`) whenever you add or change a
   function, then refresh the function list on the FlutterFlow side.
