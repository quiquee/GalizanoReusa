const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const prisma = require('../config/database');
const { requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

// ─── GET /admin ─── Panel principal con KPIs y actividad reciente
router.get('/', requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const hace30dias = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const hace7dias  = new Date(now - 7  * 24 * 60 * 60 * 1000);

    const [
      totalUsuarios,
      usuariosNuevos30d,
      totalObjetos,
      objetosNuevos30d,
      transaccionesNoDevueltas,
      transaccionesRecientes,
      ingresos30d,
      usuariosRecientes,
      objetosRecientes,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: hace30dias } } }),
      prisma.item.count(),
      prisma.item.count({ where: { createdAt: { gte: hace30dias } } }),
      prisma.transaction.count({
        where: { estado: { in: ['pagado', 'en_uso'] }, tipo: { not: 'venta' } },
      }),
      prisma.transaction.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          item:   { select: { titulo: true, slug: true } },
          client: { select: { nombre: true, email: true } },
        },
      }),
      prisma.transaction.aggregate({
        where: { estado: { in: ['pagado', 'en_uso', 'devuelto', 'cerrado'] }, createdAt: { gte: hace30dias } },
        _sum: { importePago: true },
      }),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, nombre: true, email: true, role: true, createdAt: true },
      }),
      prisma.item.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, titulo: true, slug: true, activo: true, createdAt: true },
      }),
    ]);

    // Filtro opcional por usuario o item en la actividad reciente (query params)
    const { filtroUsuario, filtroObjeto } = req.query;
    let actividadFiltrada = transaccionesRecientes;
    if (filtroUsuario) {
      const q = filtroUsuario.toLowerCase();
      actividadFiltrada = actividadFiltrada.filter(t =>
        (t.client && (
          t.client.nombre.toLowerCase().includes(q) ||
          t.client.email.toLowerCase().includes(q)
        )) ||
        (t.guestEmail && t.guestEmail.toLowerCase().includes(q)),
      );
    }
    if (filtroObjeto) {
      actividadFiltrada = actividadFiltrada.filter(t =>
        t.item.titulo.toLowerCase().includes(filtroObjeto.toLowerCase()),
      );
    }

    res.render('admin/index', {
      title: 'Panel Administrador',
      kpis: {
        totalUsuarios,
        usuariosNuevos30d,
        totalObjetos,
        objetosNuevos30d,
        noDevueltos: transaccionesNoDevueltas,
        ingresos30d: ingresos30d._sum.importePago || 0,
      },
      actividadFiltrada,
      usuariosRecientes,
      objetosRecientes,
      filtroUsuario: filtroUsuario || '',
      filtroObjeto:  filtroObjeto  || '',
    });
  } catch (err) {
    console.error('Admin index error:', err);
    req.flash('error', 'Error al cargar el panel de administración.');
    return res.redirect('/');
  }
});

// ─── GET /admin/usuarios ─── Lista de usuarios
router.get('/usuarios', requireAdmin, async (req, res) => {
  try {
    const { q, rol } = req.query;
    const where = {};
    if (rol && ['cliente', 'ofertante', 'admin'].includes(rol)) {
      where.role = rol;
    }
    if (q) {
      where.OR = [
        { nombre:   { contains: q } },
        { email:    { contains: q } },
        { dni:      { contains: q } },
      ];
    }

    const usuarios = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, nombre: true, email: true, role: true,
        dni: true, direccion: true, createdAt: true,
        _count: { select: { items: true, transactions: true } },
      },
    });

    res.render('admin/usuarios', {
      title: 'Usuarios',
      usuarios,
      q:   q   || '',
      rol: rol || '',
    });
  } catch (err) {
    console.error('Admin usuarios error:', err);
    req.flash('error', 'Error al cargar usuarios.');
    return res.redirect('/admin');
  }
});

// ─── GET /admin/usuarios/:id/editar ─── Formulario de edición de usuario
router.get('/usuarios/:id/editar', requireAdmin, async (req, res) => {
  try {
    const usuario = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, nombre: true, email: true, role: true,
        dni: true, direccion: true, bankIban: true, createdAt: true,
      },
    });
    if (!usuario) {
      req.flash('error', 'Usuario no encontrado.');
      return res.redirect('/admin/usuarios');
    }
    res.render('admin/editar-usuario', { title: `Editar usuario — ${usuario.nombre}`, usuario });
  } catch (err) {
    console.error('Admin edit user GET error:', err);
    req.flash('error', 'Error al cargar el usuario.');
    return res.redirect('/admin/usuarios');
  }
});

// ─── POST /admin/usuarios/:id/editar ─── Guardar cambios del usuario
router.post('/usuarios/:id/editar', requireAdmin, [
  body('nombre').trim().isLength({ min: 2, max: 100 }).escape().withMessage('Nombre obligatorio (2-100 caracteres)'),
  body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
  body('rol').isIn(['cliente', 'ofertante', 'admin']).withMessage('Rol inválido'),
  body('direccion').optional({ checkFalsy: true }).trim().isLength({ max: 200 }).escape(),
  body('dni').optional({ checkFalsy: true }).trim().isLength({ max: 20 }).escape(),
  body('bankIban').optional({ checkFalsy: true }).trim().isLength({ max: 34 }).escape(),
  body('nuevaContrasena').optional({ checkFalsy: true }).isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error', errors.array().map(e => e.msg).join(', '));
    return res.redirect(`/admin/usuarios/${req.params.id}/editar`);
  }

  try {
    // Verificar que el usuario existe
    const usuario = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!usuario) {
      req.flash('error', 'Usuario no encontrado.');
      return res.redirect('/admin/usuarios');
    }

    // Verificar que el email no lo tiene otro usuario
    if (req.body.email !== usuario.email) {
      const emailExistente = await prisma.user.findUnique({ where: { email: req.body.email } });
      if (emailExistente) {
        req.flash('error', 'Ese email ya está en uso por otro usuario.');
        return res.redirect(`/admin/usuarios/${req.params.id}/editar`);
      }
    }

    const updateData = {
      nombre:    req.body.nombre,
      email:     req.body.email,
      role:      req.body.rol,
      direccion: req.body.direccion || null,
      dni:       req.body.dni       || null,
      bankIban:  req.body.bankIban  || null,
    };

    if (req.body.nuevaContrasena) {
      updateData.passwordHash = await bcrypt.hash(req.body.nuevaContrasena, 12);
    }

    await prisma.user.update({ where: { id: req.params.id }, data: updateData });

    req.flash('success', 'Usuario actualizado correctamente.');
    return res.redirect('/admin/usuarios');
  } catch (err) {
    console.error('Admin edit user POST error:', err);
    req.flash('error', 'Error al actualizar el usuario.');
    return res.redirect(`/admin/usuarios/${req.params.id}/editar`);
  }
});

// ─── GET /admin/objetos ─── Lista de objetos
router.get('/objetos', requireAdmin, async (req, res) => {
  try {
    const { q, activo } = req.query;
    const where = {};
    if (activo === 'true')  where.activo = true;
    if (activo === 'false') where.activo = false;
    if (q) {
      where.OR = [
        { titulo:      { contains: q } },
        { descripcion: { contains: q } },
      ];
    }

    const objetos = await prisma.item.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { nombre: true, email: true } },
        _count: { select: { transactions: true } },
      },
    });

    res.render('admin/objetos', {
      title: 'Objetos',
      objetos,
      q:      q      || '',
      activo: activo || '',
    });
  } catch (err) {
    console.error('Admin objetos error:', err);
    req.flash('error', 'Error al cargar objetos.');
    return res.redirect('/admin');
  }
});

// ─── GET /admin/objetos/:slug/editar ─── Formulario de edición de objeto
router.get('/objetos/:slug/editar', requireAdmin, async (req, res) => {
  try {
    const objeto = await prisma.item.findUnique({
      where: { slug: req.params.slug },
      include: { owner: { select: { nombre: true, email: true } } },
    });
    if (!objeto) {
      req.flash('error', 'Objeto no encontrado.');
      return res.redirect('/admin/objetos');
    }
    res.render('admin/editar-objeto', { title: `Editar objeto — ${objeto.titulo}`, objeto });
  } catch (err) {
    console.error('Admin edit item GET error:', err);
    req.flash('error', 'Error al cargar el objeto.');
    return res.redirect('/admin/objetos');
  }
});

// ─── POST /admin/objetos/:slug/editar ─── Guardar cambios del objeto
router.post('/objetos/:slug/editar', requireAdmin, upload.array('fotos', 5), [
  body('titulo').trim().isLength({ min: 2, max: 100 }).escape().withMessage('Título obligatorio (2-100 caracteres)'),
  body('descripcion').trim().isLength({ min: 5, max: 1000 }).escape().withMessage('Descripción obligatoria'),
  body('tipoTransaccion').isIn(['venta', 'alquiler_medio_dia', 'alquiler_dia', 'ambos_alquiler', 'todos']).withMessage('Tipo de transacción inválido'),
  body('importeFianza').isFloat({ min: 0 }).withMessage('La fianza debe ser un número mayor o igual a 0'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error', errors.array().map(e => e.msg).join(', '));
    return res.redirect(`/admin/objetos/${req.params.slug}/editar`);
  }

  try {
    const objeto = await prisma.item.findUnique({ where: { slug: req.params.slug } });
    if (!objeto) {
      req.flash('error', 'Objeto no encontrado.');
      return res.redirect('/admin/objetos');
    }

    const updateData = {
      titulo:          req.body.titulo,
      descripcion:     req.body.descripcion,
      tipoTransaccion: req.body.tipoTransaccion,
      precioVenta:     req.body.precioVenta     ? parseFloat(req.body.precioVenta)     : null,
      precioMedioDia:  req.body.precioMedioDia  ? parseFloat(req.body.precioMedioDia)  : null,
      precioDiaEntero: req.body.precioDiaEntero ? parseFloat(req.body.precioDiaEntero) : null,
      importeFianza:   parseFloat(req.body.importeFianza),
      activo:          req.body.activo === 'true',
    };

    if (req.files && req.files.length > 0) {
      const newFotos = req.files.map(f => `/uploads/${f.filename}`);
      const existingFotos = JSON.parse(objeto.fotos || '[]');
      const combined = [...existingFotos, ...newFotos];
      updateData.fotos = JSON.stringify(combined.slice(0, 5));
    }

    await prisma.item.update({ where: { id: objeto.id }, data: updateData });

    req.flash('success', 'Objeto actualizado correctamente.');
    return res.redirect('/admin/objetos');
  } catch (err) {
    console.error('Admin edit item POST error:', err);
    req.flash('error', 'Error al actualizar el objeto.');
    return res.redirect(`/admin/objetos/${req.params.slug}/editar`);
  }
});

// ─── GET /admin/actividad ─── Actividad reciente filtrable
router.get('/actividad', requireAdmin, async (req, res) => {
  try {
    const { usuario, objeto, estado, desde, hasta } = req.query;

    const where = {};
    if (estado && ['pendiente','pagado','en_uso','devuelto','cerrado','incidencia'].includes(estado)) {
      where.estado = estado;
    }
    if (desde) where.createdAt = { ...where.createdAt, gte: new Date(desde) };
    if (hasta) {
      const hastaFin = new Date(hasta);
      hastaFin.setHours(23, 59, 59, 999);
      where.createdAt = { ...where.createdAt, lte: hastaFin };
    }

    // Filtro por nombre/email de usuario (also covers guest transactions)
    if (usuario) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { client: { nombre: { contains: usuario } } },
            { client: { email:  { contains: usuario } } },
            { guestEmail: { contains: usuario } },
          ],
        },
      ];
    }

    // Filtro por título de objeto
    if (objeto) {
      where.AND = [
        ...(where.AND || []),
        { item: { titulo: { contains: objeto } } },
      ];
    }

    const transacciones = await prisma.transaction.findMany({
      where,
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        item:   { select: { titulo: true, slug: true } },
        client: { select: { nombre: true, email: true } },
      },
    });

    const totalIngresos = transacciones
      .filter(t => ['pagado', 'en_uso', 'devuelto', 'cerrado'].includes(t.estado))
      .reduce((sum, t) => sum + (t.importePago || 0), 0);

    res.render('admin/actividad', {
      title: 'Actividad Reciente',
      transacciones,
      totalIngresos,
      filtros: { usuario: usuario || '', objeto: objeto || '', estado: estado || '', desde: desde || '', hasta: hasta || '' },
    });
  } catch (err) {
    console.error('Admin actividad error:', err);
    req.flash('error', 'Error al cargar la actividad.');
    return res.redirect('/admin');
  }
});

module.exports = router;
