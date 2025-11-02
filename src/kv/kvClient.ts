import * as vscode from 'vscode';
import type { ComponentManifest, ComponentMetadata, CacheEntry, SellhubbConfig } from '../types';

/**
 * Cache duration in milliseconds (5 minutes)
 */
const CACHE_DURATION = 5 * 60 * 1000;

/**
 * KV client for fetching component data from Cloudflare KV via REST API
 */
export class KVClient {
  private config: SellhubbConfig | null = null;
  private manifestCache: CacheEntry<ComponentManifest> | null = null;
  private metadataCache: Map<string, CacheEntry<ComponentMetadata>> = new Map();

  /**
   * Initialize or update configuration from VS Code settings
   */
  public updateConfig(): void {
    const config = vscode.workspace.getConfiguration('sellhubb');

    this.config = {
      kvAccountId: config.get<string>('kvAccountId') || '',
      kvNamespaceId: config.get<string>('kvNamespaceId') || '',
      kvApiToken: config.get<string>('kvApiToken') || ''
    };
  }

  /**
   * Validate that required configuration is present
   */
  private validateConfig(): void {
    if (!this.config) {
      throw new Error('KV client not initialized. Please configure Cloudflare KV credentials in settings.');
    }

    if (!this.config.kvAccountId || !this.config.kvNamespaceId || !this.config.kvApiToken) {
      throw new Error('Missing Cloudflare KV credentials. Please configure sellhubb.kvAccountId, sellhubb.kvNamespaceId, and sellhubb.kvApiToken in settings.');
    }

    // Validate namespace ID format (UUID with dashes or 32-char hex string)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const hexRegex = /^[0-9a-f]{32}$/i;
    if (!uuidRegex.test(this.config.kvNamespaceId) && !hexRegex.test(this.config.kvNamespaceId)) {
      throw new Error(`Invalid Namespace ID format. Expected UUID format (e.g., "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx") or 32-character hex string, got: "${this.config.kvNamespaceId}". Find the correct ID in Cloudflare Dashboard → Workers & Pages → KV.`);
    }
  }

  /**
   * Check if a cache entry is still valid
   */
  private isCacheValid<T>(entry: CacheEntry<T> | null | undefined): boolean {
    if (!entry) {
      return false;
    }
    return Date.now() - entry.timestamp < CACHE_DURATION;
  }

  /**
   * Fetch a value from Cloudflare KV using REST API
   */
  private async fetchFromKV(key: string): Promise<string> {
    this.validateConfig();

    // URL encode the key to handle special characters like colons
    const encodedKey = encodeURIComponent(key);
    const url = `https://api.cloudflare.com/client/v4/accounts/${this.config!.kvAccountId}/storage/kv/namespaces/${this.config!.kvNamespaceId}/values/${encodedKey}`;

    console.log(`Fetching from KV - URL: ${url}`);

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.config!.kvApiToken}`
      }
    });

    if (!response.ok) {
      // Try to get detailed error message from response
      let errorDetails = '';
      try {
        const errorBody = await response.text();
        console.error(`KV API Error Response: ${errorBody}`);
        errorDetails = errorBody;
      } catch (e) {
        // Ignore if we can't read the error body
      }

      if (response.status === 404) {
        throw new Error(`Key not found in KV: ${key}`);
      }
      throw new Error(`Failed to fetch from KV: ${response.status} ${response.statusText}${errorDetails ? ` - ${errorDetails}` : ''}`);
    }

    return await response.text();
  }

  /**
   * Get the component manifest (list of all components)
   */
  public async getComponentManifest(): Promise<ComponentManifest> {
    // Check cache first
    if (this.isCacheValid(this.manifestCache)) {
      return this.manifestCache!.data;
    }

    // Fetch from KV
    try {
      const data = await this.fetchFromKV('components:manifest');
      const manifest: ComponentManifest = JSON.parse(data);

      // Update cache
      this.manifestCache = {
        data: manifest,
        timestamp: Date.now()
      };

      return manifest;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Failed to fetch component manifest: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Get metadata for a specific component
   */
  public async getComponentMetadata(componentName: string): Promise<ComponentMetadata> {
    // Check cache first
    const cached = this.metadataCache.get(componentName);
    if (this.isCacheValid(cached)) {
      return cached!.data;
    }

    // Fetch from KV
    try {
      const key = `component:${componentName}:metadata`;
      const data = await this.fetchFromKV(key);
      const metadata: ComponentMetadata = JSON.parse(data);

      // Update cache
      this.metadataCache.set(componentName, {
        data: metadata,
        timestamp: Date.now()
      });

      return metadata;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Failed to fetch metadata for ${componentName}: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Clear all caches (useful for manual refresh)
   */
  public clearCache(): void {
    this.manifestCache = null;
    this.metadataCache.clear();
    vscode.window.showInformationMessage('Sellhubb component cache cleared');
  }

  /**
   * Get cache statistics for debugging
   */
  public getCacheStats(): { manifestCached: boolean; metadataCacheSize: number } {
    return {
      manifestCached: this.isCacheValid(this.manifestCache),
      metadataCacheSize: this.metadataCache.size
    };
  }
}
