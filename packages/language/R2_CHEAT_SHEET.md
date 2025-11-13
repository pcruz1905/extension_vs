# R2 Setup Cheat Sheet for Islands Completion

## Quick Reference

Your R2 bucket: `sellhubb-themes`
Account ID: `372296d1d7a1c51e077b1fb1b4462cce`

## Files to Upload to R2

### 1. Component Manifest
**Key**: `components:manifest`

**Content** (already uploaded ✓):
```json
{
  "components": [
    "add-to-cart",
    "cart-counter",
    "price-display",
    "property-D93maaeG",
    "site-footer"
  ],
  "version": "v1",
  "generatedAt": "2025-11-12T14:22:53.099Z"
}
```

### 2. Component Metadata Files

For each component, upload a metadata file with key: `component:{name}:metadata`

**Note**: The key format is `component:` (singular), not `components:`

#### Example: `component:add-to-cart:metadata`
```json
{
  "name": "add-to-cart",
  "description": "Add to cart button with quantity selector",
  "props": {
    "productId": {
      "type": "string",
      "required": true,
      "description": "Product ID to add to cart"
    },
    "productTitle": {
      "type": "string",
      "required": false,
      "description": "Product title for display"
    },
    "variant": {
      "type": "string",
      "required": false,
      "description": "Button variant (primary, secondary, outline)",
      "default": "primary"
    },
    "showQuantity": {
      "type": "boolean",
      "required": false,
      "description": "Show quantity selector",
      "default": true
    }
  }
}
```

#### Example: `component:cart-counter:metadata`
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
    },
    "showIcon": {
      "type": "boolean",
      "required": false,
      "description": "Show cart icon",
      "default": true
    }
  }
}
```

#### Example: `component:price-display:metadata`
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
    },
    "showDiscount": {
      "type": "boolean",
      "required": false,
      "description": "Show discount percentage",
      "default": false
    }
  }
}
```

#### Example: `component:property-D93maaeG:metadata`
```json
{
  "name": "property-D93maaeG",
  "description": "Dynamic property display component",
  "props": {
    "propertyId": {
      "type": "string",
      "required": true,
      "description": "Property ID to display"
    },
    "label": {
      "type": "string",
      "required": false,
      "description": "Property label"
    },
    "value": {
      "type": "string",
      "required": false,
      "description": "Property value"
    }
  }
}
```

#### Example: `component:site-footer:metadata`
```json
{
  "name": "site-footer",
  "description": "Site footer with navigation and social links",
  "props": {
    "theme": {
      "type": "string",
      "required": false,
      "description": "Footer theme (light, dark)",
      "default": "dark"
    },
    "showNewsletter": {
      "type": "boolean",
      "required": false,
      "description": "Show newsletter signup",
      "default": true
    },
    "columns": {
      "type": "number",
      "required": false,
      "description": "Number of footer columns",
      "default": 4
    }
  }
}
```

## Complete List of Keys to Upload

1. ✅ `components:manifest` (already uploaded)
2. ⏳ `component:add-to-cart:metadata`
3. ⏳ `component:cart-counter:metadata`
4. ⏳ `component:price-display:metadata`
5. ⏳ `component:property-D93maaeG:metadata`
6. ⏳ `component:site-footer:metadata`

## Testing After Upload

Once all metadata files are uploaded, test the connection:

```bash
cd packages/language
npx tsx src/test-r2-completion.ts
```

Expected output:
```
✓ Success! Found components: 5
✓ Success! Component metadata for add-to-cart
  Props: productId, productTitle, variant, showQuantity
```

## VS Code Configuration

Add to `.vscode/settings.json`:

```json
{
  "sellhubb.r2AccountId": "372296d1d7a1c51e077b1fb1b4462cce",
  "sellhubb.r2AccessKeyId": "1c5435b70cff06ab40e79bfa9832e8ca",
  "sellhubb.r2SecretAccessKey": "325eafdf2318d742f61a2c4e92b69e0eeef83b88186bfe49d64d625a96d9c983",
  "sellhubb.r2BucketName": "sellhubb-themes"
}
```

## How It Works in VS Code

When you type in a `.liquid` file:
```liquid
{% island "
```

You'll see autocomplete suggestions:
- **add-to-cart** - Add to cart button with quantity selector
- **cart-counter** - Displays cart item count with real-time updates
- **price-display** - Shows product price with currency formatting
- **property-D93maaeG** - Dynamic property display component
- **site-footer** - Site footer with navigation and social links

Selecting a suggestion inserts a complete snippet:
```liquid
{% island "cart-counter", props: { productId: ${1}, productTitle: ${2}, count: ${3:0}, showIcon: ${4:true} }, hydrate: "${5|lazy,eager,idle|}" %}
  ${6}
{% endisland %}
```

With tab stops for easy property filling!
