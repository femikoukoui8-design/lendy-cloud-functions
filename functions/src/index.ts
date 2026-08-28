import { onCall } from "firebase-functions/v2/https";
import { onRequest } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";

initializeApp();

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
