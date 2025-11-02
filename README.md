# Sellhubb Liquid IntelliSense

Intelligent autocomplete and documentation for Sellhubb Liquid templates with island components powered by Cloudflare KV.

## Features

This extension provides smart autocomplete for your custom Liquid `{% island %}` tags by fetching component metadata directly from Cloudflare KV.

- **Component Name Autocomplete**: Get suggestions for component names when typing `{% island "`
- **Props Autocomplete**: Get intelligent suggestions for component props inside `props: { }`
- **Type Information**: See prop types (string, number, boolean, etc.) and whether they're required
- **Hover Documentation**: Hover over component names to see descriptions and prop details
- **Smart Caching**: Component metadata is cached for 5 minutes to minimize API calls
- **Real-time Updates**: Sync latest components from KV with a single command

## Requirements

- **Cloudflare Account** with KV namespace containing component metadata
- **API Token** with KV read permissions
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
  "sellhubb.kvAccountId": "your-cloudflare-account-id",
  "sellhubb.kvNamespaceId": "your-kv-namespace-id",
  "sellhubb.kvApiToken": "your-api-token-with-kv-read-permissions"
}
```

**Finding your credentials:**
- **Account ID**: Found in Cloudflare Dashboard > Workers & Pages > Overview
- **Namespace ID**: Workers & Pages > KV > Your namespace
- **API Token**: My Profile > API Tokens > Create Token (requires KV read permission)

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

- **Sellhubb: Sync Components from KV** - Fetch latest component manifest
- **Sellhubb: Refresh Component Cache** - Clear cached data and fetch fresh
- **Sellhubb: Show Cache Statistics** - View current cache status (for debugging)

## Extension Settings

This extension contributes the following settings:

- `sellhubb.kvAccountId`: Cloudflare account ID for accessing KV
- `sellhubb.kvNamespaceId`: KV namespace ID where components are stored
- `sellhubb.kvApiToken`: Cloudflare API token with KV read permissions

## KV Data Structure

The extension expects the following keys in your KV namespace:

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
- Run "Sellhubb: Sync Components from KV" to verify connection
- Check the Output panel (View > Output > Sellhubb Liquid IntelliSense) for errors

**Components not showing up?**
- Verify the `components:manifest` key exists in your KV namespace
- Check that component metadata keys follow the pattern: `component:<name>:metadata`
- Try "Sellhubb: Refresh Component Cache" to clear and reload

**Authentication errors?**
- Ensure your API token has KV read permissions
- Verify your Account ID and Namespace ID are correct

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
