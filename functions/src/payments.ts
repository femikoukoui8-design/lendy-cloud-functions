import { HttpsError, onCall } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { getFirestore } from "firebase-admin/firestore";
import Stripe from "stripe";

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");

/**
 * Two-sided commission per Master Spec §22 ("Décisions prises", 14 août
 * 2026 update): "Taux de commission : 5% côté locataire (frais de service
 * affichés au paiement), 15% retenus côté loueur au versement" — 20%
 * cumulative take rate, matching the Lightyshare benchmark cited in §7.
 *
 * - RENTER_FEE_RATE: service fee added on top of price_total — this is
 *   what the renter actually pays alongside the rental price.
 * - OWNER_COMMISSION_RATE: cut withheld from price_total before the owner
 *   is paid out.
 *
 * Both are collected in a single application_fee_amount on the rent
 * PaymentIntent (Stripe destination charge): the renter is charged
 * price_total * (1 + RENTER_FEE_RATE), the platform keeps
 * price_total * (RENTER_FEE_RATE + OWNER_COMMISSION_RATE) as its fee, and
 * transfer_data sends the remainder — price_total * (1 - OWNER_COMMISSION_RATE),
 * i.e. 85% of price_total — to the owner's connected account.
 */
const RENTER_FEE_RATE = 0.05;
const OWNER_COMMISSION_RATE = 0.15;

let stripeClient: Stripe | undefined;
function getStripe(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(stripeSecretKey.value(), {
      apiVersion: "2024-06-20",
    });
  }
  return stripeClient;
}

interface CreateBookingPaymentIntentRequest {
  bookingId: string;
}

interface CreateBookingPaymentIntentResponse {
  rental_payment_client_secret: string | null;
  deposit_client_secret: string | null;
}

/**
 * Callable function — invoke from FlutterFlow once a booking exists with
 * status "pending". Creates (or replays) the Stripe PaymentIntents for the
 * rent and, if applicable, the deposit, and writes their IDs back onto the
 * booking via the Admin SDK.
 */
export const createBookingPaymentIntent = onCall<CreateBookingPaymentIntentRequest>(
  { secrets: [stripeSecretKey] },
  async (request): Promise<CreateBookingPaymentIntentResponse> => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Vous devez être connecté.");
    }

    const bookingId = request.data?.bookingId;
    if (typeof bookingId !== "string" || bookingId.length === 0) {
      throw new HttpsError("invalid-argument", "bookingId est requis.");
    }

    const db = getFirestore();
    const bookingRef = db.collection("bookings").doc(bookingId);
    const bookingSnap = await bookingRef.get();
    if (!bookingSnap.exists) {
      throw new HttpsError("not-found", "Réservation introuvable.");
    }
    const booking = bookingSnap.data()!;

    if (booking.renter_uid !== uid) {
      throw new HttpsError(
        "permission-denied",
        "Seul le locataire de cette réservation peut initier le paiement."
      );
    }

    const stripe = getStripe();

    // Idempotence : si un PaymentIntent existe déjà sur la réservation, on
    // renvoie les client secrets existants plutôt que d'en recréer.
    if (booking.stripe_payment_intent_id) {
      const rentIntent = await stripe.paymentIntents.retrieve(
        booking.stripe_payment_intent_id
      );
      let depositClientSecret: string | null = null;
      if (booking.stripe_deposit_authorization_id) {
        const depositIntent = await stripe.paymentIntents.retrieve(
          booking.stripe_deposit_authorization_id
        );
        depositClientSecret = depositIntent.client_secret;
      }
      return {
        rental_payment_client_secret: rentIntent.client_secret,
        deposit_client_secret: depositClientSecret,
      };
    }

    if (booking.status !== "pending") {
      throw new HttpsError(
        "failed-precondition",
        `Cette réservation n'est pas dans un état permettant le paiement (statut actuel : ${booking.status}).`
      );
    }

    const itemSnap = await db.collection("items").doc(booking.item_id).get();
    if (!itemSnap.exists) {
      throw new HttpsError("not-found", "Annonce introuvable.");
    }
    const item = itemSnap.data()!;
    if (item.is_active !== true) {
      throw new HttpsError(
        "failed-precondition",
        "Cette annonce n'est plus disponible."
      );
    }

    const ownerSnap = await db.collection("users").doc(booking.owner_uid).get();
    const owner = ownerSnap.data();
    if (!owner?.stripe_account_id) {
      throw new HttpsError(
        "failed-precondition",
        "Ce loueur n'a pas encore configuré ses paiements."
      );
    }

    // Stripe requires a lowercase ISO currency code; normalize in case
    // it's stored uppercase (e.g. "EUR") in items.currency.
    const currency = String(item.currency).toLowerCase();

    const priceTotal = booking.price_total;
    // What the renter is actually charged: rental price + renter-side service fee.
    const chargedAmount = Math.round(priceTotal * (1 + RENTER_FEE_RATE));
    // Platform's total cut: the renter fee (never reaches the owner) plus the
    // owner-side commission withheld before payout.
    const applicationFeeAmount = Math.round(
      priceTotal * (RENTER_FEE_RATE + OWNER_COMMISSION_RATE)
    );
    // What transfer_data actually sends to the owner: chargedAmount minus
    // applicationFeeAmount, i.e. price_total * (1 - OWNER_COMMISSION_RATE) —
    // 85% of the rental price, modulo independent rounding of the two amounts above.

    const rentIntent = await stripe.paymentIntents.create({
      amount: chargedAmount,
      currency,
      transfer_data: { destination: owner.stripe_account_id },
      application_fee_amount: applicationFeeAmount,
      metadata: { bookingId, type: "rent" },
    });

    const updates: Record<string, unknown> = {
      stripe_payment_intent_id: rentIntent.id,
    };

    let depositClientSecret: string | null = null;
    const depositAmount = Math.round(booking.deposit_amount ?? 0);
    if (depositAmount > 0) {
      // Deposit stays on the platform (no transfer_data) and is only
      // authorized (capture_method: manual) — captured later, manually,
      // only if damage is found at return.
      const depositIntent = await stripe.paymentIntents.create({
        amount: depositAmount,
        currency,
        capture_method: "manual",
        metadata: { bookingId, type: "deposit" },
      });
      updates.stripe_deposit_authorization_id = depositIntent.id;
      depositClientSecret = depositIntent.client_secret;
    }

    await bookingRef.update(updates);

    return {
      rental_payment_client_secret: rentIntent.client_secret,
      deposit_client_secret: depositClientSecret,
    };
  }
);
