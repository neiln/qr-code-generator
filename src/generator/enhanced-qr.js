const QRCode = require('qrcode');
const sharp = require('sharp');

const QR_STYLES = { classic: '#000000', ocean: '#075B70', forest: '#205C3B', sunset: '#9A3412' };
const FONTS = ['Arial', 'Verdana', 'Georgia', 'monospace'];
const escapeXml = text => text.replace(/[<>&"']/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[char]));

class EnhancedQRGenerator {
    constructor() {
        this.defaultOptions = {
            errorCorrectionLevel: 'M', type: 'png', margin: 4,
            color: { dark: '#000000', light: '#FFFFFF' }, width: 300,
            frameColor: '#000000', frameWidth: 10, backgroundColor: '#FFFFFF',
            textColor: '#000000', fontSize: 24, fontFamily: 'Arial', padding: 20, logoSize: 18
        };
    }

    generateQRContent(data, contentType = 'url', secondaryData = '') {
        switch (contentType) {
            case 'text': return secondaryData || data;
            case 'url': return /^https?:\/\//i.test(data) ? data : 'https://' + data;
            case 'wifi': {
                const escape = value => value.replace(/[\\;,:\"]/g, char => '\\' + char);
                return `WIFI:T:WPA;S:${escape(data)};P:${escape(secondaryData)};H:false;`;
            }
            case 'sms': return `SMS:${data}:${secondaryData}`;
            case 'email': return `mailto:${data}?subject=Subject&body=${encodeURIComponent(secondaryData)}`;
            case 'phone': return `tel:${data}`;
            case 'vcard': return `BEGIN:VCARD\nVERSION:3.0\nFN:${data}\nTEL:${secondaryData}\nEND:VCARD`;
            default: return data;
        }
    }

    async generateWithFrame(data, options = {}) {
        const opts = { ...this.defaultOptions, ...options };
        const qrContent = this.generateQRContent(data, opts.contentType || 'url', opts.secondaryData || '');
        let qrBuffer = await QRCode.toBuffer(qrContent, {
            errorCorrectionLevel: opts.logoBuffer ? 'H' : opts.errorCorrectionLevel,
            type: 'png', margin: Math.max(4, opts.margin), width: opts.width,
            color: { dark: opts.qrColor || QR_STYLES[opts.qrStyle] || QR_STYLES.classic, light: opts.backgroundColor }
        });
        const { width: qrWidth, height: qrHeight } = await sharp(qrBuffer).metadata();

        if (opts.logoBuffer) {
            const logoSize = Math.round(qrWidth * Math.min(22, Math.max(10, opts.logoSize)) / 100);
            const plateSize = Math.round(logoSize * 1.2);
            const logo = await sharp(opts.logoBuffer, { limitInputPixels: 16000000 })
                .rotate().resize(logoSize, logoSize, { fit: 'contain', background: opts.backgroundColor }).png().toBuffer();
            const plate = await sharp({ create: { width: plateSize, height: plateSize, channels: 3, background: opts.backgroundColor } }).png().toBuffer();
            qrBuffer = await sharp(qrBuffer).composite([
                { input: plate, left: Math.floor((qrWidth - plateSize) / 2), top: Math.floor((qrHeight - plateSize) / 2) },
                { input: logo, left: Math.floor((qrWidth - logoSize) / 2), top: Math.floor((qrHeight - logoSize) / 2) }
            ]).png().toBuffer();
        }

        // Captions are presentation only. Legacy displayText remains a bottom caption.
        const topLines = (opts.scanText || '').split('\n').filter(line => line.trim());
        const bottomLines = (opts.scanTitle || opts.displayText || '').split('\n').filter(line => line.trim());
        const lineHeight = Math.ceil(opts.fontSize * 1.25);
        const gap = 12;
        const topHeight = topLines.length ? topLines.length * lineHeight + gap : 0;
        const bottomHeight = bottomLines.length ? bottomLines.length * lineHeight + gap : 0;
        const inset = opts.frameWidth + opts.padding;
        const finalWidth = qrWidth + inset * 2;
        const finalHeight = qrHeight + inset * 2 + topHeight + bottomHeight;
        const inner = await sharp({ create: {
            width: finalWidth - opts.frameWidth * 2, height: finalHeight - opts.frameWidth * 2,
            channels: 3, background: opts.backgroundColor
        } }).png().toBuffer();
        const composite = [
            { input: inner, top: opts.frameWidth, left: opts.frameWidth },
            { input: qrBuffer, top: inset + topHeight, left: inset }
        ];
        const font = FONTS.includes(opts.fontFamily) ? opts.fontFamily : 'Arial';
        const addCaption = async (line, top) => {
            // Measure real glyphs, then fit the rendered line inside its caption area.
            const { data: input, info } = await sharp({ text: {
                text: `<span foreground="${opts.textColor}">${escapeXml(line)}</span>`,
                font: `${font} ${opts.fontSize}`, dpi: 72, rgba: true
            } }).resize({ width: qrWidth - 4, height: lineHeight, fit: 'inside', withoutEnlargement: true })
                .png().toBuffer({ resolveWithObject: true });
            composite.push({ input, left: Math.floor((finalWidth - info.width) / 2),
                top: top + Math.floor((lineHeight - info.height) / 2) });
        };
        for (const [i, line] of topLines.entries()) await addCaption(line, inset + i * lineHeight);
        for (const [i, line] of bottomLines.entries()) {
            await addCaption(line, inset + topHeight + qrHeight + gap + i * lineHeight);
        }
        return sharp({ create: { width: finalWidth, height: finalHeight, channels: 3, background: opts.frameColor } })
            .composite(composite).png().toBuffer();
    }

    async generateSimple(text, options = {}) {
        return QRCode.toBuffer(text, { ...this.defaultOptions, ...options });
    }
}

module.exports = EnhancedQRGenerator;
