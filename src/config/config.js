const config = {
    PORT: process.env.PORT || 3000,
    QR_CODE_OPTIONS: {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
    },
};

module.exports = config;