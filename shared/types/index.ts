/**
 * Type definitions for Sellhubb Liquid IntelliSense extension
 */

/**
 * Component manifest structure from R2
 * Key: components:manifest
 */
export interface ComponentManifest {
  components: string[];
  version: string;
  generatedAt: string;
}

/**
 * Component metadata structure from R2
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
  r2AccountId: string;
  r2AccessKeyId: string;
  r2SecretAccessKey: string;
  r2BucketName: string;
}

/**
 * Cache entry for storing fetched data
 */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}
