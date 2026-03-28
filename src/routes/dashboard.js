const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const prisma = require('../config/database');
const { requireOfertante } = require('../middleware/auth');
const depositService = require('../services/depositService');

// ─── GET /dashboard ─── Panel del ofertante
router.get('/', requireOfertante, async (req, res) => {
  try {
    const items = await prisma.item.findMany({
      where: { ownerId: req.session.user.id },
      orderBy: { createdAt: 'desc' },
    });

    // Transacciones activas de los objetos del ofertante
    const itemIds = items.map(i => i.id);
    const activeTransactions = await prisma.transaction.findMany({
      where: {
        itemId: { in: itemIds },
        estado: { in: ['pagado', 'en_uso', 'devuelto'] },
      },
      include: { item: true },
      orderBy: { createdAt: 'desc' },
    });

    res.render('dashboard/index', {
      title: 'Mi Panel',
      items,
      activeTransactions,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    req.flash('error', 'Error al cargar el panel.');
    return res.redirect('/');
  }
});

// ─── GET /dashboard/devoluciones ─── Revisar devoluciones pendientes
router.get('/devoluciones', requireOfertante, async (req, res) => {
  try {
    const items = await prisma.item.findMany({
      where: { ownerId: req.session.user.id },
    });
    const itemIds = items.map(i => i.id);

    const pendientes = await prisma.transaction.findMany({
      where: {
        itemId: { in: itemIds },
        tipo: { not: 'venta' },
        estado: { in: ['en_uso', 'devuelto'] },
      },
      include: { item: true, client: { select: { nombre: true } } },
      orderBy: { fechaFin: 'asc' },
    });

    res.render('dashboard/devoluciones', {
      title: 'Devoluciones',
      pendientes,
    });
  } catch (err) {
    console.error('Returns error:', err);
    req.flash('error', 'Error al cargar devoluciones.');
    return res.redirect('/dashboard');
  }
});

// ─── POST /dashboard/confirmar-devolucion/:id ─── Check-in: confirmar devolución
router.post('/confirmar-devolucion/:id', requireOfertante, async (req, res) => {
  try {
    const txn = await prisma.transaction.findUnique({
      where: { id: req.params.id },
      include: { item: true },
    });

    if (!txn || txn.item.ownerId !== req.session.user.id) {
      req.flash('error', 'Transacción no encontrada.');
      return res.redirect('/dashboard/devoluciones');
    }

    // Marcar como devuelto, la fianza se libera al día siguiente
    await prisma.transaction.update({
      where: { id: txn.id },
      data: {
        estado: 'devuelto',
        fechaDevolucion: new Date(),
      },
    });

    req.flash('success', 'Devolución registrada. La fianza se liberará mañana si no hay incidencias.');
    return res.redirect('/dashboard/devoluciones');
  } catch (err) {
    console.error('Return confirm error:', err);
    req.flash('error', 'Error al confirmar devolución.');
    return res.redirect('/dashboard/devoluciones');
  }
});

// ─── POST /dashboard/incidencia/:id ─── Reportar incidencia (robo/rotura)
router.post('/incidencia/:id', requireOfertante, [
  body('tipo').isIn(['no_devuelto', 'rotura', 'otro']).withMessage('Tipo de incidencia inválido'),
  body('descripcion').trim().isLength({ min: 5, max: 500 }).escape().withMessage('Describe la incidencia (5-500 caracteres)'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error', errors.array().map(e => e.msg).join(', '));
    return res.redirect('/dashboard/devoluciones');
  }

  try {
    const txn = await prisma.transaction.findUnique({
      where: { id: req.params.id },
      include: { item: true },
    });

    if (!txn || txn.item.ownerId !== req.session.user.id) {
      req.flash('error', 'Transacción no encontrada.');
      return res.redirect('/dashboard/devoluciones');
    }

    // Crear incidencia
    await prisma.incident.create({
      data: {
        transactionId: txn.id,
        reportedById: req.session.user.id,
        tipo: req.body.tipo,
        descripcion: req.body.descripcion,
      },
    });

    // Bloquear devolución de fianza → transferir al propietario
    await prisma.transaction.update({
      where: { id: txn.id },
      data: {
        estado: 'incidencia',
        fianzaBloqueada: true,
      },
    });

    req.flash('success', 'Incidencia registrada. La fianza ha sido bloqueada y se transferirá a tu cuenta.');
    return res.redirect('/dashboard/devoluciones');
  } catch (err) {
    console.error('Incident error:', err);
    req.flash('error', 'Error al registrar incidencia.');
    return res.redirect('/dashboard/devoluciones');
  }
});

// ─── POST /dashboard/liberar-fianza/:id ─── Liberar fianza manualmente
router.post('/liberar-fianza/:id', requireOfertante, async (req, res) => {
  try {
    const txn = await prisma.transaction.findUnique({
      where: { id: req.params.id },
      include: { item: true },
    });

    if (!txn || txn.item.ownerId !== req.session.user.id) {
      req.flash('error', 'Transacción no encontrada.');
      return res.redirect('/dashboard/devoluciones');
    }

    if (txn.importeFianza > 0 && !txn.fianzaDevuelta && !txn.fianzaBloqueada) {
      await depositService.refundDeposit(txn);
      await prisma.transaction.update({
        where: { id: txn.id },
        data: { fianzaDevuelta: true, estado: 'cerrado' },
      });
      req.flash('success', 'Fianza devuelta al cliente.');
    } else {
      req.flash('error', 'No se puede devolver la fianza (ya devuelta o bloqueada).');
    }

    return res.redirect('/dashboard/devoluciones');
  } catch (err) {
    console.error('Refund error:', err);
    req.flash('error', 'Error al devolver fianza.');
    return res.redirect('/dashboard/devoluciones');
  }
});

module.exports = router;
