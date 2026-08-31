# Data model — Lendy (`gear-rent-bxqwef`)

Backend for **Lendy**, a Paris-launch marketplace for renting photo/video/drone
gear between individuals (see `Lendy_Master_Specification.md`). Auth: Firebase
Authentication, Email/Password provider. Database: Cloud Firestore (Standard
edition, default database). Files: Cloud Storage (`storage.rules`).

This is v2 of the schema, rebuilt to match the Master Specification (MVP
features in §9, business rules in §11, architecture in §15/§17). Superseded
fields/collections from the first draft (`lens`/`audio`/`lighting`/`other`
equipment categories) are gone — see "Changes from v1" at the bottom.

## Collections

### `users/{uid}`

Document ID == the user's Firebase Auth `uid`. Contains PII (email, phone) —
**owner-only read**, never public. A single account can be both a renter and
an owner (§4, §22) — there is no `role` field.

| Field                     | Type         | Required | Who can set it                       | Notes |
| -------------------------- | ------------ | -------- | ------------------------------------- | ----- |
| `uid`                      | string       | yes      | server (onCreate trigger)             | immutable, == doc ID / `auth.uid` |
| `email`                    | string       | yes      | server                                | immutable, == `auth.token.email` |
| `displayName`               | string       | yes      | owner                                 | 1–50 chars |
| `photoURL`                  | string       | no       | owner                                 | valid URL, < 500 chars |
| `phone`                     | string       | no       | owner                                 | < 20 chars |
| `city`                      | string       | no       | owner                                 | < 100 chars — launch market is Paris (§8) but not hardcoded |
| `fcmTokens`                 | list<string> | no       | owner                                 | push notification device tokens (§9), <= 10, each < 200 chars |
| `identityVerificationStatus` | string     | yes      | server only                           | `unverified` \| `pending` \| `verified` — verification level still TBD (spec §23); field exists so it doesn't require a second migration |
| `stripeAccountId`           | string       | no       | server only (Cloud Function)          | Stripe Connect account, set once the owner completes onboarding (§15) |
| `stripeOnboardingComplete`  | boolean      | yes      | server only                           | gates whether this user can receive payouts as an owner |
| `ratingAverage`             | number       | yes      | server only (review trigger)          | 0–5, recomputed from `reviews` |
| `ratingCount`                | number       | yes      | server only                           | >= 0 |
| `createdAt`                 | timestamp    | yes      | server                                | immutable |
| `updatedAt`                  | timestamp    | yes      | owner/server                          | must be recent on every write |

Admin privilege is granted via a Firebase Auth **custom claim**
(`request.auth.token.admin == true`), never via a Firestore field.

Server-only fields are enforced in `firestore.rules` by requiring them to stay
unchanged on client writes (Cloud Functions use the Admin SDK, which bypasses
rules entirely).

### `equipment/{equipmentId}`

Listings. No PII — readable by any authenticated user. `ownerName` /
`ownerPhotoURL` are denormalized copies of the owner's public profile fields
(never email/phone).

| Field           | Type         | Required | Notes |
| ---------------- | ------------ | -------- | ----- |
| `ownerId`         | string       | yes      | immutable, == `auth.uid` at creation |
| `ownerName`       | string       | yes      | denormalized, 1–50 chars |
| `ownerPhotoURL`   | string       | no       | denormalized, valid URL |
| `title`           | string       | yes      | 1–100 chars |
| `description`     | string       | yes      | 1–2000 chars |
| `category`        | string       | yes      | one of `hybride_compact`, `action_cam`, `drone`, `accessoire` — matches the MVP catalog exactly (§8); no cinema-grade gear |
| `suggestedFor`    | list<string> | no       | intent-based browsing (§5): subset of `voyage`, `se_lancer`, `projet_ponctuel`, <= 3 items |
| `dailyRate`       | number       | yes      | > 0, <= 100000 (commission rate TBD, spec §7/§23 — not stored per listing) |
| `depositAmount`   | number       | yes      | >= 0, <= 1000000 (per-category deposit policy TBD, spec §23) |
| `photos`          | list<string> | no       | <= 10 Cloud Storage download URLs |
| `location`        | geopoint     | yes      | required for geolocated search (§9) |
| `geohash`         | string       | no       | optional client-computed geohash to support proximity queries; <= 20 chars |
| `city`            | string       | no       | <= 100 chars, display label |
| `status`          | string       | yes      | `pending_review` → `available`/`rejected` (admin-only transitions) → owner can toggle `available` ⇄ `unavailable` ⇄ `archived` — curated catalog (§5) |
| `createdAt`       | timestamp    | yes      | immutable |
| `updatedAt`        | timestamp    | yes      | server-set on every write |

Status transitions (enforced in rules):

- **Create**: must start at `status: pending_review` (unless created by an admin).
- **Admin**: `pending_review` → `available` or `rejected`; can also override any transition.
- **Owner**: free to move between `available`, `unavailable`, `archived` once
  approved — cannot self-approve out of `pending_review`/`rejected`.

Drone listings must show the P23 no-fly-zone reminder client-side (§11) — a UI
concern, not a schema field.

Expected queries: `where("category","==",...).where("status","==",...)`,
`orderBy("dailyRate")`, `orderBy("createdAt")` — composite indexes for the
category+price and status+createdAt combinations are in
`firestore.indexes.json`.

### `bookings/{bookingId}`

A rental request/transaction linking a renter to an equipment owner. Only the
two parties (and admins) can read it. Payment/deposit fields are **server-only
managed** — booking creation and status updates are still done directly by the
client, but a Cloud Function (triggered on booking create, or called via a
FlutterFlow Custom Action) is responsible for creating the Stripe
PaymentIntent and writing the payment fields via the Admin SDK. This isn't
implemented yet — a companion issue is warranted before wiring up real Stripe
Connect calls (see "Not yet implemented" below).

| Field                  | Type         | Required | Who can set it | Notes |
| ------------------------ | ------------ | -------- | ---------------- | ----- |
| `equipmentId`             | string       | yes      | renter (create)  | immutable |
| `ownerId`                  | string       | yes      | renter (create)  | immutable, must match `equipment.ownerId` at creation |
| `renterId`                 | string       | yes      | renter (create)  | immutable, == `auth.uid` |
| `startDate` / `endDate`    | timestamp    | yes      | renter (create)  | immutable, `endDate` > `startDate` |
| `status`                    | string       | yes      | renter/owner     | `requested` → `confirmed`/`declined` → `active` → `completed`, or `cancelled` |
| `totalPrice`                | number       | yes      | renter (create)  | immutable, > 0 |
| `depositAmount`             | number       | yes      | renter (create)  | immutable, >= 0 |
| `platformFeeAmount`         | number       | no       | **server only**  | commission taken by Lendy (rate TBD, §7/§23) |
| `stripePaymentIntentId`     | string       | no       | **server only**  | |
| `paymentStatus`              | string       | no       | **server only**  | `pending` \| `authorized` \| `paid` \| `refunded` \| `failed` |
| `depositStatus`              | string       | no       | **server only**  | `pending` \| `authorized` \| `captured` \| `released` — pre-authorization capped at 7 days by Stripe (§15) |
| `pickupPhotos`               | list<string> | no       | owner            | état des lieux "avant" (§9/§17), <= 10 photos, set together with the `confirmed`→`active` transition |
| `pickupAt`                    | timestamp    | no       | owner            | set together with `pickupPhotos` |
| `returnPhotos`                | list<string> | no       | owner            | état des lieux "après", set together with the `active`→`completed` transition |
| `returnAt`                     | timestamp    | no       | owner            | set together with `returnPhotos` |
| `createdAt` / `updatedAt`      | timestamp    | yes      | renter/server    | |

Valid status transitions (enforced in rules):

- Renter: `requested` or `confirmed` → `cancelled`
- Owner: `requested` → `confirmed` or `declined`;
  `confirmed` → `active` (must include `pickupPhotos` + `pickupAt`);
  `active` → `completed` (must include `returnPhotos` + `returnAt`)

Deletes are disallowed — bookings are a historical record.

Expected queries: `where("renterId","==",uid)` / `where("ownerId","==",uid)`
combined with `orderBy("startDate")` — composite indexes in
`firestore.indexes.json`.

### `conversations/{conversationId}`

In-app messaging (§9, §10) between exactly the renter and the owner of a
booking.

| Field              | Type         | Required | Notes |
| -------------------- | ------------ | -------- | ----- |
| `participantIds`      | list<string> | yes      | immutable, exactly 2 distinct uids, must include `auth.uid` at creation |
| `bookingId`             | string       | no       | immutable, links to the related booking if any |
| `lastMessageText`       | string       | no       | denormalized preview, <= 300 chars |
| `lastMessageAt`          | timestamp    | no       | |
| `createdAt`               | timestamp    | yes      | immutable |

Read/write restricted to participants. Deletes disallowed.

#### `conversations/{conversationId}/messages/{messageId}`

| Field       | Type      | Required | Notes |
| ------------- | --------- | -------- | ----- |
| `senderId`     | string    | yes      | immutable, == `auth.uid`, must be a participant of the parent conversation |
| `text`          | string    | yes      | 1–2000 chars, immutable |
| `sentAt`         | timestamp | yes      | immutable, recent |
| `readBy`          | list<string> | no    | only field mutable after creation (marking as read) |

Read/create restricted to participants of the parent conversation. Deletes
disallowed.

### `reviews/{reviewId}`

Post-transaction ratings (§9, §10). Document ID is the deterministic string
`${bookingId}_${authorId}` — this is what prevents a user from reviewing the
same booking twice (enforced in rules via the path variable, no query needed).

| Field        | Type      | Required | Notes |
| -------------- | --------- | -------- | ----- |
| `bookingId`      | string    | yes      | immutable, must reference a `completed` booking involving the author |
| `authorId`        | string    | yes      | immutable, == `auth.uid` |
| `targetId`          | string    | yes      | immutable, the *other* party on that booking (owner or renter) |
| `rating`             | number    | yes      | immutable, integer 1–5 |
| `comment`             | string    | no       | immutable, <= 1000 chars |
| `createdAt`            | timestamp | yes      | immutable |

Readable by any authenticated user (builds trust, no PII). Reviews are
immutable once created (no update, no delete) — a Cloud Function trigger
recomputes the target user's `ratingAverage`/`ratingCount` on create.

## Cloud Storage layout

See `storage.rules`.

| Path                                             | Write access                          | Purpose |
| -------------------------------------------------- | -------------------------------------- | ------- |
| `/users/{uid}/profile/{fileName}`                    | that user only                          | profile photo |
| `/equipment/{equipmentId}/{fileName}`                 | the equipment's `ownerId` (checked via `firestore.get()`) | listing photos |
| `/bookings/{bookingId}/pickup/{fileName}`              | the booking's renter or owner            | état des lieux "avant" |
| `/bookings/{bookingId}/return/{fileName}`               | the booking's renter or owner            | état des lieux "après" |

All paths: read requires authentication, images only (`contentType` must start
with `image/`), <= 10 MB per file.

## Not yet implemented

- The Cloud Function(s) that create a Stripe Connect PaymentIntent and write
  `platformFeeAmount` / `paymentStatus` / `depositStatus` on a booking, and
  that mark `stripeOnboardingComplete` once an owner finishes Connect
  onboarding. `bookings`/`users` fields exist so the schema doesn't need to
  change again once this is built.
- The exact commission rate and per-category deposit amounts (spec §7/§23,
  still open) — nothing in the schema hardcodes a rate.
- The identity verification flow behind `identityVerificationStatus` (spec §23).

## Changes from v1

The first draft of this schema (categories `camera`/`lens`/`audio`/`lighting`/
`other`, no messaging/reviews/payment/storage) didn't match the Master
Specification and has been fully replaced:

- `equipment.category` narrowed to the 4 MVP categories; `lens`, `audio`,
  `lighting`, `other` removed.
- `equipment.status` gained `pending_review`/`rejected` for catalog curation.
- `equipment.location` (geopoint) added for geolocated search; `suggestedFor`
  added for intent-based browsing.
- `bookings` gained Stripe Connect payment fields and état-des-lieux photo
  fields.
- `conversations` / `conversations/{id}/messages` added (in-app messaging).
- `reviews` added (post-transaction ratings).
- `users` gained `fcmTokens`, Stripe Connect fields, rating aggregates, and
  `identityVerificationStatus`.
- Cloud Storage rules added (`storage.rules`) — didn't exist in v1 despite
  Storage being named in the architecture (spec §15).

## Status

Rules are a reviewed **prototype**, not a security guarantee — see the README
section "Firestore security rules — read before shipping" for what to review
before opening the app to real users.
