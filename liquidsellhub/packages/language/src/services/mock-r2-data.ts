/**
 * Mock R2 data for testing completion provider without live R2 connection
 */

import { ComponentManifest, ComponentMetadata } from '../types/index.js';

export const MOCK_MANIFEST: ComponentManifest = {
    components: [
        "add-to-cart",
        "cart-counter",
        "price-display",
        "property-D93maaeG",
        "site-footer"
    ],
    version: "v1",
    generatedAt: "2025-11-12T14:22:53.099Z"
};

export const MOCK_METADATA: Record<string, ComponentMetadata> = {
    "add-to-cart": {
        name: "add-to-cart",
        description: "Add to cart button with quantity selector",
        props: {
            productId: {
                type: "string",
                required: true,
                description: "Product ID to add to cart"
            },
            productTitle: {
                type: "string",
                required: false,
                description: "Product title for display"
            },
            variant: {
                type: "string",
                required: false,
                description: "Button variant (primary, secondary, outline)",
                default: "primary"
            },
            showQuantity: {
                type: "boolean",
                required: false,
                description: "Show quantity selector",
                default: true
            }
        }
    },
    "cart-counter": {
        name: "cart-counter",
        description: "Displays cart item count with real-time updates",
        props: {
            productId: {
                type: "string",
                required: true,
                description: "Product ID to track"
            },
            productTitle: {
                type: "string",
                required: false,
                description: "Product title for display"
            },
            count: {
                type: "number",
                required: false,
                description: "Initial count value",
                default: 0
            },
            showIcon: {
                type: "boolean",
                required: false,
                description: "Show cart icon",
                default: true
            }
        }
    },
    "price-display": {
        name: "price-display",
        description: "Shows product price with currency formatting",
        props: {
            amount: {
                type: "number",
                required: true,
                description: "Price amount"
            },
            currency: {
                type: "string",
                required: false,
                description: "Currency code (USD, EUR, etc.)",
                default: "USD"
            },
            compareAtPrice: {
                type: "number",
                required: false,
                description: "Original price for comparison"
            },
            showDiscount: {
                type: "boolean",
                required: false,
                description: "Show discount percentage",
                default: false
            }
        }
    },
    "property-D93maaeG": {
        name: "property-D93maaeG",
        description: "Dynamic property display component",
        props: {
            propertyId: {
                type: "string",
                required: true,
                description: "Property ID to display"
            },
            label: {
                type: "string",
                required: false,
                description: "Property label"
            },
            value: {
                type: "string",
                required: false,
                description: "Property value"
            }
        }
    },
    "site-footer": {
        name: "site-footer",
        description: "Site footer with navigation and social links",
        props: {
            theme: {
                type: "string",
                required: false,
                description: "Footer theme (light, dark)",
                default: "dark"
            },
            showNewsletter: {
                type: "boolean",
                required: false,
                description: "Show newsletter signup",
                default: true
            },
            columns: {
                type: "number",
                required: false,
                description: "Number of footer columns",
                default: 4
            }
        }
    }
};
