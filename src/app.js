require('dotenv').config();
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');

const app = express();

// Trust proxy (needed behind reverse proxy / X-Forwarded-For)
app.set('trust proxy', 1);

// ─── Seguridad ───
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com", "https://cdn.tailwindcss.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.tailwindcss.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      frameSrc: ["https://js.stripe.com"],
      connectSrc: ["'self'", "https://api.stripe.com"],
      formAction: ["'self'", "https://checkout.stripe.com"],
    },
  },
}));

// Rate limiting global
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Rate limiting estricto para auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Demasiados intentos. Espera 15 minutos.',
});

// ─── Body parsing ───
// Stripe webhooks necesitan raw body
app.use('/webhooks/stripe', express.raw({ type: 'application/json' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ─── Archivos estáticos ───
app.use(express.static(path.join(__dirname, '..', 'public')));

// ─── Sesiones ───
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24h
    sameSite: 'lax',
  },
}));

// ─── Flash messages ───
app.use(flash());

// ─── Passport OAuth ───
const passport = require('./config/passport');
app.use(passport.initialize());
app.use(passport.session());

// ─── Template engine ───
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// ─── Variables globales para vistas ───
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  res.locals.baseUrl = process.env.BASE_URL;
  next();
});

// ─── CSRF Protection (custom, sin csurf deprecated) ───
const crypto = require('crypto');

function generateCsrfToken(req) {
  if (!req.session.csrfSecret) {
    req.session.csrfSecret = crypto.randomBytes(32).toString('hex');
  }
  return crypto
    .createHmac('sha256', req.session.csrfSecret)
    .update(req.session.id || '')
    .digest('hex');
}

app.use((req, res, next) => {
  res.locals.csrfToken = generateCsrfToken(req);
  next();
});

function verifyCsrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const token = req.body._csrf || req.headers['x-csrf-token'];
  const expected = generateCsrfToken(req);
  if (!token || token !== expected) {
    req.flash('error', 'Token de seguridad inválido. Inténtalo de nuevo.');
    return res.redirect('back');
  }
  next();
}

// ─── Rutas ───
const authRoutes = require('./routes/auth');
const itemRoutes = require('./routes/items');
const dashboardRoutes = require('./routes/dashboard');
const paymentRoutes = require('./routes/payments');
const webhookRoutes = require('./routes/webhooks');

app.use('/auth', authLimiter, verifyCsrf, authRoutes);
app.use('/items', verifyCsrf, itemRoutes);
app.use('/dashboard', verifyCsrf, dashboardRoutes);
app.use('/pay', verifyCsrf, paymentRoutes);
app.use('/webhooks', webhookRoutes); // Sin CSRF (Stripe envía webhooks)

// Catálogo público de objetos
const catalogoRoutes = require('./routes/catalogo');
app.use('/catalogo', catalogoRoutes);

// Landing page del objeto (público, QR apunta aquí)
const landingRoutes = require('./routes/landing');
app.use('/o', landingRoutes);

// Home
app.get('/', (req, res) => {
  res.render('home', { title: 'Galizano Reusa' });
});

// Protección de datos
app.get('/privacidad', (req, res) => {
  res.render('privacidad', { title: 'Protección de Datos' });
});

// ─── 404 ───
app.use((req, res) => {
  res.status(404).render('error', { title: 'No encontrado', message: 'La página que buscas no existe.', code: 404 });
});

// ─── Error handler ───
app.use((err, req, res, _next) => {
  console.error('Error:', err.stack);
  res.status(500).render('error', { title: 'Error', message: 'Ha ocurrido un error interno.', code: 500 });
});

// ─── Arranque ───
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌊 Galizano Reusa corriendo en http://localhost:${PORT}`);
});

module.exports = app;
