const { generateQRCode, generateQRCodeDataURL } = require('../src/generator/qr');
const { isValidURL, normalizeURL } = require('../src/utils/validators');

describe('QR Code Generator Tests', () => {
    test('should generate a QR code buffer for a valid URL', async () => {
        const url = 'https://example.com';
        const qrCodeBuffer = await generateQRCode(url);
        expect(qrCodeBuffer).toBeDefined();
        expect(Buffer.isBuffer(qrCodeBuffer)).toBe(true);
    });

    test('should generate a QR code data URL for a valid URL', async () => {
        const url = 'https://example.com';
        const qrCodeDataUrl = await generateQRCodeDataURL(url);
        expect(qrCodeDataUrl).toBeDefined();
        expect(qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
    });

    test('should return false for an invalid URL', () => {
        const url = '';
        expect(isValidURL(url)).toBe(false);
    });

    test('should return true for a valid URL', () => {
        const url = 'https://valid-url.com';
        expect(isValidURL(url)).toBe(true);
    });

    test('should return true for a URL without protocol', () => {
        const url = 'example.com';
        expect(isValidURL(url)).toBe(true);
    });

    test('should normalize URL by adding https protocol', () => {
        const url = 'example.com';
        const normalized = normalizeURL(url);
        expect(normalized).toBe('https://example.com');
    });

    test('should not modify URL that already has protocol', () => {
        const url = 'http://example.com';
        const normalized = normalizeURL(url);
        expect(normalized).toBe('http://example.com');
    });
});