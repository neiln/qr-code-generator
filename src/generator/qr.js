const QRCode = require('qrcode');
const config = require('../config/config');

async function generateQRCode(url) {
    try {
        // Generate QR code as PNG buffer
        const qrCodeBuffer = await QRCode.toBuffer(url, config.QR_CODE_OPTIONS);
        return qrCodeBuffer;
    } catch (err) {
        throw new Error('Error generating QR code: ' + err.message);
    }
}

// Function to generate QR code as data URL (for web display)
async function generateQRCodeDataURL(url) {
    try {
        const qrCodeDataUrl = await QRCode.toDataURL(url, config.QR_CODE_OPTIONS);
        return qrCodeDataUrl;
    } catch (err) {
        throw new Error('Error generating QR code: ' + err.message);
    }
}

module.exports = {
    generateQRCode,
    generateQRCodeDataURL
};