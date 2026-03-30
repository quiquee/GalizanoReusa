const i18next = require('i18next');
const i18nextMiddleware = require('i18next-http-middleware');
const Backend = require('i18next-fs-backend');
const path = require('path');

i18next
  .use(Backend)
  .use(i18nextMiddleware.LanguageDetector)
  .init({
    backend: {
      loadPath: path.join(__dirname, '../../locales/{{lng}}/{{ns}}.json'),
    },
    fallbackLng: 'es',
    supportedLngs: ['es', 'en', 'fr', 'de'],
    preload: ['es', 'en', 'fr', 'de'],
    ns: ['translation'],
    defaultNS: 'translation',
    detection: {
      order: ['querystring', 'cookie', 'header'],
      lookupQuerystring: 'lng',
      lookupCookie: 'i18next',
      caches: ['cookie'],
      cookieExpirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      cookieOptions: { path: '/', sameSite: 'lax' },
    },
    interpolation: {
      escapeValue: false,
    },
  });

module.exports = { i18next, i18nextMiddleware };
