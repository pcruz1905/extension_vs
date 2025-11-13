/**
 * Type definitions for Sellhubb Islands components and R2 integration
 */

/**
 * Component manifest containing list of available components
 */
export interface ComponentManifest {
    components: string[];
    version: string;
    generatedAt: string;
}

/**
 * Metadata for a single component
 */
export interface ComponentMetadata {
    name: string;
    description: string;
    props: Record<string, PropDefinition>;
}

/**
 * Definition of a component prop
 */
export interface PropDefinition {
    type: string;
    required: boolean;
    description: string;
    default?: any;
}

/**
 * Configuration for R2 bucket access
 */
export interface R2Config {
    r2AccountId: string;
    r2AccessKeyId: string;
    r2SecretAccessKey: string;
    r2BucketName: string;
}

/**
 * Cache entry with timestamp for TTL management
 */
export interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

/**
 * Hydration strategy for island components
 */
export type HydrationStrategy = 'eager' | 'lazy' | 'idle';

/**
 * Context object types available in Liquid templates
 */
export interface LiquidContextObjects {
    product: ProductContext;
    collection: CollectionContext;
    shop: ShopContext;
}

/**
 * Product context properties
 */
export interface ProductContext {
    id: string;
    title: string;
    handle: string;
    price: number;
    compareAtPrice?: number;
    description: string;
    vendor: string;
    type: string;
    tags: string[];
    variants: any[];
    images: any[];
    featuredImage: any;
    available: boolean;
}

/**
 * Collection context properties
 */
export interface CollectionContext {
    id: string;
    title: string;
    handle: string;
    description: string;
    products: any[];
    productsCount: number;
    image: any;
}

/**
 * Shop context properties
 */
export interface ShopContext {
    id: string;
    name: string;
    domain: string;
    email: string;
    currency: string;
    locale: string;
    moneyFormat: string;
}
