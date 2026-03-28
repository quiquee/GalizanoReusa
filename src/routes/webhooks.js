const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const stripe = require('../config/stripe');

// ─── POST /webhooks/stripe ─── Recibir eventos de Stripe
router.post('/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const transactionId = session.metadata?.transactionId;

      if (transactionId) {
        await prisma.transaction.update({
          where: { id: transactionId },
          data: {
            estado: 'pagado',
            stripePaymentIntentId: session.payment_intent,
          },
        });

        // Marcar como 'en_uso' para alquileres
        const txn = await prisma.transaction.findUnique({ where: { id: transactionId } });
        if (txn && txn.tipo !== 'venta') {
          await prisma.transaction.update({
            where: { id: transactionId },
            data: { estado: 'en_uso' },
          });
        }
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object;
      console.error('Payment failed:', paymentIntent.id);
      break;
    }

    default:
      // Evento no gestionado
      break;
  }

  res.json({ received: true });
});

module.exports = router;
