function isValidURL(url) {
    try {
        // Add protocol if missing
        const urlToTest = url.startsWith('http://') || url.startsWith('https://') ? url : 'https://' + url;
        new URL(urlToTest);
        return true;
    } catch (error) {
        return false;
    }
}

function normalizeURL(url) {
    // Add protocol if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return 'https://' + url;
    }
    return url;
}

module.exports = {
    isValidURL,
    normalizeURL,
};