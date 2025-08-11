#!/usr/bin/env node

const { generateQRCode } = require('./generator/qr');
const EnhancedQRGenerator = require('./generator/enhanced-qr');
const { isValidURL, normalizeURL } = require('./utils/validators');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);

function showHelp() {
    console.log(`
QR Code Generator CLI

Usage:
  node src/cli.js <data> [output-file] [options]

Arguments:
  data          The data to generate QR code for
  output-file   Optional output file path (default: qrcode.png)

Options:
  --type, -t    Content type: url, text, wifi, sms, email, phone, vcard (default: url)
  --secondary   Secondary data (password, message, phone number, etc.)
  --title       Title text to display under QR code
  --frame       Frame color (default: #000000)
  --text-color  Text color (default: #000000)
  --enhanced    Use enhanced generator with frame and text

Examples:
  # Simple URL QR code
  node src/cli.js https://example.com
  
  # Plain text QR code
  node src/cli.js "Hello World" --type text --enhanced
  
  # WiFi QR code
  node src/cli.js MyWiFiNetwork --type wifi --secondary password123 --enhanced
  
  # SMS QR code
  node src/cli.js +1234567890 --type sms --secondary "Hello from QR!" --enhanced
  
  # Email QR code
  node src/cli.js contact@example.com --type email --secondary "Hello!" --enhanced

Options:
  --help, -h    Show this help message
    `);
}

function parseArgs(args) {
    const options = {
        data: null,
        outputFile: 'qrcode.png',
        contentType: 'url',
        secondaryData: '',
        title: '',
        frameColor: '#000000',
        textColor: '#000000',
        enhanced: false
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        if (arg === '--help' || arg === '-h') {
            showHelp();
            process.exit(0);
        } else if (arg === '--type' || arg === '-t') {
            options.contentType = args[++i];
        } else if (arg === '--secondary') {
            options.secondaryData = args[++i];
        } else if (arg === '--title') {
            options.title = args[++i];
        } else if (arg === '--frame') {
            options.frameColor = args[++i];
        } else if (arg === '--text-color') {
            options.textColor = args[++i];
        } else if (arg === '--enhanced') {
            options.enhanced = true;
        } else if (!options.data) {
            options.data = arg;
        } else if (options.outputFile === 'qrcode.png') {
            options.outputFile = arg;
        }
    }

    return options;
}

async function main() {
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        showHelp();
        return;
    }

    const options = parseArgs(args);

    if (!options.data) {
        console.error('❌ Error: Data is required');
        console.error('   Use --help for usage information');
        process.exit(1);
    }

    // Validate URL only if content type is URL
    if (options.contentType === 'url' && !isValidURL(options.data)) {
        console.error('❌ Error: Invalid URL format');
        console.error('   Please provide a valid URL (e.g., https://example.com)');
        process.exit(1);
    }

    try {
        console.log(`🔗 Generating ${options.contentType.toUpperCase()} QR code for: ${options.data}`);
        if (options.secondaryData) {
            console.log(`📝 Secondary data: ${options.secondaryData}`);
        }

        let qrBuffer;

        if (options.enhanced) {
            // Use enhanced generator
            const enhancedGenerator = new EnhancedQRGenerator();
            qrBuffer = await enhancedGenerator.generateWithFrame(options.data, {
                contentType: options.contentType,
                secondaryData: options.secondaryData,
                scanTitle: options.title,
                frameColor: options.frameColor,
                textColor: options.textColor
            });
        } else {
            // Use simple generator
            let qrData = options.data;
            if (options.contentType === 'url') {
                qrData = normalizeURL(qrData);
            }
            qrBuffer = await generateQRCode(qrData);
        }
        
        // Ensure output directory exists
        const outputDir = path.dirname(options.outputFile);
        if (outputDir !== '.' && !fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        fs.writeFileSync(options.outputFile, qrBuffer);
        
        console.log(`✅ QR code saved to: ${path.resolve(options.outputFile)}`);
        console.log(`📱 Content type: ${options.contentType}`);
        
        // Show what the QR code will do when scanned
        switch (options.contentType) {
            case 'text':
                console.log(`📱 When scanned shows: "${options.secondaryData || options.data}"`);
                break;
            case 'url':
                console.log(`📱 When scanned opens: ${normalizeURL(options.data)}`);
                break;
            case 'wifi':
                console.log(`📱 When scanned connects to WiFi: ${options.data}`);
                break;
            case 'sms':
                console.log(`📱 When scanned opens SMS to: ${options.data}`);
                break;
            case 'email':
                console.log(`📱 When scanned opens email to: ${options.data}`);
                break;
            case 'phone':
                console.log(`📱 When scanned dials: ${options.data}`);
                break;
            case 'vcard':
                console.log(`📱 When scanned adds contact: ${options.data}`);
                break;
        }
    } catch (error) {
        console.error('❌ Error generating QR code:', error.message);
        process.exit(1);
    }
}

main();
