import { onCall } from "firebase-functions/v2/https";
import { onRequest } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as functionsV1 from "firebase-functions/v1";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

initializeApp();

export { createBookingPaymentIntent } from "./payments";
export { createUserProfile } from "./users";

/**
 * Auth lifecycle trigger — Firebase user lifecycle events (onCreate/onDelete)
 * are still 1st-gen only, hence the v1 import. Seeds the users/{uid} Firestore
 * document for every authenticated user, using the real schema field names
 * (display_name, rating, review_count, is_verified, created_at) rather than
 * the camelCase names assumed by the original v2 schema rebuild.
 *
 * `stripeOnboardingComplete` (or any Stripe-onboarding-tracking field) is
 * deliberately NOT written here — it doesn't exist in the confirmed real
 * schema, and how/whether to track Connect onboarding status is still an
 * open question in the Master Spec. Don't invent it.
 */
export const onUserCreate = functionsV1.auth.user().onCreate(async (user) => {
  await getFirestore()
    .collection("users")
    .doc(user.uid)
    .set(
      {
        uid: user.uid,
        email: user.email ?? "",
        display_name: user.displayName ?? (user.email?.split("@")[0] ?? "New user"),
        is_verified: false,
        rating: 0,
        review_count: 0,
        created_at: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
});

export const onUserDelete = functionsV1.auth.user().onDelete(async (user) => {
  await getFirestore().collection("users").doc(user.uid).delete();
});

/**
 * Recomputes a user's rating/review_count whenever a review targeting them
 * is created. Reviews are immutable (see firestore.rules), so this only
 * needs to handle the create case. Target user is `reviews.reviewee_uid`
 * (confirmed against the real FlutterFlow schema — not `targetId`).
 */
export const onReviewCreate = onDocumentCreated("reviews/{reviewId}", async (event) => {
  const review = event.data?.data();
  if (!review) return;

  const targetRef = getFirestore().collection("users").doc(review.reviewee_uid);

  await getFirestore().runTransaction(async (tx) => {
    const targetSnap = await tx.get(targetRef);
    const current = targetSnap.data() ?? { rating: 0, review_count: 0 };
    const newCount = (current.review_count ?? 0) + 1;
    const rawAverage =
      ((current.rating ?? 0) * (current.review_count ?? 0) + review.rating) / newCount;

    // reviews.rating is an Integer, users.rating is a Double. Plain JS
    // arithmetic is fine either way (both are just IEEE-754 numbers at
    // runtime) — the actual risk is on the write: the Admin SDK infers
    // Firestore's integerValue vs doubleValue purely from
    // `Number.isInteger()` on the JS number being written. A whole-number
    // average (e.g. after the very first review, rating 5 / 1 = 5) would
    // otherwise be stored as an integerValue, breaking client code that
    // expects users.rating to always be a double. Nudge by a value far
    // below any displayed precision to force a double representation
    // without changing the visible rating.
    const newAverage = Number.isInteger(rawAverage) ? rawAverage + 1e-9 : rawAverage;

    tx.set(
      targetRef,
      {
        rating: newAverage,
        review_count: newCount,
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });
});

/**
 * Callable function — invoke from FlutterFlow via a Custom Action using the
 * Firebase Cloud Functions integration (Firebase Auth token is handled for you).
 */
export const ping = onCall((request) => {
  return {
    message: "pong",
    receivedAt: new Date().toISOString(),
    data: request.data ?? null,
  };
});

/**
 * HTTP function — invoke from FlutterFlow via a plain API Call action
 * (no Firebase SDK auth handling; secure this endpoint yourself if it's
 * more than a health check).
 */
export const health = onRequest((_req, res) => {
  res.status(200).json({ status: "ok" });
});
