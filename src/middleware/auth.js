// Middleware de autenticación

function requireAuth(req, res, next) {
  if (!req.session.user) {
    req.flash('error', 'Debes iniciar sesión para acceder.');
    return res.redirect('/auth/login');
  }
  next();
}

function requireOfertante(req, res, next) {
  if (!req.session.user || !['ofertante', 'admin'].includes(req.session.user.role)) {
    req.flash('error', 'Acceso restringido a ofertantes.');
    return res.redirect('/');
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    req.flash('error', 'Acceso restringido a administradores.');
    return res.redirect('/');
  }
  next();
}

function requireCliente(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'cliente') {
    req.flash('error', 'Acceso restringido a clientes registrados.');
    return res.redirect('/');
  }
  next();
}

function guestOrAuth(req, res, next) {
  // Permite tanto usuarios autenticados como invitados
  next();
}

module.exports = { requireAuth, requireOfertante, requireAdmin, requireCliente, guestOrAuth };
