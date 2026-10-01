const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

async function editor(t, fetchImpl) {
    const dom = new JSDOM(fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8'), {
        url: 'http://localhost', runScripts: 'outside-only'
    });
    t.after(() => dom.window.close());
    const w = dom.window;
    const liveBlobs = new Set();
    let sequence = 0;
    w.URL.createObjectURL = () => { const url = `blob:preview-${++sequence}`; liveBlobs.add(url); return url; };
    w.URL.revokeObjectURL = url => liveBlobs.delete(url);
    w.Image = class { naturalWidth = 572; naturalHeight = 572; decode() { return Promise.resolve(); } };
    w.fetch = fetchImpl || (async () => ({ ok: true, blob: async () => new w.Blob() }));
    w.eval(fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8'));
    await new Promise(setImmediate);
    return { w, liveBlobs, get: id => w.document.getElementById(id) };
}

test('returning from the browser cache retains a usable download URL', async t => {
    const { w, liveBlobs, get } = await editor(t);
    assert.equal(get('downloadBtn').disabled, false);
    const imageUrl = get('qrImage').src;
    w.dispatchEvent(new w.PageTransitionEvent('pagehide', { persisted: true }));
    w.dispatchEvent(new w.PageTransitionEvent('pageshow', { persisted: true }));
    assert.ok(liveBlobs.has(imageUrl), 'Restored download must still reference a live PNG');
});

test('editing invalid settings immediately prevents downloading the previous code', async t => {
    const { w, get } = await editor(t);
    assert.equal(get('downloadBtn').disabled, false);
    get('qrColorHex').value = '#bad';
    get('qrColorHex').dispatchEvent(new w.Event('input', { bubbles: true }));
    assert.equal(get('downloadBtn').disabled, true);
    get('qrForm').dispatchEvent(new w.Event('submit', { cancelable: true }));
    assert.equal(get('error').hidden, false);
    assert.equal(get('downloadBtn').disabled, true);
});

test('late responses cannot overwrite a newer preview', async t => {
    const pending = [];
    const { w, get } = await editor(t, () => new Promise(resolve => pending.push(resolve)));
    get('url').value = 'https://new.example';
    get('qrForm').dispatchEvent(new w.Event('submit', { cancelable: true }));
    pending[1]({ ok: true, blob: async () => new w.Blob() });
    await new Promise(setImmediate);
    const latestUrl = get('qrImage').src;
    assert.equal(get('downloadBtn').disabled, false);
    pending[0]({ ok: true, blob: async () => new w.Blob() });
    await new Promise(setImmediate);
    assert.equal(get('qrImage').src, latestUrl);
});
