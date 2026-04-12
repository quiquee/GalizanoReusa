const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const upload = require('../middleware/upload');

// ─── GET /o/:slug ─── Landing page pública del objeto (destino del QR)
router.get('/:slug', async (req, res) => {
  try {
    const item = await prisma.item.findUnique({
      where: { slug: req.params.slug },
    });

    if (!item || !item.activo) {
      return res.status(404).render('error', {
        title: req.t('error.title', { code: 404 }),
        message: req.t('landing.notAvailable'),
        code: 404,
      });
    }

    // Check for active rental on this item (by logged-in user or cookie)
    const activeRental = await findActiveRental(req, item.id);
    if (activeRental) {
      return res.redirect(`/o/${item.slug}/devolver/${activeRental.id}`);
    }

    const fotos = JSON.parse(item.fotos || '[]');
    const isRegistered = !!req.session.user;
    const isVerified = req.session.user?.emailVerified || false;

    // Calcular si se cobra fianza
    const cobraFianza = !isVerified;

    res.render('landing/objeto', {
      title: item.titulo,
      item,
      fotos,
      isRegistered,
      isVerified,
      cobraFianza,
      layout: 'layouts/landing',
    });
  } catch (err) {
    console.error('Landing error:', err);
    res.status(500).render('error', {
      title: req.t('error.title', { code: 500 }),
      message: req.t('error.internal'),
      code: 500,
    });
  }
});

// ─── GET /o/:slug/devolver/:txnId ─── Return page: upload photo
router.get('/:slug/devolver/:txnId', async (req, res) => {
  try {
    const txn = await prisma.transaction.findUnique({
      where: { id: req.params.txnId },
      include: { item: true },
    });
    if (!txn || txn.item.slug !== req.params.slug || txn.estado !== 'en_uso') {
      req.flash('error', req.t('returnFlow.notFound'));
      return res.redirect(`/o/${req.params.slug}`);
    }
    res.render('landing/devolver', {
      title: req.t('returnFlow.title'),
      transaction: txn,
      layout: 'layouts/landing',
    });
  } catch (err) {
    console.error('Return page error:', err);
    req.flash('error', req.t('returnFlow.error'));
    return res.redirect(`/o/${req.params.slug}`);
  }
});

// ─── POST /o/:slug/devolver/:txnId ─── Process return: save photo, mark devuelto
router.post('/:slug/devolver/:txnId', upload.single('returnPhoto'), async (req, res) => {
  try {
    const txn = await prisma.transaction.findUnique({
      where: { id: req.params.txnId },
      include: { item: true },
    });
    if (!txn || txn.item.slug !== req.params.slug || txn.estado !== 'en_uso') {
      req.flash('error', req.t('returnFlow.notFound'));
      return res.redirect(`/o/${req.params.slug}`);
    }

    const photoPath = req.file ? `/uploads/${req.file.filename}` : null;

    await prisma.transaction.update({
      where: { id: txn.id },
      data: {
        estado: 'devuelto',
        fechaDevolucion: new Date(),
        returnPhoto: photoPath,
      },
    });

    // Clear the rental cookie
    res.clearCookie(`gr_rental_${txn.itemId}`);

    return res.redirect(`/o/${req.params.slug}/gracias/${txn.id}`);
  } catch (err) {
    console.error('Return process error:', err);
    req.flash('error', req.t('returnFlow.error'));
    return res.redirect(`/o/${req.params.slug}`);
  }
});

// ─── GET /o/:slug/gracias/:txnId ─── Thank you + rating page
router.get('/:slug/gracias/:txnId', async (req, res) => {
  try {
    const txn = await prisma.transaction.findUnique({
      where: { id: req.params.txnId },
      include: { item: true, ratings: true },
    });
    if (!txn || txn.item.slug !== req.params.slug) {
      req.flash('error', req.t('returnFlow.notFound'));
      return res.redirect(`/o/${req.params.slug}`);
    }
    const alreadyRated = txn.ratings.length > 0;
    const isRegistered = !!req.session.user;
    res.render('landing/gracias', {
      title: req.t('returnFlow.thanksTitle'),
      transaction: txn,
      alreadyRated,
      isRegistered,
      layout: 'layouts/landing',
    });
  } catch (err) {
    console.error('Thanks page error:', err);
    req.flash('error', req.t('returnFlow.error'));
    return res.redirect(`/o/${req.params.slug}`);
  }
});

// ─── POST /o/:slug/valorar/:txnId ─── Save rating
router.post('/:slug/valorar/:txnId', express.urlencoded({ extended: true }), async (req, res) => {
  try {
    const txn = await prisma.transaction.findUnique({
      where: { id: req.params.txnId },
      include: { item: true, ratings: true },
    });
    if (!txn || txn.item.slug !== req.params.slug) {
      req.flash('error', req.t('returnFlow.notFound'));
      return res.redirect(`/o/${req.params.slug}`);
    }
    if (txn.ratings.length > 0) {
      req.flash('error', req.t('returnFlow.alreadyRated'));
      return res.redirect(`/o/${req.params.slug}/gracias/${txn.id}`);
    }

    const itemRating = Math.min(5, Math.max(1, parseInt(req.body.itemRating) || 3));
    const experienceRating = Math.min(5, Math.max(1, parseInt(req.body.experienceRating) || 3));

    await prisma.rating.create({
      data: {
        transactionId: txn.id,
        itemRating,
        experienceRating,
      },
    });

    req.flash('success', req.t('returnFlow.ratingThanks'));
    return res.redirect(`/o/${req.params.slug}/gracias/${txn.id}`);
  } catch (err) {
    console.error('Rating error:', err);
    req.flash('error', req.t('returnFlow.error'));
    return res.redirect(`/o/${req.params.slug}`);
  }
});

// Helper: find active rental for this item by session user or cookie
async function findActiveRental(req, itemId) {
  // First try logged-in user
  if (req.session.user?.id) {
    const txn = await prisma.transaction.findFirst({
      where: { itemId, clientId: req.session.user.id, estado: 'en_uso' },
      orderBy: { createdAt: 'desc' },
    });
    if (txn) return txn;
  }
  // Then try cookie (set at checkout for guests)
  const cookieTxnId = req.cookies?.[`gr_rental_${itemId}`];
  if (cookieTxnId) {
    const txn = await prisma.transaction.findFirst({
      where: { id: cookieTxnId, itemId, estado: 'en_uso' },
    });
    if (txn) return txn;
  }
  return null;
}

module.exports = router;
