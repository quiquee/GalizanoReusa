const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const prisma = require('./database');

// ─── Serialización ───
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// ─── Función común para manejar el perfil OAuth ───
async function handleOAuthProfile(provider, profileId, email, displayName, avatarUrl) {
  const providerIdField = provider === 'google' ? 'googleId' : 'facebookId';

  // 1. Buscar por provider ID
  let user = await prisma.user.findUnique({ where: { [providerIdField]: profileId } });
  if (user) return user;

  // 2. Buscar por email y vincular la cuenta OAuth
  if (email) {
    user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { [providerIdField]: profileId, avatarUrl: user.avatarUrl || avatarUrl },
      });
      return user;
    }
  }

  // 3. Crear nuevo usuario como cliente
  user = await prisma.user.create({
    data: {
      email,
      [providerIdField]: profileId,
      nombre: displayName || 'Usuario',
      role: 'cliente',
      emailVerified: true, // Los proveedores ya verificaron el email
      avatarUrl,
    },
  });
  return user;
}

// ─── Google Strategy ───
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BASE_URL}/auth/google/callback`,
      scope: ['profile', 'email'],
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const avatarUrl = profile.photos?.[0]?.value || null;
        const user = await handleOAuthProfile('google', profile.id, email, profile.displayName, avatarUrl);
        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  ));
}

// ─── Facebook Strategy ───
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  passport.use(new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: `${process.env.BASE_URL}/auth/facebook/callback`,
      profileFields: ['id', 'displayName', 'emails', 'photos'],
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const avatarUrl = profile.photos?.[0]?.value || null;
        const user = await handleOAuthProfile('facebook', profile.id, email, profile.displayName, avatarUrl);
        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  ));
}

module.exports = passport;
