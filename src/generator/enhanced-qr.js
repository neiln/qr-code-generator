const QRCode = require('qrcode');
const sharp = require('sharp');

/**
 * Enhanced QR Code generator with frame and custom text
 */
class EnhancedQRGenerator {
    constructor() {
        this.defaultOptions = {
            errorCorrectionLevel: 'M',
            type: 'png',
            quality: 0.92,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            },
            width: 300,
            frameColor: '#000000',
            frameWidth: 10,
            textColor: '#000000',
            fontSize: 24,
            fontFamily: 'Arial',
            padding: 20
        };
    }

    /**
     * Generate QR code content based on type
     * @param {string} data - Primary data
     * @param {string} contentType - Type of content
     * @param {string} secondaryData - Secondary data (password, message, etc.)
     * @returns {string} - Formatted content for QR code
     */
    generateQRContent(data, contentType = 'url', secondaryData = '') {
        switch (contentType) {
            case 'text':
                return secondaryData || data; // Use secondaryData if provided, otherwise use data
            
            case 'url':
                return data.startsWith('http://') || data.startsWith('https://') ? data : 'https://' + data;
            
            case 'wifi':
                // Format: WIFI:T:WPA;S:NetworkName;P:Password;H:false;
                return `WIFI:T:WPA;S:${data};P:${secondaryData};H:false;`;
            
            case 'sms':
                // Format: SMS:number:message
                return `SMS:${data}:${secondaryData}`;
            
            case 'email':
                // Format: mailto:email?subject=subject&body=body
                const subject = encodeURIComponent('Subject');
                const body = encodeURIComponent(secondaryData);
                return `mailto:${data}?subject=${subject}&body=${body}`;
            
            case 'phone':
                // Format: tel:phonenumber
                return `tel:${data}`;
            
            case 'vcard':
                // Basic vCard format
                return `BEGIN:VCARD\nVERSION:3.0\nFN:${data}\nTEL:${secondaryData}\nEND:VCARD`;
            
            default:
                return data;
        }
    }

    /**
     * Generate QR code with frame and custom text
     * @param {string} data - Primary data to encode
     * @param {Object} options - Generation options
     * @returns {Promise<Buffer>} - PNG image buffer
     */
    async generateWithFrame(data, options = {}) {
        const opts = { ...this.defaultOptions, ...options };
        
        try {
            // Generate QR content based on type
            const qrContent = this.generateQRContent(
                data, 
                opts.contentType || 'url', 
                opts.secondaryData || opts.scanText || ''
            );

            // Generate the base QR code
            const qrBuffer = await QRCode.toBuffer(qrContent, {
                errorCorrectionLevel: opts.errorCorrectionLevel,
                type: 'png',
                quality: opts.quality,
                margin: opts.margin,
                color: opts.color,
                width: opts.width
            });

            // Get QR code dimensions
            const qrImage = sharp(qrBuffer);
            const { width: qrWidth, height: qrHeight } = await qrImage.metadata();

            // Calculate dimensions for the final image
            const frameWidth = opts.frameWidth;
            const padding = opts.padding;
            const textHeight = opts.fontSize + padding;
            
            const finalWidth = qrWidth + (frameWidth * 2) + (padding * 2);
            const finalHeight = qrHeight + (frameWidth * 2) + (padding * 2) + textHeight + padding;

            // Create the background with frame
            const background = sharp({
                create: {
                    width: finalWidth,
                    height: finalHeight,
                    channels: 3,
                    background: opts.frameColor
                }
            }).png();

            // Create inner white area
            const innerWidth = finalWidth - (frameWidth * 2);
            const innerHeight = finalHeight - (frameWidth * 2);
            
            const innerBackground = sharp({
                create: {
                    width: innerWidth,
                    height: innerHeight,
                    channels: 3,
                    background: '#FFFFFF'
                }
            }).png();

            // Position QR code
            const qrX = padding;
            const qrY = padding;

            // Create text overlay if provided
            let textSvg = '';
            const displayText = opts.displayText || opts.scanText || opts.scanTitle;
            if (displayText) {
                const lines = displayText.split('\n');
                const lineHeight = opts.fontSize + 5;
                const textY = qrHeight + padding + (opts.fontSize / 2) + 10;
                const textX = innerWidth / 2;
                
                let svgLines = '';
                lines.forEach((line, index) => {
                    if (line.trim()) {
                        const yPos = textY + (index * lineHeight);
                        svgLines += `
                            <text 
                                x="${textX}" 
                                y="${yPos}" 
                                font-family="${opts.fontFamily}" 
                                font-size="${opts.fontSize}" 
                                fill="${opts.textColor}" 
                                text-anchor="middle" 
                                dominant-baseline="middle"
                            >${line}</text>
                        `;
                    }
                });
                
                textSvg = `
                    <svg width="${innerWidth}" height="${innerHeight}">
                        ${svgLines}
                    </svg>
                `;
            }

            // Composite the final image
            let composite = [
                {
                    input: await innerBackground.toBuffer(),
                    top: frameWidth,
                    left: frameWidth
                },
                {
                    input: qrBuffer,
                    top: frameWidth + qrY,
                    left: frameWidth + qrX
                }
            ];

            // Add text if provided
            if (textSvg) {
                const textBuffer = Buffer.from(textSvg);
                composite.push({
                    input: textBuffer,
                    top: frameWidth,
                    left: frameWidth
                });
            }

            const finalImage = await background
                .composite(composite)
                .png()
                .toBuffer();

            return finalImage;

        } catch (error) {
            throw new Error(`Failed to generate enhanced QR code: ${error.message}`);
        }
    }

    /**
     * Generate simple QR code without frame
     * @param {string} text - Text to encode
     * @param {Object} options - Options
     * @returns {Promise<Buffer>} - PNG buffer
     */
    async generateSimple(text, options = {}) {
        const opts = { ...this.defaultOptions, ...options };
        return await QRCode.toBuffer(text, opts);
    }
}

module.exports = EnhancedQRGenerator;
