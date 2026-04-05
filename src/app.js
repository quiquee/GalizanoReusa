require('dotenv').config();
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const cookieParser = require('cookie-parser');
const { i18next, i18nextMiddleware } = require('./config/i18n');
const crypto = require('crypto');

const app = express();

// Trust proxy (needed behind reverse proxy / X-Forwarded-For)
app.set('trust proxy', 1);

// ─── Seguridad ───
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
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
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Rate limiting estricto para auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
});

// ─── Body parsing ───
// Stripe webhooks necesitan raw body
app.use('/webhooks/stripe', express.raw({ type: 'application/json' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ─── Archivos estáticos ───
app.use(express.static(path.join(__dirname, '..', 'public')));

// ─── Cookie parser + i18n ───
app.use(cookieParser());
app.use(i18nextMiddleware.handle(i18next));

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
  res.locals.t = req.t;
  res.locals.lng = req.language;

  // Returning-user recognition cookie (1 year)
  if (!req.cookies.gr_visitor) {
    const visitorId = crypto.randomBytes(16).toString('hex');
    res.cookie('gr_visitor', visitorId, {
      maxAge: 365 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    res.locals.isReturningVisitor = false;
  } else {
    res.locals.isReturningVisitor = true;
  }

  next();
});

// ─── CSRF Protection (custom, sin csurf deprecated) ───

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
    req.flash('error', req.t('flash.csrfError'));
    return res.redirect('back');
  }
  next();
}

// Export for use in routes that need CSRF after multer
app.locals.verifyCsrf = verifyCsrf;

// ─── Rutas ───
const authRoutes = require('./routes/auth');
const itemRoutes = require('./routes/items');
const dashboardRoutes = require('./routes/dashboard');
const paymentRoutes = require('./routes/payments');
const webhookRoutes = require('./routes/webhooks');
const adminRoutes = require('./routes/admin');

app.use('/auth', authLimiter, verifyCsrf, authRoutes);
app.use('/items', itemRoutes);
app.use('/dashboard', verifyCsrf, dashboardRoutes);
app.use('/pay', verifyCsrf, paymentRoutes);
app.use('/webhooks', webhookRoutes); // Sin CSRF (Stripe envía webhooks)
app.use('/admin', verifyCsrf, adminRoutes);

// Panel de administración
const adminRoutes = require('./routes/admin');
app.use('/admin', verifyCsrf, adminRoutes);

// Catálogo público de objetos
const catalogoRoutes = require('./routes/catalogo');
app.use('/catalogo', catalogoRoutes);

// Landing page del objeto (público, QR apunta aquí)
const landingRoutes = require('./routes/landing');
app.use('/o', landingRoutes);

// Home
app.get('/', (req, res) => {
  res.render('home', { title: req.t('brand') });
});

// Protección de datos
app.get('/privacidad', (req, res) => {
  res.render('privacidad', { title: req.t('privacy.title') });
});

// Language switch
app.get('/lang/:code', (req, res) => {
  const supported = ['es', 'en', 'fr', 'de'];
  const code = req.params.code;
  if (supported.includes(code)) {
    res.cookie('i18next', code, {
      maxAge: 365 * 24 * 60 * 60 * 1000,
      httpOnly: false,
      sameSite: 'lax',
    });
  }
  res.redirect(req.headers.referer || '/');
});

// ─── 404 ───
app.use((req, res) => {
  res.status(404).render('error', { title: req.t('error.title', { code: 404 }), message: req.t('error.notFound'), code: 404 });
});

// ─── Error handler ───
app.use((err, req, res, _next) => {
  console.error('Error:', err.stack);
  res.status(500).render('error', { title: req.t('error.title', { code: 500 }), message: req.t('error.internal'), code: 500 });
});

// ─── Arranque ───
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌊 Galizano Reusa corriendo en http://localhost:${PORT}`);
});

module.exports = app;
