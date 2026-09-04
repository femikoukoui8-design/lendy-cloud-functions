import { onRequest } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

/**
 * Appelée explicitement par la page Inscription juste après
 * SignupEmailPassword : le DSL FlutterFlow n'a pas d'action "set display
 * name", donc le nom saisi à l'inscription ne peut pas être écrit sur
 * l'utilisateur Firebase Auth autrement. Endpoint HTTPS générique (pas
 * "callable") car c'est ce qu'une action API FlutterFlow sait appeler ;
 * l'ID token est donc vérifié manuellement plutôt que via le contexte
 * auth automatique des callable functions.
 *
 * Champs écrits : display_name, photo_url, rating, review_count,
 * created_at, is_verified — noms canoniques confirmés (rating/review_count,
 * pas average_rating/ratings_count, qui restent dans le schéma comme
 * artefacts non utilisés, jamais assignés à une clé de champ réelle).
 */
export const createUserProfile = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const authHeader = req.headers.authorization || "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!idToken) {
    res.status(401).json({ error: "Missing Authorization: Bearer <idToken> header." });
    return;
  }

  let uid: string;
  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token." });
    return;
  }

  const displayName = (
    req.body && typeof req.body.displayName === "string" ? req.body.displayName : ""
  ).trim();

  try {
    await getFirestore()
      .collection("users")
      .doc(uid)
      .set(
        {
          display_name: displayName,
          photo_url: "",
          rating: 0,
          review_count: 0,
          created_at: FieldValue.serverTimestamp(),
          is_verified: false,
        },
        { merge: true }
      );
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create user profile." });
  }
});
