const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const prisma = require('../config/database');
const stripe = require('../config/stripe');

// ─── POST /pay/crear-sesion ─── Crear sesión de pago con Stripe
router.post('/crear-sesion', [
  body('itemId').notEmpty().withMessage('Artículo inválido'),
  body('tipo').isIn(['venta', 'alquiler_medio_dia', 'alquiler_dia']).withMessage('Tipo de transacción inválido'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error', errors.array().map(e => e.msg).join(', '));
    return res.redirect('back');
  }

  try {
    const item = await prisma.item.findUnique({ where: { id: req.body.itemId } });
    if (!item || !item.activo) {
      req.flash('error', 'Objeto no disponible.');
      return res.redirect('/');
    }

    // Determinar importe según tipo
    let importePago = 0;
    let descripcionPago = '';
    switch (req.body.tipo) {
      case 'venta':
        importePago = item.precioVenta || 0;
        descripcionPago = `Compra: ${item.titulo}`;
        break;
      case 'alquiler_medio_dia':
        importePago = item.precioMedioDia || 0;
        descripcionPago = `Alquiler medio día: ${item.titulo}`;
        break;
      case 'alquiler_dia':
        importePago = item.precioDiaEntero || 0;
        descripcionPago = `Alquiler día completo: ${item.titulo}`;
        break;
    }

    if (importePago <= 0) {
      req.flash('error', 'Precio no configurado para este tipo de transacción.');
      return res.redirect(`/o/${item.slug}`);
    }

    // Determinar si cobrar fianza
    const isVerified = req.session.user?.emailVerified || false;
    const importeFianza = isVerified ? 0 : item.importeFianza;
    const total = importePago + importeFianza;

    // Crear transacción en BD
    const transaction = await prisma.transaction.create({
      data: {
        itemId: item.id,
        clientId: req.session.user?.id || null,
        guestEmail: req.body.guestEmail || null,
        tipo: req.body.tipo,
        importePago,
        importeFianza,
        estado: 'pendiente',
        fechaFin: req.body.tipo !== 'venta'
          ? new Date(Date.now() + (req.body.tipo === 'alquiler_medio_dia' ? 12 : 24) * 60 * 60 * 1000)
          : null,
      },
    });

    // Crear Stripe Checkout Session
    const lineItems = [
      {
        price_data: {
          currency: 'eur',
          product_data: { name: descripcionPago },
          unit_amount: Math.round(importePago * 100), // Stripe usa céntimos
        },
        quantity: 1,
      },
    ];

    // Si hay fianza, añadirla como línea separada
    if (importeFianza > 0) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: { name: `Fianza (reembolsable): ${item.titulo}` },
          unit_amount: Math.round(importeFianza * 100),
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.BASE_URL}/pay/exito?txn=${transaction.id}`,
      cancel_url: `${process.env.BASE_URL}/o/${item.slug}?cancelado=1`,
      metadata: {
        transactionId: transaction.id,
        itemId: item.id,
        fianza: importeFianza.toString(),
      },
    });

    return res.redirect(303, session.url);
  } catch (err) {
    console.error('Payment session error:', err);
    req.flash('error', 'Error al procesar el pago. Inténtalo de nuevo.');
    return res.redirect('back');
  }
});

// ─── GET /pay/exito ─── Página de pago exitoso
router.get('/exito', async (req, res) => {
  try {
    const txn = await prisma.transaction.findUnique({
      where: { id: req.query.txn },
      include: { item: true },
    });

    if (!txn) {
      req.flash('error', 'Transacción no encontrada.');
      return res.redirect('/');
    }

    res.render('payments/exito', {
      title: 'Pago Completado',
      transaction: txn,
    });
  } catch (err) {
    console.error('Success page error:', err);
    req.flash('error', 'Error al cargar confirmación.');
    return res.redirect('/');
  }
});

module.exports = router;
