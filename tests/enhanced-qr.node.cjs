const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const QRCode = require('qrcode');
const sharp = require('sharp');
const EnhancedQRGenerator = require('../src/generator/enhanced-qr');

const generator = new EnhancedQRGenerator();
const pixels = buffer => sharp(buffer).removeAlpha().raw().toBuffer();

describe('Enhanced QR output', () => {
    test('an unframed code without captions has no unused caption space', async () => {
        const result = await generator.generateWithFrame('example.com', { width: 512, frameWidth: 0, padding: 0 });
        const metadata = await sharp(result).metadata();
        assert.deepEqual([metadata.width, metadata.height], [512, 512]);
    });

    test('a caption never replaces encoded text', async () => {
        const result = await generator.generateWithFrame('Original content', {
            contentType: 'text', scanText: 'Caption only', frameWidth: 0, padding: 0, width: 300
        });
        const expected = await QRCode.toBuffer('Original content', { width: 300, margin: 4, errorCorrectionLevel: 'M' });
        // Top caption is 30px high with a 12px gap; compare the actual QR pixels.
        const cropped = await sharp(result).extract({ left: 0, top: 42, width: 300, height: 300 }).png().toBuffer();
        assert.ok((await pixels(cropped)).equals(await pixels(expected)), 'QR pixels must encode only the intended content');
    });

    test('a display caption cannot become a Wi-Fi password', async () => {
        const result = await generator.generateWithFrame('Guest', {
            contentType: 'wifi', scanText: 'Join us', frameWidth: 0, padding: 0, width: 300
        });
        const expected = await QRCode.toBuffer('WIFI:T:WPA;S:Guest;P:;H:false;', {
            width: 300, margin: 4, errorCorrectionLevel: 'M'
        });
        const cropped = await sharp(result).extract({ left: 0, top: 42, width: 300, height: 300 }).png().toBuffer();
        assert.ok((await pixels(cropped)).equals(await pixels(expected)), 'QR pixels must encode only the intended content');
    });

    test('custom foreground and background colors reach the exported pixels', async () => {
        const result = await generator.generateWithFrame('example.com', {
            qrColor: '#123456', backgroundColor: '#fff0dd', frameWidth: 0, padding: 0
        });
        const data = await pixels(result);
        assert.deepEqual([...data.subarray(0, 3)], [255, 240, 221]);
        assert.ok(data.includes(Buffer.from([18, 52, 86])));
    });

    test('captions render XML characters literally without breaking the image', async () => {
        await assert.doesNotReject(() => generator.generateWithFrame('example.com', {
            scanText: 'Food & drinks <today>', scanTitle: '"Welcome"', fontFamily: 'Georgia'
        }));
    });

    test('two captions get separate space above and below the code', async () => {
        const result = await generator.generateWithFrame('example.com', {
            scanText: 'Open menu', scanTitle: 'At the table', width: 300, frameWidth: 0, padding: 0
        });
        const metadata = await sharp(result).metadata();
        assert.deepEqual([metadata.width, metadata.height], [300, 384]);
    });

    test('logo size changes the actual exported logo', async () => {
        const logoBuffer = await sharp({ create: { width: 20, height: 20, channels: 3, background: '#ff0000' } }).png().toBuffer();
        const countRed = async logoSize => {
            const result = await generator.generateWithFrame('example.com', { logoBuffer, logoSize, width: 500 });
            const data = await pixels(result);
            let count = 0;
            for (let i = 0; i < data.length; i += 3) {
                if (data[i] === 255 && data[i + 1] === 0 && data[i + 2] === 0) count++;
            }
            return count;
        };
        assert.ok(await countRed(20) > await countRed(10));
    });

    test('wide captions fit inside the image without clipping at either edge', async () => {
        const result = await generator.generateWithFrame('example.com', {
            scanText: 'W'.repeat(40), width: 256, frameWidth: 0, padding: 0,
            fontSize: 48, textColor: '#ff0000', fontFamily: 'Verdana'
        });
        const data = await pixels(result);
        const redAt = (x, y) => {
            const offset = (y * 256 + x) * 3;
            return data[offset] > data[offset + 1] + 20;
        };
        assert.ok(data.includes(Buffer.from([255, 0, 0])), 'Caption must be visible');
        for (let y = 0; y < 60; y++) {
            assert.equal(redAt(0, y) || redAt(255, y), false, 'Caption must not be clipped at an edge');
        }
    });
});
