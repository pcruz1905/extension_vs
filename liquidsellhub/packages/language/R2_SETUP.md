# R2 Setup for Islands Completion

## Current Status

✅ **Code Implementation**: Complete
- R2Client service implemented
- IslandsCompletionProvider integrated
- Configuration system ready

⚠️ **R2 Connection**: DNS Lookup Failed
- Attempted to connect to: `372296d1d7a1c51e077b1fb1b4462cce.r2.cloudflarestorage.com`
- Bucket: `sellhubb-themes`
- Error: `getaddrinfo EAI_AGAIN` (DNS resolution failed)

## What Needs to be in R2

The R2 bucket should contain:

### 1. Component Manifest (`components:manifest`)

Location: `components:manifest` (key in R2)

```json
{
  "components": [
    "cart-counter",
    "price-display",
    "product-card",
    "nav-menu"
  ],
  "version": "1.0.0",
  "generatedAt": "2025-11-13T00:00:00Z"
}
```

### 2. Component Metadata Files

Location: `components:{component-name}:metadata` (one for each component)

Example: `components:cart-counter:metadata`
```json
{
  "name": "cart-counter",
  "description": "Displays cart item count with real-time updates",
  "props": {
    "productId": {
      "type": "string",
      "required": true,
      "description": "Product ID to track"
    },
    "productTitle": {
      "type": "string",
      "required": false,
      "description": "Product title for display"
    },
    "count": {
      "type": "number",
      "required": false,
      "description": "Initial count value",
      "default": 0
    }
  }
}
```

Example: `components:price-display:metadata`
```json
{
  "name": "price-display",
  "description": "Shows product price with currency formatting",
  "props": {
    "amount": {
      "type": "number",
      "required": true,
      "description": "Price amount"
    },
    "currency": {
      "type": "string",
      "required": false,
      "description": "Currency code (USD, EUR, etc.)",
      "default": "USD"
    },
    "compareAtPrice": {
      "type": "number",
      "required": false,
      "description": "Original price for comparison"
    }
  }
}
```

## How Completion Works

When user types in VS Code:
```liquid
{% island "
```

The completion provider will:
1. Detect the island tag context
2. Fetch `components:manifest` from R2
3. For each component, fetch `components:{name}:metadata`
4. Show suggestions with:
   - Component name
   - Description
   - Auto-generated props snippet
   - Hydration options

Example completion:
```liquid
{% island "cart-counter", props: { productId: ${1}, productTitle: ${2}, count: ${3:0} }, hydrate: "${4|eager,lazy,idle|}" %}
{% endisland %}
```

## Configuration in VS Code

Add to `.vscode/settings.json` or User Settings:

```json
{
  "sellhubb.r2AccountId": "372296d1d7a1c51e077b1fb1b4462cce",
  "sellhubb.r2AccessKeyId": "1c5435b70cff06ab40e79bfa9832e8ca",
  "sellhubb.r2SecretAccessKey": "325eafdf2318d742f61a2c4e92b69e0eeef83b88186bfe49d64d625a96d9c983",
  "sellhubb.r2BucketName": "sellhubb-themes"
}
```

## Next Steps to Fix Connection

1. **Verify R2 Bucket Exists**:
   - Log in to Cloudflare dashboard
   - Check R2 bucket `sellhubb-themes` exists
   - Verify it's in account `372296d1d7a1c51e077b1fb1b4462cce`

2. **Upload Component Metadata**:
   - Upload `components:manifest` with component list
   - Upload metadata for each component
   - Example using AWS CLI with R2:
     ```bash
     aws s3 cp manifest.json s3://sellhubb-themes/components:manifest \
       --endpoint-url https://372296d1d7a1c51e077b1fb1b4462cce.r2.cloudflarestorage.com
     ```

3. **Test Connection**:
   - Run: `npm run test:r2` (or `npx tsx src/test-r2-completion.ts`)
   - Should see component list and metadata

4. **Test in VS Code**:
   - Open a `.liquid` file
   - Type: `{% island "`
   - Should see component suggestions with descriptions

## Mock Test (Without R2)

If R2 is not set up yet, completion will:
- Still work with hardcoded fallbacks
- Show basic component name completions
- Not have prop suggestions or descriptions

The language server gracefully handles R2 failures and continues to provide basic Liquid support.
