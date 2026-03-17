import Stripe from "stripe";
import db from "../config/db.config.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function stripeWebHooks(req, res) {
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body, 
      sig,
      process.env.STRIPE_WEBHOOK_KEY
    );
  } catch (error) {
    return res.status(400).send(`Webhook error: ${error.message}`);
  }

  try {
    switch (event.type) {

      // ✅ Payment success
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;

        // Get checkout session
        const sessionList = await stripe.checkout.sessions.list({
          payment_intent: paymentIntent.id,
        });

        const session = sessionList.data[0];

        const { transactionId, appId } = session.metadata;

        if (appId === "quickgpt") {
          const conn = await db.getConnection();

          try {
            await conn.beginTransaction();

            // 1) Get unpaid transaction row (lock it)
            const [transactions] = await conn.query(
              `SELECT * FROM transactions WHERE id = ? AND isPaid = 0 FOR UPDATE`,
              [transactionId],
            );

            if (transactions.length === 0) {
              await conn.rollback();
              conn.release();
              return res.json({ received: true });
            }

            const transaction = transactions[0];

            // 2) Add credits to user (users table uses _id)
            await conn.query(
              `UPDATE users SET credits = credits + ? WHERE _id = ?`,
              [transaction.credit, transaction.userId],
            );

            // 3) Mark transaction as paid
            await conn.query(
              `UPDATE transactions SET isPaid = 1 WHERE id = ?`,
              [transactionId],
            );

            await conn.commit();
            conn.release();
          } catch (err) {
            try {
              await conn.rollback();
            } finally {
              conn.release();
            }
            throw err;
          }
        }

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // ✅  Stripe requires a response
    res.status(200).json({ received: true });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}