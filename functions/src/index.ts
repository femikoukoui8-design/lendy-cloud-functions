import { onCall } from "firebase-functions/v2/https";
import { onRequest } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as functionsV1 from "firebase-functions/v1";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

initializeApp();

/**
 * Auth lifecycle trigger — Firebase user lifecycle events (onCreate/onDelete)
 * are still 1st-gen only, hence the v1 import. Seeds the users/{uid} Firestore
 * document (including the server-managed fields firestore.rules expects to
 * already exist, e.g. ratingAverage) for every authenticated user.
 */
export const onUserCreate = functionsV1.auth.user().onCreate(async (user) => {
  await getFirestore()
    .collection("users")
    .doc(user.uid)
    .set(
      {
        uid: user.uid,
        email: user.email ?? "",
        displayName: user.displayName ?? (user.email?.split("@")[0] ?? "New user"),
        identityVerificationStatus: "unverified",
        stripeOnboardingComplete: false,
        ratingAverage: 0,
        ratingCount: 0,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
});

export const onUserDelete = functionsV1.auth.user().onDelete(async (user) => {
  await getFirestore().collection("users").doc(user.uid).delete();
});

/**
 * Recomputes a user's ratingAverage/ratingCount whenever a review targeting
 * them is created. Reviews are immutable (see firestore.rules), so this only
 * needs to handle the create case.
 */
export const onReviewCreate = onDocumentCreated("reviews/{reviewId}", async (event) => {
  const review = event.data?.data();
  if (!review) return;

  const targetRef = getFirestore().collection("users").doc(review.targetId);

  await getFirestore().runTransaction(async (tx) => {
    const targetSnap = await tx.get(targetRef);
    const current = targetSnap.data() ?? { ratingAverage: 0, ratingCount: 0 };
    const newCount = (current.ratingCount ?? 0) + 1;
    const newAverage = ((current.ratingAverage ?? 0) * (current.ratingCount ?? 0) + review.rating) / newCount;

    tx.set(
      targetRef,
      {
        ratingAverage: newAverage,
        ratingCount: newCount,
        updatedAt: FieldValue.serverTimestamp(),
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
