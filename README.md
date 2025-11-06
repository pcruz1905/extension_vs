# Sellhubb Liquid IntelliSense

Intelligent autocomplete and documentation for Sellhubb Liquid templates with island components powered by Cloudflare R2.

## Features

This extension provides smart autocomplete for your custom Liquid `{% island %}` tags by fetching component metadata directly from Cloudflare R2.

- **Component Name Autocomplete**: Get suggestions for component names when typing `{% island "`
- **Props Autocomplete**: Get intelligent suggestions for component props inside `props: { }`
- **Type Information**: See prop types (string, number, boolean, etc.) and whether they're required
- **Hover Documentation**: Hover over component names to see descriptions and prop details
- **Smart Caching**: Component metadata is cached for 5 minutes to minimize API calls
- **Real-time Updates**: Sync latest components from R2 with a single command

## Requirements

- **Cloudflare Account** with **R2 storage** enabled
- **R2 Bucket** containing your component metadata files
- **R2 API Token** with **read permissions** for the target bucket
- **Liquid Extension** (recommended): [Liquid by panoply](https://marketplace.visualstudio.com/items?itemName=panoply.liquid) for syntax highlighting

## Installation

### 1. Install the Extension

#### From Source (Development)

```bash
cd extension_vs
npm install
npm run compile
```

Then press `F5` in VS Code to launch the extension in debug mode.

#### Package as VSIX

```bash
npm install -g @vscode/vsce
cd extension_vs
vsce package
```

Then install the `.vsix` file: `Extensions: Install from VSIX...`

### 2. Configure Cloudflare Credentials

Open VS Code settings (File > Preferences > Settings) and configure:

```json
{
  "sellhubb.r2AccountId": "your-cloudflare-account-id",
  "sellhubb.r2AccessKeyId": "your-cloudflare-r2-access-key-id",
  "sellhubb.r2SecretAccessKey": "your-cloudflare-r2-secret-access-key",
  "sellhubb.r2BucketName": "your-cloudflare-r2-bucket-name"
}
```

**Finding your credentials:**

- **Account ID**:
  Found in your **Cloudflare Dashboard → R2 → Overview**.
  You’ll see it listed under your account name (used in your R2 endpoint URL).

- **Access Key ID & Secret Access Key**:
  Go to **Cloudflare Dashboard → R2 → Manage R2 API Tokens → Create API Token**.

  - Choose **“Edit”** or **“Read”** permissions depending on your use case.
  - Once created, you’ll receive an **Access Key ID** and **Secret Access Key** — copy these immediately (they won’t be shown again).

- **Bucket Name**:
  Found in **Cloudflare Dashboard → R2 → Buckets**.
  This is the name of the bucket where your components or assets are stored.

## Usage

### Component Name Autocomplete

When you type an island tag, you'll get autocomplete for component names:

```liquid
{% island "add-to-cart" props: { productId: "123" } %}
          ^
          Start typing here to see component suggestions
```

### Props Autocomplete

After typing `props: {`, you'll get autocomplete for available props:

```liquid
{% island "cart-counter" props: {
  productId: "123",
  ^
  Autocomplete shows available props with types and descriptions
} %}
```

### Hover Documentation

Hover over a component name to see:

- Component description
- Available props with types
- Required vs optional props

### Commands

Access these commands via Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

- **Sellhubb: Sync Components from R2** - Fetch latest component manifest
- **Sellhubb: Refresh Component Cache** - Clear cached data and fetch fresh
- **Sellhubb: Show Cache Statistics** - View current cache status (for debugging)

## Extension Settings

This extension contributes the following settings:

- `sellhubb.r2AccountId`: Your Cloudflare account ID
- `sellhubb.r2AccessKeyId`: The R2 Access Key ID
- `sellhubb.r2SecretAccessKey`: The R2 Secret Access Key
- `sellhubb.r2BucketName`: The name of the R2 bucket where components are stored.

## R2 Data Structure

The extension expects the following keys in your R2:

### Component Manifest

**Key**: `components:manifest`

```json
{
  "components": ["add-to-cart", "cart-counter", "price-display"],
  "version": "v1",
  "generatedAt": "2025-11-01T15:26:37.630Z"
}
```

### Component Metadata

**Key**: `component:<name>:metadata`

```json
{
  "name": "cart-counter",
  "description": "Counter for cart quantity",
  "props": {
    "productId": {
      "type": "string",
      "required": true,
      "description": "Product identifier"
    },
    "productTitle": {
      "type": "string",
      "required": true,
      "description": "Product title"
    }
  }
}
```

## Development

### Building

```bash
npm run compile       # Build once
npm run watch         # Watch mode
npm run package       # Production build
```

### Testing

```bash
npm run test
```

### Debugging

1. Open the extension folder in VS Code
2. Press `F5` to launch Extension Development Host
3. Open a `.liquid` file and test autocomplete

## Troubleshooting

**Autocomplete not working?**

- Check that your Cloudflare credentials are configured correctly
- Run "Sellhubb: Sync Components from R2" to verify connection
- Check the Output panel (View > Output > Sellhubb Liquid IntelliSense) for errors

**Components not showing up?**

- Verify the `components:manifest` key exists in your R2
- Check that component metadata keys follow the pattern: `component:<name>:metadata`
- Try "Sellhubb: Refresh Component Cache" to clear and reload

**Authentication errors?**

- Ensure your R2 credentials has read permissions
- Verify your Account ID is correct

## Release Notes

### 0.0.1

Initial release featuring:

- Component name autocomplete for `{% island %}` tags
- Props autocomplete with type information
- Hover documentation for components
- 5-minute caching to optimize API calls
- Manual sync and refresh commands

---

**Built with love for the Sellhubb platform**
