const express = require('express');
const router = express.Router();
const prisma = require('../config/database');

// ─── GET /catalogo ─── Catálogo público de objetos disponibles
router.get('/', async (req, res) => {
  try {
    const items = await prisma.item.findMany({
      where: { activo: true },
      orderBy: { createdAt: 'desc' },
    });

    const itemsConFotos = items.map(item => ({
      ...item,
      fotosList: JSON.parse(item.fotos || '[]'),
    }));

    res.render('catalogo', { title: 'Objetos Disponibles', items: itemsConFotos });
  } catch (err) {
    console.error('Catalog error:', err);
    req.flash('error', 'Error al cargar el catálogo.');
    return res.redirect('/');
  }
});

module.exports = router;
