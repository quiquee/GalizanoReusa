const QRCode = require('qrcode');

/**
 * Genera un código QR como Data URL (base64 PNG)
 * @param {string} url - URL de destino del QR
 * @returns {Promise<string>} Data URL del QR
 */
async function generateQR(url) {
  return QRCode.toDataURL(url, {
    width: 400,
    margin: 2,
    color: {
      dark: '#1a1a2e',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'H',
  });
}

/**
 * Genera un buffer SVG del QR (para descarga/impresión)
 * @param {string} url - URL de destino del QR
 * @returns {Promise<string>} SVG string
 */
async function generateQRSvg(url) {
  return QRCode.toString(url, {
    type: 'svg',
    width: 400,
    margin: 2,
    color: {
      dark: '#1a1a2e',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'H',
  });
}

module.exports = { generateQR, generateQRSvg };
