const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const prisma = require('../config/database');
const { requireOfertante } = require('../middleware/auth');
const upload = require('../middleware/upload');
const qrService = require('../services/qrService');
const multer = require('multer');

// CSRF middleware (applied after multer for multipart forms)
function csrfAfterMultipart(req, res, next) {
  req.app.locals.verifyCsrf(req, res, next);
}

// Wrap multer to handle file validation errors gracefully
function handleUpload(fieldName, maxCount) {
  return function(req, res, next) {
    upload.array(fieldName, maxCount)(req, res, function(err) {
      if (err) {
        const msg = err instanceof multer.MulterError
          ? req.t('validation.fileTooLarge')
          : err.message || req.t('validation.invalidFile');
        req.flash('error', msg);
        return res.redirect('back');
      }
      next();
    });
  };
}

// ─── GET /items/crear ─── (Formulario de alta de objeto)
router.get('/crear', requireOfertante, (req, res) => {
  res.render('items/crear', { title: req.t('items.addTitle') });
});

// ─── POST /items/crear ─── (Crear objeto con fotos)
router.post('/crear', requireOfertante, handleUpload('fotos', 5), csrfAfterMultipart, [
  body('titulo').trim().isLength({ min: 2, max: 100 }).escape().withMessage((v, { req }) => req.t('validation.titleRequired')),
  body('descripcion').trim().isLength({ min: 5, max: 1000 }).escape().withMessage((v, { req }) => req.t('validation.descRequired')),
  body('tipoTransaccion').isIn(['venta', 'alquiler_medio_dia', 'alquiler_dia', 'ambos_alquiler', 'todos']).withMessage((v, { req }) => req.t('validation.transactionTypeInvalid')),
  body('importeFianza').isFloat({ min: 0.01 }).withMessage((v, { req }) => req.t('validation.depositRequired')),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error', errors.array().map(e => e.msg).join(', '));
    return res.redirect('/items/crear');
  }

  if (!req.files || req.files.length === 0) {
    req.flash('error', req.t('validation.photosRequired'));
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

    req.flash('success', req.t('items.itemCreated'));
    return res.redirect(`/items/${item.slug}/qr`);
  } catch (err) {
    console.error('Create item error:', err);
    req.flash('error', req.t('items.itemCreateError'));
    return res.redirect('/items/crear');
  }
});

// ─── GET /items/:slug/qr ─── (Ver y descargar QR)
router.get('/:slug/qr', requireOfertante, async (req, res) => {
  try {
    const item = await prisma.item.findUnique({ where: { slug: req.params.slug } });
    if (!item || item.ownerId !== req.session.user.id) {
      req.flash('error', req.t('items.itemNotFound'));
      return res.redirect('/dashboard');
    }

    // Always regenerate QR from current BASE_URL so it stays correct across environments
    const landingUrl = `${process.env.BASE_URL}/o/${item.slug}`;
    const qrDataUrl = await qrService.generateQR(landingUrl);
    await prisma.item.update({ where: { id: item.id }, data: { qrCode: qrDataUrl } });
    item.qrCode = qrDataUrl;

    res.render('items/qr', { title: `QR - ${item.titulo}`, item });
  } catch (err) {
    console.error('QR view error:', err);
    req.flash('error', req.t('items.qrLoadError'));
    return res.redirect('/dashboard');
  }
});

// ─── GET /items/:slug/editar ───
router.get('/:slug/editar', requireOfertante, async (req, res) => {
  try {
    const item = await prisma.item.findUnique({ where: { slug: req.params.slug } });
    if (!item || item.ownerId !== req.session.user.id) {
      req.flash('error', req.t('items.itemNotFound'));
      return res.redirect('/dashboard');
    }
    res.render('items/editar', { title: `${req.t('dashboard.edit')} - ${item.titulo}`, item });
  } catch (err) {
    req.flash('error', req.t('items.itemLoadError'));
    return res.redirect('/dashboard');
  }
});

// ─── POST /items/:slug/editar ───
router.post('/:slug/editar', requireOfertante, handleUpload('fotos', 5), csrfAfterMultipart, [
  body('titulo').trim().isLength({ min: 2, max: 100 }).escape(),
  body('descripcion').trim().isLength({ min: 5, max: 1000 }).escape(),
  body('importeFianza').isFloat({ min: 0.01 }),
], async (req, res) => {
  try {
    const item = await prisma.item.findUnique({ where: { slug: req.params.slug } });
    if (!item || item.ownerId !== req.session.user.id) {
      req.flash('error', req.t('items.itemNotFound'));
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
    req.flash('success', req.t('items.itemUpdated'));
    return res.redirect('/dashboard');
  } catch (err) {
    console.error('Edit item error:', err);
    req.flash('error', req.t('items.itemUpdateError'));
    return res.redirect('/dashboard');
  }
});

// ─── POST /items/:slug/desactivar ───
router.post('/:slug/desactivar', requireOfertante, csrfAfterMultipart, async (req, res) => {
  try {
    const item = await prisma.item.findUnique({ where: { slug: req.params.slug } });
    if (!item || item.ownerId !== req.session.user.id) {
      req.flash('error', req.t('items.itemNotFound'));
      return res.redirect('/dashboard');
    }
    await prisma.item.update({ where: { id: item.id }, data: { activo: !item.activo } });
    req.flash('success', item.activo ? req.t('items.itemDeactivated') : req.t('items.itemReactivated'));
    return res.redirect('/dashboard');
  } catch (err) {
    req.flash('error', req.t('items.itemStatusError'));
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
