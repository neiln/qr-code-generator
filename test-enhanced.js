#!/usr/bin/env node

const { generateQRCode, generateQRCodeDataURL } = require('./src/generator/qr');
const EnhancedQRGenerator = require('./src/generator/enhanced-qr');
const fs = require('fs');

async function testEnhancedQR() {
    const enhancedGenerator = new EnhancedQRGenerator();
    
    console.log('🧪 Testing Enhanced QR Code Generator...\n');

    // Test 1: Plain Text QR Code
    console.log('📝 Test 1: Plain Text QR Code');
    try {
        const textBuffer = await enhancedGenerator.generateWithFrame('Hello World!', {
            contentType: 'text',
            scanTitle: 'Plain Text',
            frameColor: '#0066cc',
            textColor: '#333333'
        });
        fs.writeFileSync('test_text_qr.png', textBuffer);
        console.log('✅ Plain text QR code generated: test_text_qr.png');
    } catch (error) {
        console.error('❌ Plain text test failed:', error.message);
    }

    // Test 2: URL QR Code
    console.log('\n🌐 Test 2: URL QR Code');
    try {
        const urlBuffer = await enhancedGenerator.generateWithFrame('https://github.com', {
            contentType: 'url',
            scanTitle: 'Visit GitHub',
            frameColor: '#28a745',
            textColor: '#333333'
        });
        fs.writeFileSync('test_url_qr.png', urlBuffer);
        console.log('✅ URL QR code generated: test_url_qr.png');
    } catch (error) {
        console.error('❌ URL test failed:', error.message);
    }

    // Test 3: WiFi QR Code
    console.log('\n📶 Test 3: WiFi QR Code');
    try {
        const wifiBuffer = await enhancedGenerator.generateWithFrame('MyWiFiNetwork', {
            contentType: 'wifi',
            secondaryData: 'password123',
            scanTitle: 'Connect to WiFi',
            frameColor: '#6f42c1',
            textColor: '#333333'
        });
        fs.writeFileSync('test_wifi_qr.png', wifiBuffer);
        console.log('✅ WiFi QR code generated: test_wifi_qr.png');
    } catch (error) {
        console.error('❌ WiFi test failed:', error.message);
    }

    // Test 4: SMS QR Code
    console.log('\n💬 Test 4: SMS QR Code');
    try {
        const smsBuffer = await enhancedGenerator.generateWithFrame('+1234567890', {
            contentType: 'sms',
            secondaryData: 'Hello from QR code!',
            scanTitle: 'Send SMS',
            frameColor: '#fd7e14',
            textColor: '#333333'
        });
        fs.writeFileSync('test_sms_qr.png', smsBuffer);
        console.log('✅ SMS QR code generated: test_sms_qr.png');
    } catch (error) {
        console.error('❌ SMS test failed:', error.message);
    }

    // Test 5: Email QR Code
    console.log('\n📧 Test 5: Email QR Code');
    try {
        const emailBuffer = await enhancedGenerator.generateWithFrame('contact@example.com', {
            contentType: 'email',
            secondaryData: 'Hello! I scanned your QR code.',
            scanTitle: 'Send Email',
            frameColor: '#dc3545',
            textColor: '#333333'
        });
        fs.writeFileSync('test_email_qr.png', emailBuffer);
        console.log('✅ Email QR code generated: test_email_qr.png');
    } catch (error) {
        console.error('❌ Email test failed:', error.message);
    }

    console.log('\n🎉 All tests completed! Check the generated PNG files.');
    console.log('\n📱 To test scanning:');
    console.log('   - Plain text should show: "Hello World!"');
    console.log('   - URL should open: https://github.com');
    console.log('   - WiFi should connect to: MyWiFiNetwork with password123');
    console.log('   - SMS should compose message to: +1234567890');
    console.log('   - Email should compose email to: contact@example.com');
}

testEnhancedQR().catch(console.error);
