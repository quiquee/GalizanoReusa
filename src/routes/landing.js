const express = require('express');
const router = express.Router();
const prisma = require('../config/database');

// ─── GET /o/:slug ─── Landing page pública del objeto (destino del QR)
router.get('/:slug', async (req, res) => {
  try {
    const item = await prisma.item.findUnique({
      where: { slug: req.params.slug },
    });

    if (!item || !item.activo) {
      return res.status(404).render('error', {
        title: 'Objeto no encontrado',
        message: 'Este objeto ya no está disponible.',
        code: 404,
      });
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
      title: 'Error',
      message: 'Error al cargar el objeto.',
      code: 500,
    });
  }
});

module.exports = router;
