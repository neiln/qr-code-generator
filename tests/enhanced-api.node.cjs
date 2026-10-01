const { before, after, test } = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const app = require('../src/index');
let server;
let base;
before(async () => {
    server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise(resolve => server.close(resolve)));
const generate = body => fetch(`${base}/api/generate-enhanced`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
});

test('the API exports the requested size, zero border and custom background', async () => {
    const response = await generate({ url: 'example.com', width: 512, padding: 0, frameWidth: 0, backgroundColor: '#fff0dd' });
    assert.equal(response.status, 200);
    const image = Buffer.from(await response.arrayBuffer());
    const metadata = await sharp(image).metadata();
    assert.deepEqual([metadata.width, metadata.height], [512, 512]);
    const data = await sharp(image).removeAlpha().raw().toBuffer();
    assert.deepEqual([...data.subarray(0, 3)], [255, 240, 221]);
});

test('the API keeps display captions out of encoded content', async () => {
    const response = await generate({ url: 'Original', contentType: 'text', scanText: 'Caption', width: 300, padding: 0, frameWidth: 0 });
    const image = Buffer.from(await response.arrayBuffer());
    const expected = await require('qrcode').toBuffer('Original', { width: 300, margin: 4, errorCorrectionLevel: 'M' });
    const actualPixels = await sharp(image).extract({ left: 0, top: 42, width: 300, height: 300 }).removeAlpha().raw().toBuffer();
    const expectedPixels = await sharp(expected).removeAlpha().raw().toBuffer();
    assert.ok(actualPixels.equals(expectedPixels), 'Caption must not replace the encoded value');
});

for (const invalid of [
    { width: 99999 }, { padding: -1 }, { frameWidth: '0' }, { fontSize: null },
    { qrColor: 'red' }, { fontFamily: 'unexpected' }, { logoSize: 50 },
    { contentType: 'unknown' }, { url: 123 }, { scanText: {} }, { scanTitle: 'a'.repeat(101) }
]) {
    test(`invalid customization returns a helpful 400: ${JSON.stringify(invalid)}`, async () => {
        const response = await generate({ url: 'example.com', ...invalid });
        assert.equal(response.status, 400);
        assert.equal(typeof (await response.json()).error, 'string');
    });
}

test('corrupt logo files return an actionable client error', async () => {
    const response = await generate({ url: 'example.com', logoData: 'data:image/png;base64,YmFk' });
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /logo/i);
});
