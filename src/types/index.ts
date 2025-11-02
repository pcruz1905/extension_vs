/**
 * Type definitions for Sellhubb Liquid IntelliSense extension
 */

/**
 * Component manifest structure from KV
 * Key: components:manifest
 */
export interface ComponentManifest {
  components: string[];
  version: string;
  generatedAt: string;
}

/**
 * Component metadata structure from KV
 * Key: component:<name>:metadata
 */
export interface ComponentMetadata {
  name: string;
  description: string;
  props: Record<string, PropDefinition>;
}

/**
 * Property definition within component metadata
 */
export interface PropDefinition {
  type: string;
  required: boolean;
  description: string;
}

/**
 * Extension configuration from VS Code settings
 */
export interface SellhubbConfig {
  kvAccountId: string;
  kvNamespaceId: string;
  kvApiToken: string;
}

/**
 * Cache entry for storing fetched data
 */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}
