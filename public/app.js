'use strict';

const $ = id => document.getElementById(id);
const form = $('qrForm');
const colorIds = ['qrColor', 'backgroundColor', 'frameColor', 'textColor'];
const presets = { classic: '#000000', ocean: '#075b70', forest: '#205c3b', sunset: '#9a3412' };
const contentFields = {
    url: ['Website URL', 'https://example.com', 'Opens this website when scanned. Replace the example with your link.'],
    text: ['Text to encode', 'Write something to share…', 'Displays exactly this text when scanned.'],
    wifi: ['Network name (SSID)', 'Guest Wi-Fi', 'Creates a connection request for a WPA/WPA2 network.', 'Wi-Fi password'],
    sms: ['Phone number', '+1 555 123 4567', 'Opens a text message to this number.', 'Message (optional)'],
    email: ['Email address', 'hello@example.com', 'Opens an email to this address.', 'Email body (optional)'],
    phone: ['Phone number', '+1 555 123 4567', 'Opens the dialer with this number.'],
    vcard: ['Full name', 'Alex Morgan', 'Creates a contact with a name and phone number.', 'Phone number (optional)']
};
let contentType = 'url';
const drafts = {};
let timer;
let requestVersion = 0;
let controller;
let imageUrl;
let logoData;
let logoVersion = 0;
let logoReading = false;
let logoError = '';

function setStatus(message) { $('previewStatus').textContent = message; }
function setColor(id, value) { $(id).value = value; $(id + 'Hex').value = value; }
function updateControls() {
    for (const id of ['frameWidth', 'padding', 'fontSize', 'logoSize']) {
        $(id + 'Value').value = $(id).value + (id === 'logoSize' ? '%' : ' px');
    }
    const frameDisabled = !$('frameEnabled').checked;
    for (const id of ['frameColor', 'frameColorHex', 'frameWidth']) $(id).disabled = frameDisabled;
    for (const button of document.querySelectorAll('[data-preset]')) {
        const color = presets[button.dataset.preset];
        const matches = ['qrColorHex', 'frameColorHex', 'textColorHex'].every(id => $(id).value.toLowerCase() === color)
            && $('backgroundColorHex').value.toLowerCase() === '#ffffff';
        button.setAttribute('aria-pressed', String(matches));
    }
    updateContrast();
}
function updateContrast() {
    const luminance = hex => {
        const rgb = hex.slice(1).match(/../g).map(channel => {
            const value = parseInt(channel, 16) / 255;
            return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        });
        return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
    };
    const valid = ['qrColorHex', 'backgroundColorHex'].every(id => /^#[a-f0-9]{6}$/i.test($(id).value));
    $('contrastNote').hidden = !valid;
    if (!valid) return;
    const dark = luminance($('qrColorHex').value);
    const light = luminance($('backgroundColorHex').value);
    const good = light > dark && (light + 0.05) / (dark + 0.05) >= 4.5;
    $('contrastNote').classList.toggle('warning', !good);
    $('contrastIcon').textContent = good ? '✓' : '!';
    $('contrastTitle').textContent = good ? 'Strong contrast' : 'This may be difficult to scan';
    $('contrastDescription').textContent = good
        ? 'Dark code, light background. A good starting point for scanning.'
        : 'Try a darker QR color and a lighter background, then scan-test the result.';
}
function updateContentType() {
    drafts[contentType] = { primary: $('url').value, secondary: $('secondaryData').value };
    contentType = $('contentType').value;
    const [label, placeholder, note, secondary] = contentFields[contentType];
    $('primaryLabel').textContent = label;
    $('url').placeholder = placeholder;
    $('url').value = drafts[contentType]?.primary || '';
    $('url').rows = contentType === 'text' ? 4 : 2;
    $('url').inputMode = ['phone', 'sms'].includes(contentType) ? 'tel' : contentType === 'email' ? 'email' : 'text';
    $('contentNote').textContent = note;
    $('secondaryGroup').hidden = !secondary;
    $('secondaryData').disabled = !secondary;
    $('secondaryLabel').textContent = secondary || '';
    $('secondaryData').value = drafts[contentType]?.secondary || '';
    $('secondaryData').type = contentType === 'wifi' ? 'password' : 'text';
    $('secondaryData').placeholder = contentType === 'wifi' ? 'Network password' : '';
}
function invalidatePreview() {
    clearTimeout(timer);
    requestVersion++;
    controller?.abort();
    $('downloadBtn').disabled = true;
    $('previewCanvas').setAttribute('aria-busy', 'true');
    $('previewBadge').hidden = $('qrImage').hidden;
    $('previewBadge').textContent = 'Updating…';
    $('error').hidden = true;
    $('retryButton').hidden = true;
}
function showError(message, retry = false) {
    $('error').textContent = message;
    $('error').hidden = false;
    $('retryButton').hidden = !retry;
    $('previewCanvas').setAttribute('aria-busy', 'false');
    $('previewBadge').hidden = $('qrImage').hidden;
    $('previewBadge').textContent = 'Preview out of date';
    setStatus('Update the settings to generate a new code.');
}
function schedulePreview() {
    invalidatePreview();
    updateControls();
    setStatus('Updating preview…');
    timer = setTimeout(generatePreview, 350);
}
function collectOptions() {
    return {
        url: $('url').value, contentType,
        secondaryData: $('secondaryData').disabled ? '' : $('secondaryData').value,
        scanText: $('scanText').value, scanTitle: $('scanTitle').value,
        qrColor: $('qrColor').value, backgroundColor: $('backgroundColor').value,
        frameColor: $('frameColor').value, textColor: $('textColor').value,
        frameWidth: $('frameEnabled').checked ? Number($('frameWidth').value) : 0,
        padding: Number($('padding').value), fontSize: Number($('fontSize').value),
        fontFamily: $('fontFamily').value, width: Number($('width').value),
        logoSize: Number($('logoSize').value), ...(logoData ? { logoData } : {})
    };
}
async function generatePreview() {
    const version = requestVersion;
    if (logoReading) { setStatus('Reading your logo…'); return; }
    if (logoError) { showError(logoError); return; }
    if (!$('url').value.trim()) {
        $('qrImage').hidden = true;
        $('emptyPreview').hidden = false;
        $('previewBadge').hidden = true;
        $('previewCanvas').setAttribute('aria-busy', 'false');
        $('dimensions').textContent = 'No code generated';
        setStatus('Enter content to see your QR code.');
        return;
    }
    if (!form.checkValidity()) {
        showError('Check the highlighted fields. Colors need a # followed by six hex digits.');
        return;
    }
    controller = new AbortController();
    let nextUrl;
    try {
        const response = await fetch('/api/generate-enhanced', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(collectOptions()), signal: controller.signal
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Could not generate the code (${response.status}). Try again.`);
        }
        const blob = await response.blob();
        if (version !== requestVersion) return;
        nextUrl = URL.createObjectURL(blob);
        const image = new Image();
        image.src = nextUrl;
        await image.decode();
        if (version !== requestVersion) { URL.revokeObjectURL(nextUrl); return; }
        const previousUrl = imageUrl;
        imageUrl = nextUrl;
        $('qrImage').src = imageUrl;
        $('qrImage').hidden = false;
        $('emptyPreview').hidden = true;
        $('previewBadge').hidden = true;
        $('previewCanvas').setAttribute('aria-busy', 'false');
        $('dimensions').textContent = `${image.naturalWidth} × ${image.naturalHeight} px`;
        $('downloadBtn').disabled = false;
        setStatus('Preview is up to date.');
        if (previousUrl) URL.revokeObjectURL(previousUrl);
    } catch (error) {
        if (nextUrl) URL.revokeObjectURL(nextUrl);
        if (error.name === 'AbortError' || version !== requestVersion) return;
        showError(error.message === 'Failed to fetch' ? 'Cannot reach the generator. Check your connection and try again.' : error.message, true);
    }
}

for (const id of colorIds) {
    $(id).addEventListener('input', () => { $(id + 'Hex').value = $(id).value; });
    $(id + 'Hex').addEventListener('input', () => {
        const value = $(id + 'Hex').value;
        if (/^#[a-f0-9]{6}$/i.test(value)) $(id).value = value;
    });
}
$('contentType').addEventListener('change', () => { updateContentType(); schedulePreview(); });
form.addEventListener('input', event => {
    if (event.target.id !== 'logoInput' && event.target.id !== 'contentType') schedulePreview();
});
$('width').addEventListener('change', schedulePreview);
form.addEventListener('submit', event => {
    event.preventDefault();
    invalidatePreview();
    updateControls();
    generatePreview();
});
for (const button of document.querySelectorAll('[data-preset]')) {
    button.addEventListener('click', () => {
        for (const id of ['qrColor', 'frameColor', 'textColor']) setColor(id, presets[button.dataset.preset]);
        setColor('backgroundColor', '#ffffff');
        schedulePreview();
    });
}
$('resetStyle').addEventListener('click', () => {
    for (const id of colorIds) setColor(id, id === 'backgroundColor' ? '#ffffff' : '#000000');
    $('frameEnabled').checked = true;
    $('frameWidth').value = 10;
    $('padding').value = 20;
    $('fontFamily').value = 'Arial';
    $('fontSize').value = 24;
    $('logoSize').value = 18;
    schedulePreview();
});
$('logoInput').addEventListener('change', async () => {
    const version = ++logoVersion;
    const file = $('logoInput').files[0];
    if (!file) return;
    invalidatePreview();
    logoData = undefined;
    logoError = '';
    logoReading = true;
    $('logoControls').hidden = false;
    $('logoPreview').hidden = true;
    $('logoPlaceholder').hidden = false;
    $('logoNote').textContent = file.name;
    setStatus('Reading your logo…');
    try {
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Choose a PNG, JPEG, or WebP logo.');
        if (file.size > 512 * 1024) throw new Error('Logo image must be 512 KB or smaller.');
        const data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Could not read this logo. Try another image.'));
            reader.readAsDataURL(file);
        });
        const image = new Image();
        image.src = data;
        await image.decode().catch(() => { throw new Error('Could not read this logo. Try another image.'); });
        if (image.naturalWidth * image.naturalHeight > 16000000) throw new Error('Choose a logo with at most 16 megapixels.');
        if (version !== logoVersion) return;
        logoData = data;
        $('logoPreview').src = data;
        $('logoPreview').hidden = false;
        $('logoPlaceholder').hidden = true;
    } catch (error) {
        if (version !== logoVersion) return;
        logoError = error.message;
    } finally {
        if (version === logoVersion) { logoReading = false; schedulePreview(); }
    }
});
$('removeLogo').addEventListener('click', () => {
    logoVersion++;
    logoReading = false;
    logoData = undefined;
    logoError = '';
    $('logoInput').value = '';
    $('logoPreview').removeAttribute('src');
    $('logoPreview').hidden = true;
    $('logoPlaceholder').hidden = false;
    $('logoControls').hidden = true;
    $('logoNote').textContent = 'PNG, JPEG or WebP. Up to 512 KB.';
    schedulePreview();
});
$('downloadBtn').addEventListener('click', () => {
    if (!imageUrl || $('downloadBtn').disabled) return;
    const name = $('filename').value.trim().replace(/\.png$/i, '').replace(/[<>:"/\\|?*\x00-\x1F]/g, '-').slice(0, 80) || 'my-qr-code';
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${name}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setStatus('Download started. Scan-test the PNG before sharing.');
});
window.addEventListener('pagehide', event => {
    if (event.persisted) return;
    controller?.abort();
    if (imageUrl) URL.revokeObjectURL(imageUrl);
});
window.addEventListener('pageshow', event => {
    if (event.persisted && $('downloadBtn').disabled) schedulePreview();
});
updateControls();
generatePreview();
