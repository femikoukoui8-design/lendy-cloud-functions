# Data model — gear-rent-bxqwef

Backend for an electronics rental app (cameras, lenses, drones, audio/lighting
gear). Firebase project: `gear-rent-bxqwef`. Auth: Firebase Authentication,
Email/Password provider. Database: Cloud Firestore (Standard edition, default
database).

## Collections

### `users/{uid}`

Document ID == the user's Firebase Auth `uid`. Contains PII (email, phone) —
**owner-only read**, never public.

| Field       | Type      | Required | Notes                                      |
| ----------- | --------- | -------- | ------------------------------------------- |
| `uid`       | string    | yes      | immutable, must equal doc ID / `auth.uid`   |
| `email`     | string    | yes      | immutable, must match `auth.token.email`    |
| `displayName` | string  | yes      | 1–50 chars                                  |
| `photoURL`  | string    | no       | valid URL, < 500 chars                      |
| `phone`     | string    | no       | < 20 chars                                  |
| `createdAt` | timestamp | yes      | immutable                                   |
| `updatedAt` | timestamp | yes      | server-set on every write                   |

Admin privilege is granted via a Firebase Auth **custom claim**
(`request.auth.token.admin == true`), never via a Firestore field — this
avoids the classic "write `isAdmin: true` to my own profile" privilege
escalation. Set it with the Admin SDK / a Cloud Function, not from the client.

### `equipment/{equipmentId}`

Public listings. No PII — safe to read by any authenticated user.
`ownerName`/`ownerPhotoURL` are denormalized copies of the owner's public
profile fields (never email/phone).

| Field            | Type      | Required | Notes                                                            |
| ---------------- | --------- | -------- | ----------------------------------------------------------------- |
| `ownerId`        | string    | yes      | immutable, == `auth.uid` at creation                              |
| `ownerName`      | string    | yes      | denormalized, 1–50 chars                                          |
| `ownerPhotoURL`  | string    | no       | denormalized, valid URL                                           |
| `title`          | string    | yes      | 1–100 chars                                                       |
| `description`    | string    | yes      | 1–2000 chars                                                      |
| `category`       | string    | yes      | one of `camera`, `lens`, `drone`, `audio`, `lighting`, `accessory`, `other` |
| `dailyRate`      | number    | yes      | > 0, <= 100000                                                    |
| `depositAmount`  | number    | yes      | >= 0, <= 1000000                                                  |
| `photos`         | list<string> | no    | <= 10 items, each a valid URL                                     |
| `status`         | string    | yes      | one of `available`, `unavailable`, `archived`                     |
| `city`           | string    | no       | <= 100 chars                                                      |
| `createdAt`      | timestamp | yes      | immutable                                                         |
| `updatedAt`      | timestamp | yes      | server-set on every write                                         |

Expected queries: `where("category","==",...).where("status","==",...)`,
`orderBy("dailyRate")`, `orderBy("createdAt")` — all covered by Firestore's
automatic single-field / merged-equality indexing (no composite index
needed).

### `bookings/{bookingId}`

A rental request/transaction linking a renter to an equipment owner. Only the
two parties (and admins) can read or write it.

| Field           | Type      | Required | Notes                                                                 |
| --------------- | --------- | -------- | ----------------------------------------------------------------------- |
| `equipmentId`   | string    | yes      | immutable                                                               |
| `ownerId`       | string    | yes      | immutable, must match the referenced `equipment.ownerId` at creation    |
| `renterId`      | string    | yes      | immutable, == `auth.uid` at creation                                    |
| `startDate`     | timestamp | yes      | immutable                                                               |
| `endDate`       | timestamp | yes      | immutable, must be after `startDate`                                    |
| `status`        | string    | yes      | `requested` → `confirmed`/`declined` → `active` → `completed`, or `cancelled` |
| `totalPrice`    | number    | yes      | immutable, > 0                                                          |
| `depositAmount` | number    | yes      | immutable, >= 0                                                         |
| `createdAt`     | timestamp | yes      | immutable                                                               |
| `updatedAt`     | timestamp | yes      | server-set on every write                                               |

Valid status transitions (enforced in rules):

- Renter: `requested` or `confirmed` → `cancelled`
- Owner: `requested` → `confirmed` or `declined`; `confirmed` → `active`;
  `active` → `completed`

Deletes are disallowed — bookings are kept as a historical record; use
`status: cancelled` instead.

Expected queries: `where("renterId","==",uid)` / `where("ownerId","==",uid)`,
optionally combined with `orderBy("startDate")` — this equality + sort
combination needs a **composite index**, defined in
`firestore.indexes.json`.

## Status

This is the initial data model used to generate `firestore.rules` and
`firestore.indexes.json`. Treat the rules as a reviewed **prototype** — see
the note in the PR/commit description for what to double-check before opening
this app to real users.
