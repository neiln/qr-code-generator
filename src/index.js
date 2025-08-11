const express = require('express');
const path = require('path');
const { generateQRCode, generateQRCodeDataURL } = require('./generator/qr');
const EnhancedQRGenerator = require('./generator/enhanced-qr');
const { isValidURL, normalizeURL } = require('./utils/validators');
const config = require('./config/config');

const app = express();
const enhancedQRGenerator = new EnhancedQRGenerator();

// Middleware
app.use(express.json());

// Serve static files for web interface
app.use(express.static(path.join(__dirname, '../public')));

// Generate enhanced QR code with frame and text
app.post('/api/generate-enhanced', async (req, res) => {
    try {
        const { 
            url, 
            scanText, 
            scanTitle, 
            frameColor, 
            textColor, 
            frameWidth, 
            fontSize,
            contentType = 'url',
            secondaryData = ''
        } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL or primary data is required' });
        }

        // Validate URL only if content type is URL
        if (contentType === 'url') {
            const normalizedURL = normalizeURL(url);
            if (!isValidURL(normalizedURL)) {
                return res.status(400).json({ error: 'Invalid URL format' });
            }
        }

        // Prepare options for enhanced generation
        const options = {
            width: 300,
            frameColor: frameColor || '#000000',
            textColor: textColor || '#000000',
            frameWidth: frameWidth || 10,
            fontSize: fontSize || 24,
            contentType: contentType,
            secondaryData: secondaryData || scanText || '',
            scanText: scanText || '',
            scanTitle: scanTitle || ''
        };

        // Combine scan text and title for display
        let combinedText = '';
        if (scanText && scanTitle) {
            combinedText = `${scanText}\n${scanTitle}`;
        } else if (scanText) {
            combinedText = scanText;
        } else if (scanTitle) {
            combinedText = scanTitle;
        }

        if (combinedText) {
            options.displayText = combinedText;
        }

        const imageBuffer = await enhancedQRGenerator.generateWithFrame(url, options);

        res.set({
            'Content-Type': 'image/png',
            'Content-Length': imageBuffer.length,
            'Cache-Control': 'no-cache'
        });

        res.send(imageBuffer);

    } catch (error) {
        console.error('Error generating enhanced QR code:', error);
        res.status(500).json({ error: 'Failed to generate QR code' });
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

const PORT = config.port || 3000;

app.listen(PORT, () => {
    console.log(`🚀 QR Code Generator server running on port ${PORT}`);
    console.log(`📱 Web interface: http://localhost:${PORT}`);
    console.log(`🔗 API docs: http://localhost:${PORT}/api`);
});

module.exports = app;
