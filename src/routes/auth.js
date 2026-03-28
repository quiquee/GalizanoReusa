const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const prisma = require('../config/database');
const passport = require('../config/passport');

const SALT_ROUNDS = 12;

// ─── GET /auth/login ───
router.get('/login', (req, res) => {
  res.render('auth/login', { title: 'Iniciar Sesión' });
});

// ─── POST /auth/login ───
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('La contraseña es obligatoria'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error', errors.array().map(e => e.msg).join(', '));
    return res.redirect('/auth/login');
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: req.body.email } });
    if (!user || !user.passwordHash || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
      req.flash('error', 'Email o contraseña incorrectos.');
      return res.redirect('/auth/login');
    }

    req.session.user = {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      role: user.role,
      emailVerified: user.emailVerified,
    };

    req.flash('success', `¡Bienvenido/a, ${user.nombre}!`);
    return res.redirect(['ofertante', 'admin'].includes(user.role) ? '/dashboard' : '/');
  } catch (err) {
    console.error('Login error:', err);
    req.flash('error', 'Error al iniciar sesión.');
    return res.redirect('/auth/login');
  }
});

// ─── GET /auth/registro-cliente ───
router.get('/registro-cliente', (req, res) => {
  res.render('auth/registro-cliente', { title: 'Registro de Cliente' });
});

// ─── POST /auth/registro-cliente ───
router.post('/registro-cliente', [
  body('nombre').trim().isLength({ min: 2, max: 100 }).escape().withMessage('Nombre obligatorio (2-100 caracteres)'),
  body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
  body('direccion').trim().isLength({ min: 5, max: 200 }).escape().withMessage('Dirección obligatoria'),
  body('dni').trim().isLength({ min: 9, max: 20 }).escape().withMessage('DNI obligatorio'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error', errors.array().map(e => e.msg).join(', '));
    return res.redirect('/auth/registro-cliente');
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email: req.body.email } });
    if (existing) {
      req.flash('error', 'Ya existe una cuenta con ese email.');
      return res.redirect('/auth/registro-cliente');
    }

    const passwordHash = await bcrypt.hash(req.body.password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: {
        email: req.body.email,
        passwordHash,
        role: 'cliente',
        nombre: req.body.nombre,
        direccion: req.body.direccion,
        dni: req.body.dni,
        emailVerified: true, // En producción: enviar email de verificación
      },
    });

    req.session.user = {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      role: user.role,
      emailVerified: user.emailVerified,
    };

    req.flash('success', '¡Cuenta creada! Al estar registrado, no necesitas pagar fianza.');
    return res.redirect('/');
  } catch (err) {
    console.error('Registration error:', err);
    req.flash('error', 'Error al crear la cuenta.');
    return res.redirect('/auth/registro-cliente');
  }
});

// ─── GET /auth/registro-ofertante ───
router.get('/registro-ofertante', async (req, res) => {
  // Si ya está logueado, pasar datos del usuario completo (incluido dni)
  let fullUser = null;
  if (req.session.user) {
    fullUser = await prisma.user.findUnique({ where: { id: req.session.user.id }, select: { dni: true } });
    fullUser = { ...req.session.user, dni: fullUser?.dni };
  }
  res.render('auth/registro-ofertante', { title: 'Registro de Ofertante', user: fullUser });
});

// ─── POST /auth/upgrade-ofertante ─── (usuario logueado se convierte en ofertante)
router.post('/upgrade-ofertante', [
  body('bankIban').trim().isLength({ min: 15, max: 34 }).escape().withMessage('IBAN bancario obligatorio'),
  body('dni').optional().trim().isLength({ min: 9, max: 20 }).escape(),
], async (req, res) => {
  if (!req.session.user) {
    req.flash('error', 'Debes iniciar sesión primero.');
    return res.redirect('/auth/login');
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error', errors.array().map(e => e.msg).join(', '));
    return res.redirect('/auth/registro-ofertante');
  }

  try {
    const updateData = { role: 'ofertante', bankIban: req.body.bankIban };
    if (req.body.dni) updateData.dni = req.body.dni;

    const user = await prisma.user.update({
      where: { id: req.session.user.id },
      data: updateData,
    });

    req.session.user = {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      role: user.role,
      emailVerified: user.emailVerified,
    };

    req.flash('success', '¡Ya eres ofertante! Ahora puedes subir tus objetos.');
    return res.redirect('/dashboard');
  } catch (err) {
    console.error('Upgrade error:', err);
    req.flash('error', 'Error al activar cuenta de ofertante.');
    return res.redirect('/auth/registro-ofertante');
  }
});

// ─── POST /auth/registro-ofertante ───
router.post('/registro-ofertante', [
  body('nombre').trim().isLength({ min: 2, max: 100 }).escape().withMessage('Nombre obligatorio'),
  body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
  body('bankIban').trim().isLength({ min: 15, max: 34 }).escape().withMessage('IBAN bancario obligatorio'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error', errors.array().map(e => e.msg).join(', '));
    return res.redirect('/auth/registro-ofertante');
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email: req.body.email } });
    if (existing) {
      req.flash('error', 'Ya existe una cuenta con ese email.');
      return res.redirect('/auth/registro-ofertante');
    }

    const passwordHash = await bcrypt.hash(req.body.password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: {
        email: req.body.email,
        passwordHash,
        role: 'ofertante',
        nombre: req.body.nombre,
        bankIban: req.body.bankIban,
        emailVerified: true,
      },
    });

    req.session.user = {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      role: user.role,
      emailVerified: user.emailVerified,
    };

    req.flash('success', '¡Cuenta de ofertante creada! Ya puedes subir tus objetos.');
    return res.redirect('/dashboard');
  } catch (err) {
    console.error('Registration error:', err);
    req.flash('error', 'Error al crear la cuenta.');
    return res.redirect('/auth/registro-ofertante');
  }
});

// ─── GET /auth/logout ───
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// ─── Helper: set session after OAuth ───
function loginOAuthUser(req, res, user) {
  req.session.user = {
    id: user.id,
    email: user.email,
    nombre: user.nombre,
    role: user.role,
    emailVerified: user.emailVerified,
  };
  req.flash('success', `¡Bienvenido/a, ${user.nombre}!`);
  return res.redirect(['ofertante', 'admin'].includes(user.role) ? '/dashboard' : '/');
}

// ─── Google OAuth ───
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/login', failureFlash: 'Error al iniciar sesión con Google.' }),
  (req, res) => {
    loginOAuthUser(req, res, req.user);
  }
);

// ─── Facebook OAuth ───
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));

router.get('/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/auth/login', failureFlash: 'Error al iniciar sesión con Facebook.' }),
  (req, res) => {
    loginOAuthUser(req, res, req.user);
  }
);

module.exports = router;
