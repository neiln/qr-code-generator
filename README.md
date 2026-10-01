# QR Code Generator

A powerful and easy-to-use QR Code generator for URLs built with Node.js. This project provides multiple ways to generate QR codes: a web interface, REST API, and command-line interface.

## Features

- 🌐 **Web Interface**: User-friendly web UI for generating QR codes
- 🔌 **REST API**: Generate QR codes programmatically
- 💻 **CLI Tool**: Command-line interface for batch processing
- ✅ **URL Validation**: Automatic URL validation and normalization
- 📱 **Multiple Formats**: Generate QR codes as PNG images or data URLs
- 🎨 **Enhanced QR Codes**: Add frames, custom text, and styling
- 📊 **Multiple Content Types**: Support for URLs, plain text, WiFi, SMS, email, phone, and vCard
- 🧪 **Fully Tested**: Comprehensive test suite included

## Content Types Supported

When you scan the QR codes, different content types will trigger different actions:

- **URL**: Opens the website in a browser
- **Plain Text**: Displays the text message
- **WiFi**: Automatically connects to the WiFi network
- **SMS**: Opens SMS app with pre-filled message
- **Email**: Opens email app with pre-filled recipient and message
- **Phone**: Dials the phone number
- **vCard**: Adds contact information to address book

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
  - [Web Interface](#web-interface)
  - [Command Line](#command-line)
  - [API](#api)
- [Testing](#testing)
- [Configuration](#configuration)
- [License](#license)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/qr-code-generator.git
   ```

2. Navigate to the project directory:
   ```bash
   cd qr-code-generator
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

## Usage

### Web Interface

Start the web server:

```bash
npm start
```

Then open your browser and go to `http://localhost:3000`. You'll see an enhanced web interface where you can:

- **Choose content type**: URL, Text, WiFi, SMS, Email, Phone, or vCard
- **Enter primary data**: The main information (URL, text, network name, etc.)
- **Add secondary data**: Passwords, messages, phone numbers, etc.
- **Customize appearance**: Frame colors, text colors, sizes
- **Add custom text**: Text that appears under the QR code
- **Download QR codes**: High-quality PNG images

### Customization editor

The web editor updates the PNG preview automatically as you type. On desktop,
preview and export stay beside the controls; on mobile they appear between
Content and Appearance.

- Choose a preset or enter custom six-digit hex colors for the QR, background,
  frame and text. Contrast guidance helps identify combinations that may scan poorly.
- Turn the frame off, change its thickness, or add outer padding. The QR retains
  a four-module clear margin independently of outer padding.
- Add independent captions above and below the code; select a font and text size.
  Captions never change the encoded content, and long captions shrink to fit.
- Upload a PNG, JPEG or WebP logo (512 KB and 16 megapixels maximum), preview it,
  adjust its size from 10–22%, or remove it. Logos use high error correction.
- Export a 256, 512, 1024 or 2048-pixel QR with a custom filename. Frames, captions
  and padding add to these dimensions; the preview reports the final PNG size.

Downloads are disabled while the preview is updating or settings are invalid.
Content drafts are kept separately for each type during the current session.
Scan-test the final PNG before printing or sharing, especially with custom colors
or a logo. Contrast guidance is not a guarantee of scanability.

Additional enhanced API options:

| Option | Accepted values | Default |
| --- | --- | --- |
| `qrColor` | Six-digit hex color; overrides `qrStyle` | Preset color |
| `backgroundColor` | Six-digit hex color | `#FFFFFF` |
| `width` | Integer from 256–2048 | 300 |
| `padding` | Integer from 0–64 px | 20 |
| `frameWidth` | Integer from 0–50 px; 0 removes frame | 10 |
| `fontSize` | Integer from 12–48 px | 24 |
| `fontFamily` | Arial, Verdana, Georgia, monospace | Arial |
| `logoData` | Base64 PNG, JPEG or WebP data URL | None |
| `logoSize` | Integer from 10–22 (% of QR width) | 18 |
| `scanText` / `scanTitle` | Above / below caption, up to 100 characters each | Empty |

The API returns JSON with an `error` message and status 400 for invalid options.
`npm test` runs the existing Jest tests and native Node tests for PNG rendering
and HTTP validation. Use Node.js 20 or newer. The native runner avoids the old
Jest resolver's incompatibility with Sharp's platform-specific package exports.

### Command Line

The enhanced CLI supports multiple content types:

```bash
# Basic URL QR code
npm run cli https://example.com

# Plain text QR code with enhanced styling
node src/cli.js "Welcome to our event!" --type text --title "Event Info" --enhanced

# WiFi QR code
node src/cli.js MyWiFiNetwork --type wifi --secondary password123 --enhanced

# SMS QR code
node src/cli.js +1234567890 --type sms --secondary "Hello from QR code!" --enhanced

# Email QR code
node src/cli.js contact@example.com --type email --secondary "Hello there!" --enhanced

# Help
node src/cli.js --help
```

### API

#### Start the Server

```bash
npm run dev
```

#### Enhanced API Endpoint

**POST /api/generate-enhanced** - Generate enhanced QR code with frames and text

```bash
curl -X POST http://localhost:3000/api/generate-enhanced \
  -H "Content-Type: application/json" \
  -d '{
    "url": "Welcome to our event!",
    "contentType": "text",
    "scanTitle": "Event QR Code",
    "frameColor": "#0066cc",
    "textColor": "#333333"
  }' \
  --output enhanced_qr.png
```

**Request Parameters:**
- `url` (string): Primary data to encode
- `contentType` (string): Type of content - "url", "text", "wifi", "sms", "email", "phone", "vcard"
- `secondaryData` (string): Secondary data (password, message, etc.)
- `scanText` (string): Custom text for scanning
- `scanTitle` (string): Title text under QR code
- `frameColor` (string): Frame color (hex format)
- `textColor` (string): Text color (hex format)
- `frameWidth` (number): Frame width in pixels
- `fontSize` (number): Font size for text

#### Content Type Examples

**Plain Text:**
```json
{
  "url": "Hello World!",
  "contentType": "text",
  "scanTitle": "Welcome Message"
}
```

**WiFi Network:**
```json
{
  "url": "MyWiFiNetwork",
  "contentType": "wifi",
  "secondaryData": "password123",
  "scanTitle": "Connect to WiFi"
}
```

**SMS Message:**
```json
{
  "url": "+1234567890",
  "contentType": "sms",
  "secondaryData": "Hello from QR code!",
  "scanTitle": "Send SMS"
}
```

#### Original API Endpoints

**POST /generate** - Generate simple QR code as PNG image

```bash
curl -X POST http://localhost:3000/generate \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}' \
  --output qrcode.png
```

**POST /generate-data-url** - Generate QR code as data URL

```bash
curl -X POST http://localhost:3000/generate-data-url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

**GET /health** - Health check

```bash
curl http://localhost:3000/health
```

## Testing

Run the test suite:

```bash
npm test
```

Test the enhanced functionality:

```bash
node test-enhanced.js
```

This will generate sample QR codes for all content types:
- Plain text QR code
- URL QR code
- WiFi QR code
- SMS QR code
- Email QR code

Each with frames and custom styling to demonstrate the enhanced features.

## Configuration

The application can be configured through environment variables:

- `PORT`: Server port (default: 3000)
- Other QR code options can be modified in `src/config/config.js`

## Project Structure

```
src/
├── index.js                    # Main server file
├── cli.js                      # Enhanced command-line interface
├── config/
│   └── config.js              # Configuration settings
├── generator/
│   ├── qr.js                  # Basic QR code generation
│   └── enhanced-qr.js         # Enhanced QR with frames and text
└── utils/
    └── validators.js          # URL validation utilities
tests/
└── qr.test.js                # Test suite
public/
└── index.html                # Enhanced web interface
test-enhanced.js              # Enhanced functionality tests
```

## What's New in Enhanced Version

### 🎨 Visual Enhancements
- **Custom frames** around QR codes with configurable colors and widths
- **Custom text** displayed under QR codes
- **Color customization** for both frame and text elements

### 📱 Content Type Support
- **Plain Text**: Display custom messages when scanned
- **WiFi Networks**: Auto-connect to WiFi with credentials
- **SMS Messages**: Pre-filled SMS composition
- **Email**: Pre-filled email composition
- **Phone Numbers**: Direct dialing capability
- **vCard**: Contact information sharing

### 🖥️ Enhanced Web Interface
- **Content type selector** with dynamic form fields
- **Real-time preview** of customization options
- **Responsive design** for mobile and desktop
- **Download functionality** for generated QR codes

### 💻 Enhanced CLI
- **Multi-format support** with command-line flags
- **Enhanced styling options** from terminal
- **Comprehensive help system**
- **Flexible output options**
   ```
   cd qr-code-generator
   ```

3. Install the dependencies:
   ```
   npm install
   ```

## Usage

To start the server and generate QR codes, run the following command:
```
node src/index.js
```

You can then send a POST request to the server with a JSON body containing the URL you want to convert to a QR code.

## API

### Generate QR Code

- **Endpoint:** `/generate`
- **Method:** `POST`
- **Request Body:**
  ```json
  {
    "url": "https://example.com"
  }
  ```
- **Response:** Returns the generated QR code image.

## Testing

To run the tests, use the following command:
```
npm test
```

## License

This project is licensed under the MIT License.