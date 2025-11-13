# Sellhub Liquid VS Code Extension

The **Sellhub Liquid** extension provides language support for the Sellhub Liquid syntax in Visual Studio Code. It includes syntax highlighting, language validation, and integration with Cloudflare R2 for managing components.

---

## Language Syntax

The extension automatically recognizes and highlights Sellhub Liquid syntax. Example:

```liquid
{{ island "component-name", props: {}, hydrate: "" }}
```

- **`island`** – Embed a component
- **`props`** – Pass properties to the component
- **`hydrate`** – Set hydration strategy

> Currently, there are **4 main commands** for interacting with the Sellhub Liquid ecosystem (R2 components, caching, etc.)

---

## Commands

The extension provides the following VS Code commands:

| Command                                   | Description                                       |
| ----------------------------------------- | ------------------------------------------------- |
| `Sellhub Liquid: Sync Components from R2` | Synchronize components from your R2 bucket        |
| `Sellhub Liquid: Refresh Component Cache` | Refresh local component cache                     |
| `Sellhub Liquid: Show Cache Statistics`   | Display cache stats for components                |
| `Sellhub Liquid: Test R2 Connection`      | Test the connection to your Cloudflare R2 account |

These commands are registered in `package.json` under the `contributes.commands` section:

```json
"commands": [
  {
    "command": "sellhub-liquid.syncComponents",
    "title": "Sellhub Liquid: Sync Components from R2",
    "category": "Sellhubb"
  },
  {
    "command": "sellhub-liquid.refreshCache",
    "title": "Sellhub Liquid: Refresh Component Cache",
    "category": "Sellhubb"
  },
  {
    "command": "sellhub-liquid.showCacheStats",
    "title": "Sellhub Liquid: Show Cache Statistics",
    "category": "Sellhubb"
  },
  {
    "command": "sellhub-liquid.testConnection",
    "title": "Sellhub Liquid: Test R2 Connection",
    "category": "Sellhubb"
  }
]
```

---

## Configuration

The extension allows you to configure access to your Cloudflare R2 account via VS Code settings. Add your configuration in `settings.json`:

```json
"sellhub-liquid.r2AccountId": "your-account-id",
"sellhub-liquid.r2AccessKeyId": "your-access-key-id",
"sellhub-liquid.r2SecretAccessKey": "your-secret-access-key",
"sellhub-liquid.r2BucketName": "your-bucket-name"
```

These settings are declared in `package.json` under `contributes.configuration`:

```json
"configuration": {
  "title": "Sellhub Liquid",
  "properties": {
    "sellhub-liquid.r2AccountId": {
      "type": "string",
      "default": "",
      "description": "Cloudflare account ID for accessing R2"
    },
    "sellhub-liquid.r2AccessKeyId": {
      "type": "string",
      "default": "",
      "description": "Cloudflare R2 API Access Key with R2 access"
    },
    "sellhub-liquid.r2SecretAccessKey": {
      "type": "string",
      "default": "",
      "description": "Cloudflare R2 API Secret Key with R2 access"
    },
    "sellhub-liquid.r2BucketName": {
      "type": "string",
      "default": "",
      "description": "Cloudflare R2 Bucket name where components are stored"
    }
  }
}
```

---

## Usage

1. **Install dependencies and build**:

```bash
npm install
npm run compile
```

2. **Run extension in VS Code**:

- Press `F5` to launch the Extension Development Host.
- Open a `.liquid` file to get syntax highlighting.
- Use the **Command Palette** (`Ctrl+Shift+P` / `Cmd+Shift+P`) to run Sellhub Liquid commands.
