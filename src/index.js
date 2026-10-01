const express = require('express');
const path = require('path');
const sharp = require('sharp');
const { generateQRCode, generateQRCodeDataURL } = require('./generator/qr');
const EnhancedQRGenerator = require('./generator/enhanced-qr');
const { isValidURL, normalizeURL } = require('./utils/validators');
const config = require('./config/config');

const app = express();
const enhancedQRGenerator = new EnhancedQRGenerator();

// Middleware
app.use(express.json({ limit: '1mb' }));

// Serve static files for web interface
app.use(express.static(path.join(__dirname, '../public')));

// Generate enhanced QR code with validated presentation options.
app.post('/api/generate-enhanced', async (req, res) => {
    const body = req.body || {};
    const fail = error => res.status(400).json({ error });
    const contentType = body.contentType ?? 'url';
    if (!['url', 'text', 'wifi', 'sms', 'email', 'phone', 'vcard'].includes(contentType)) {
        return fail('Choose a supported content type.');
    }
    if (typeof body.url !== 'string' || !body.url.trim() || body.url.length > 2000) {
        return fail('Enter content between 1 and 2,000 characters.');
    }
    const options = { contentType };
    for (const [key, max] of Object.entries({ secondaryData: 2000, scanText: 100, scanTitle: 100 })) {
        const value = body[key] === undefined ? '' : body[key];
        if (typeof value !== 'string' || value.length > max || /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(value)) {
            return fail(`${key} must be text with at most ${max} characters.`);
        }
        options[key] = value;
    }
    for (const [key, [fallback, min, max]] of Object.entries({
        width: [300, 256, 2048], frameWidth: [10, 0, 50], padding: [20, 0, 64],
        fontSize: [24, 12, 48], logoSize: [18, 10, 22]
    })) {
        const value = body[key] === undefined ? fallback : body[key];
        if (!Number.isInteger(value) || value < min || value > max) return fail(`${key} must be a whole number from ${min} to ${max}.`);
        options[key] = value;
    }
    for (const key of ['qrColor', 'backgroundColor', 'frameColor', 'textColor']) {
        if (body[key] !== undefined) {
            if (typeof body[key] !== 'string' || !/^#[0-9a-f]{6}$/i.test(body[key])) return fail(`${key} must be a six-digit hex color, such as #123456.`);
            options[key] = body[key];
        }
    }
    options.fontFamily = body.fontFamily ?? 'Arial';
    if (!['Arial', 'Verdana', 'Georgia', 'monospace'].includes(options.fontFamily)) return fail('Choose a supported caption font.');
    options.qrStyle = body.qrStyle ?? 'classic';
    if (!['classic', 'ocean', 'forest', 'sunset'].includes(options.qrStyle)) return fail('Choose a supported color preset.');

    let data = body.url;
    if (contentType === 'url') {
        data = normalizeURL(data.trim());
        if (!isValidURL(data)) return fail('Enter a valid website URL, such as https://example.com.');
    }
    if (body.logoData) {
        const match = typeof body.logoData === 'string' && /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(body.logoData);
        if (!match) return fail('Choose a PNG, JPEG, or WebP logo.');
        const logoBuffer = Buffer.from(match[2], 'base64');
        if (!logoBuffer.length || logoBuffer.length > 512 * 1024) return fail('Logo image must be 512 KB or smaller.');
        try {
            // Decode here so a corrupt or excessively large image is a client error.
            options.logoBuffer = await sharp(logoBuffer, { limitInputPixels: 16000000 }).rotate().png().toBuffer();
        } catch {
            return fail('Could not read this logo. Choose a valid image with at most 16 megapixels.');
        }
    }
    try {
        const imageBuffer = await enhancedQRGenerator.generateWithFrame(data, options);
        res.set({ 'Content-Type': 'image/png', 'Cache-Control': 'no-store' });
        res.send(imageBuffer);
    } catch (error) {
        if (/amount of data is too big/i.test(error.message)) return fail('This content is too long for a QR code. Shorten it and try again.');
        console.error('Error generating enhanced QR code:', error);
        res.status(500).json({ error: 'Could not generate the QR code. Please try again.' });
    }
});

// Generate QR code as PNG image (original endpoint)
app.post('/generate', async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        const normalizedURL = normalizeURL(url);
        
        if (!isValidURL(normalizedURL)) {
            return res.status(400).json({ error: 'Invalid URL format' });
        }

        const imageBuffer = await generateQRCode(normalizedURL);

        res.set({
            'Content-Type': 'image/png',
            'Content-Length': imageBuffer.length
        });

        res.send(imageBuffer);

    } catch (error) {
        console.error('Error generating QR code:', error);
        res.status(500).json({ error: 'Failed to generate QR code' });
    }
});

// Generate QR code as base64 data URL
app.post('/generate-dataurl', async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        const normalizedURL = normalizeURL(url);
        
        if (!isValidURL(normalizedURL)) {
            return res.status(400).json({ error: 'Invalid URL format' });
        }

        const dataURL = await generateQRCodeDataURL(normalizedURL);

        res.json({ 
            success: true, 
            dataURL: dataURL,
            url: normalizedURL 
        });

    } catch (error) {
        console.error('Error generating QR code:', error);
        res.status(500).json({ error: 'Failed to generate QR code' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// API info endpoint
app.get('/api', (req, res) => {
    res.json({
        name: 'QR Code Generator API',
        version: '1.0.0',
        endpoints: {
            '/api/generate-enhanced': 'POST - Generate enhanced QR code with frame and text',
            '/generate': 'POST - Generate QR code as PNG',
            '/generate-dataurl': 'POST - Generate QR code as base64 data URL',
            '/health': 'GET - Health check',
            '/api': 'GET - API information'
        },
        usage: {
            enhanced: {
                method: 'POST',
                endpoint: '/api/generate-enhanced',
                body: {
                    url: 'string (required)',
                    scanText: 'string (optional)',
                    scanTitle: 'string (optional)',
                    frameColor: 'string (optional, hex color)',
                    textColor: 'string (optional, hex color)',
                    frameWidth: 'number (optional)',
                    fontSize: 'number (optional)'
                }
            }
        }
    });
});

// Root endpoint redirects to web interface
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

const PORT = config.PORT || 3000;

if (require.main === module) app.listen(PORT, () => {
    console.log(`🚀 QR Code Generator server running on port ${PORT}`);
    console.log(`📱 Web interface: http://localhost:${PORT}`);
    console.log(`🔗 API docs: http://localhost:${PORT}/api`);
});

module.exports = app;
