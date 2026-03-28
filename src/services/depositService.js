const stripe = require('../config/stripe');

/**
 * Reembolsar la fianza de una transacción vía Stripe.
 * Utiliza el Payment Intent de la sesión de checkout.
 * @param {object} transaction - Transacción con stripePaymentIntentId
 */
async function refundDeposit(transaction) {
  if (!transaction.stripePaymentIntentId) {
    console.warn(`Transacción ${transaction.id}: sin Payment Intent, no se puede reembolsar.`);
    return null;
  }

  if (transaction.importeFianza <= 0) {
    console.warn(`Transacción ${transaction.id}: fianza es 0, nada que reembolsar.`);
    return null;
  }

  try {
    const refund = await stripe.refunds.create({
      payment_intent: transaction.stripePaymentIntentId,
      amount: Math.round(transaction.importeFianza * 100), // Solo la parte de fianza
      reason: 'requested_by_customer',
    });

    console.log(`Fianza reembolsada: ${refund.id} (${transaction.importeFianza}€)`);
    return refund;
  } catch (err) {
    console.error(`Error reembolsando fianza txn ${transaction.id}:`, err.message);
    throw err;
  }
}

/**
 * Capturar la fianza (transferir al propietario) en caso de incidencia.
 * En este modelo simplificado, como el pago ya se capturó en checkout,
 * simplemente no se reembolsa la porción de fianza.
 */
async function captureDeposit(transaction) {
  // El pago ya fue capturado por Stripe Checkout.
  // No reembolsar = la fianza queda para el propietario.
  console.log(`Fianza capturada (no reembolsada) para txn ${transaction.id}: ${transaction.importeFianza}€`);
  return true;
}

module.exports = { refundDeposit, captureDeposit };
