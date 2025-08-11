const express = require('express');
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
        const { url, scanText, scanTitle, frameColor, textColor, frameWidth, fontSize } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        const normalizedURL = normalizeURL(url);
        
        if (!isValidURL(normalizedURL)) {
            return res.status(400).json({ error: 'Invalid URL format' });
        }

        // Prepare options for enhanced generation
        const options = {
            width: 300,
            frameColor: frameColor || '#000000',
            textColor: textColor || '#000000',
            frameWidth: frameWidth || 10,
            fontSize: fontSize || 24,
            scanText: scanText || '',
            scanTitle: scanTitle || ''
        };

        // Combine scan text and title
        let combinedText = '';
        if (scanText && scanTitle) {
            combinedText = `${scanText}\n${scanTitle}`;
        } else if (scanText) {
            combinedText = scanText;
        } else if (scanTitle) {
            combinedText = scanTitle;
        }

        if (combinedText) {
            options.scanText = combinedText;
        }

        const imageBuffer = await enhancedQRGenerator.generateWithFrame(normalizedURL, options);

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
const { isValidURL, normalizeURL } = require('./utils/validators');
const config = require('./config/config');

const app = express();
app.use(express.json());

// Serve static files for basic web interface
app.use(express.static('public'));

// Generate QR code as PNG image
app.post('/generate', async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        if (!isValidURL(url)) {
            return res.status(400).json({ error: 'Invalid URL format' });
        }

        const normalizedURL = normalizeURL(url);
        const qrCodeBuffer = await generateQRCode(normalizedURL);
        res.type('image/png');
        res.send(qrCodeBuffer);
    } catch (error) {
        console.error('Error generating QR code:', error);
        res.status(500).json({ error: 'Failed to generate QR code' });
    }
});

// Generate QR code as data URL (for web display)
app.post('/generate-data-url', async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        if (!isValidURL(url)) {
            return res.status(400).json({ error: 'Invalid URL format' });
        }

        const normalizedURL = normalizeURL(url);
        const qrCodeDataUrl = await generateQRCodeDataURL(normalizedURL);
        res.json({ qrCode: qrCodeDataUrl });
    } catch (error) {
        console.error('Error generating QR code:', error);
        res.status(500).json({ error: 'Failed to generate QR code' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'QR Code Generator is running' });
});

// Basic HTML interface
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>QR Code Generator</title>
            <style>
                body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
                input, button { padding: 10px; margin: 5px; }
                input[type="url"] { width: 300px; }
                button { background: #007bff; color: white; border: none; cursor: pointer; }
                button:hover { background: #0056b3; }
                #qrcode { margin-top: 20px; }
                .error { color: red; }
            </style>
        </head>
        <body>
            <h1>QR Code Generator</h1>
            <div>
                <input type="url" id="urlInput" placeholder="Enter URL (e.g., https://example.com)" />
                <button onclick="generateQR()">Generate QR Code</button>
            </div>
            <div id="result"></div>
            
            <script>
                async function generateQR() {
                    const url = document.getElementById('urlInput').value;
                    const resultDiv = document.getElementById('result');
                    
                    if (!url) {
                        resultDiv.innerHTML = '<p class="error">Please enter a URL</p>';
                        return;
                    }
                    
                    try {
                        const response = await fetch('/generate-data-url', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ url })
                        });
                        
                        const data = await response.json();
                        
                        if (response.ok) {
                            resultDiv.innerHTML = \`
                                <h3>QR Code for: \${url}</h3>
                                <img src="\${data.qrCode}" alt="QR Code" style="border: 1px solid #ddd; padding: 10px;" />
                                <p><a href="\${data.qrCode}" download="qrcode.png">Download QR Code</a></p>
                            \`;
                        } else {
                            resultDiv.innerHTML = \`<p class="error">Error: \${data.error}</p>\`;
                        }
                    } catch (error) {
                        resultDiv.innerHTML = \`<p class="error">Error: \${error.message}</p>\`;
                    }
                }
                
                // Allow Enter key to generate QR code
                document.getElementById('urlInput').addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        generateQR();
                    }
                });
            </script>
        </body>
        </html>
    `);
});

const PORT = config.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 QR Code Generator is running on http://localhost:${PORT}`);
    console.log(`📱 Visit http://localhost:${PORT} to use the web interface`);
    console.log(`🔗 API endpoints:`);
    console.log(`   POST /generate - Generate QR code as PNG image`);
    console.log(`   POST /generate-data-url - Generate QR code as data URL`);
});