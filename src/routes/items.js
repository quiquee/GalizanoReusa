const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const prisma = require('../config/database');
const { requireOfertante } = require('../middleware/auth');
const upload = require('../middleware/upload');
const qrService = require('../services/qrService');

// ─── GET /items/crear ─── (Formulario de alta de objeto)
router.get('/crear', requireOfertante, (req, res) => {
  res.render('items/crear', { title: 'Añadir Objeto' });
});

// ─── POST /items/crear ─── (Crear objeto con fotos)
router.post('/crear', requireOfertante, upload.array('fotos', 5), [
  body('titulo').trim().isLength({ min: 2, max: 100 }).escape().withMessage('Título obligatorio (2-100 caracteres)'),
  body('descripcion').trim().isLength({ min: 5, max: 1000 }).escape().withMessage('Descripción obligatoria (5-1000 caracteres)'),
  body('tipoTransaccion').isIn(['venta', 'alquiler_medio_dia', 'alquiler_dia', 'ambos_alquiler', 'todos']).withMessage('Tipo de transacción inválido'),
  body('importeFianza').isFloat({ min: 0.01 }).withMessage('La fianza es obligatoria y debe ser mayor a 0'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error', errors.array().map(e => e.msg).join(', '));
    return res.redirect('/items/crear');
  }

  if (!req.files || req.files.length === 0) {
    req.flash('error', 'Debes subir al menos una foto del objeto.');
    return res.redirect('/items/crear');
  }

  try {
    const fotos = req.files.map(f => `/uploads/${f.filename}`);
    const slug = await generateUniqueSlug(req.body.titulo);

    const item = await prisma.item.create({
      data: {
        ownerId: req.session.user.id,
        titulo: req.body.titulo,
        descripcion: req.body.descripcion,
        fotos: JSON.stringify(fotos),
        tipoTransaccion: req.body.tipoTransaccion,
        precioVenta: req.body.precioVenta ? parseFloat(req.body.precioVenta) : null,
        precioMedioDia: req.body.precioMedioDia ? parseFloat(req.body.precioMedioDia) : null,
        precioDiaEntero: req.body.precioDiaEntero ? parseFloat(req.body.precioDiaEntero) : null,
        importeFianza: parseFloat(req.body.importeFianza),
        slug,
      },
    });

    // Generar QR con la URL de landing
    const landingUrl = `${process.env.BASE_URL}/o/${item.slug}`;
    const qrDataUrl = await qrService.generateQR(landingUrl);

    await prisma.item.update({
      where: { id: item.id },
      data: { qrCode: qrDataUrl },
    });

    req.flash('success', '¡Objeto creado! Ya puedes imprimir el código QR.');
    return res.redirect(`/items/${item.slug}/qr`);
  } catch (err) {
    console.error('Create item error:', err);
    req.flash('error', 'Error al crear el objeto.');
    return res.redirect('/items/crear');
  }
});

// ─── GET /items/:slug/qr ─── (Ver y descargar QR)
router.get('/:slug/qr', requireOfertante, async (req, res) => {
  try {
    const item = await prisma.item.findUnique({ where: { slug: req.params.slug } });
    if (!item || item.ownerId !== req.session.user.id) {
      req.flash('error', 'Objeto no encontrado.');
      return res.redirect('/dashboard');
    }
    res.render('items/qr', { title: `QR - ${item.titulo}`, item });
  } catch (err) {
    console.error('QR view error:', err);
    req.flash('error', 'Error al cargar el QR.');
    return res.redirect('/dashboard');
  }
});

// ─── GET /items/:slug/editar ───
router.get('/:slug/editar', requireOfertante, async (req, res) => {
  try {
    const item = await prisma.item.findUnique({ where: { slug: req.params.slug } });
    if (!item || item.ownerId !== req.session.user.id) {
      req.flash('error', 'Objeto no encontrado.');
      return res.redirect('/dashboard');
    }
    res.render('items/editar', { title: `Editar - ${item.titulo}`, item });
  } catch (err) {
    req.flash('error', 'Error al cargar el objeto.');
    return res.redirect('/dashboard');
  }
});

// ─── POST /items/:slug/editar ───
router.post('/:slug/editar', requireOfertante, upload.array('fotos', 5), [
  body('titulo').trim().isLength({ min: 2, max: 100 }).escape(),
  body('descripcion').trim().isLength({ min: 5, max: 1000 }).escape(),
  body('importeFianza').isFloat({ min: 0.01 }),
], async (req, res) => {
  try {
    const item = await prisma.item.findUnique({ where: { slug: req.params.slug } });
    if (!item || item.ownerId !== req.session.user.id) {
      req.flash('error', 'Objeto no encontrado.');
      return res.redirect('/dashboard');
    }

    const updateData = {
      titulo: req.body.titulo,
      descripcion: req.body.descripcion,
      tipoTransaccion: req.body.tipoTransaccion,
      precioVenta: req.body.precioVenta ? parseFloat(req.body.precioVenta) : null,
      precioMedioDia: req.body.precioMedioDia ? parseFloat(req.body.precioMedioDia) : null,
      precioDiaEntero: req.body.precioDiaEntero ? parseFloat(req.body.precioDiaEntero) : null,
      importeFianza: parseFloat(req.body.importeFianza),
    };

    if (req.files && req.files.length > 0) {
      const newFotos = req.files.map(f => `/uploads/${f.filename}`);
      const existingFotos = JSON.parse(item.fotos || '[]');
      updateData.fotos = JSON.stringify([...existingFotos, ...newFotos]);
    }

    await prisma.item.update({ where: { id: item.id }, data: updateData });
    req.flash('success', 'Objeto actualizado.');
    return res.redirect('/dashboard');
  } catch (err) {
    console.error('Edit item error:', err);
    req.flash('error', 'Error al actualizar.');
    return res.redirect('/dashboard');
  }
});

// ─── POST /items/:slug/desactivar ───
router.post('/:slug/desactivar', requireOfertante, async (req, res) => {
  try {
    const item = await prisma.item.findUnique({ where: { slug: req.params.slug } });
    if (!item || item.ownerId !== req.session.user.id) {
      req.flash('error', 'Objeto no encontrado.');
      return res.redirect('/dashboard');
    }
    await prisma.item.update({ where: { id: item.id }, data: { activo: !item.activo } });
    req.flash('success', item.activo ? 'Objeto desactivado.' : 'Objeto reactivado.');
    return res.redirect('/dashboard');
  } catch (err) {
    req.flash('error', 'Error al cambiar estado.');
    return res.redirect('/dashboard');
  }
});

// ─── Helpers ───

async function generateUniqueSlug(titulo) {
  const base = titulo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  let slug = base;
  let counter = 1;
  while (await prisma.item.findUnique({ where: { slug } })) {
    slug = `${base}-${counter}`;
    counter++;
  }
  return slug;
}

module.exports = router;
