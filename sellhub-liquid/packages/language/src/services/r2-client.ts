/**
 * R2Client - Service for fetching component metadata from Cloudflare R2
 * Ported from extension_vs/src/r2Client.ts
 */

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { ComponentManifest, ComponentMetadata, R2Config, CacheEntry } from '../types/index.js';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

export class R2Client {
    private s3Client: S3Client | null = null;
    private config: R2Config;

    // Cache for manifest and component metadata
    private manifestCache: CacheEntry<ComponentManifest> | null = null;
    private metadataCache: Map<string, CacheEntry<ComponentMetadata>> = new Map();

    constructor(config: R2Config) {
        this.config = config;
        this.initializeClient();
    }

    /**
     * Initialize the S3 client with R2 configuration
     */
    private initializeClient(): void {
        if (!this.isConfigValid()) {
            console.warn('R2Client: Invalid configuration, client not initialized');
            return;
        }

        try {
            this.s3Client = new S3Client({
                endpoint: `https://${this.config.r2AccountId}.r2.cloudflarestorage.com`,
                region: 'auto',
                credentials: {
                    accessKeyId: this.config.r2AccessKeyId,
                    secretAccessKey: this.config.r2SecretAccessKey,
                },
            });
            console.log('R2Client: Successfully initialized');
        } catch (error) {
            console.error('R2Client: Failed to initialize S3 client:', error);
            this.s3Client = null;
        }
    }

    /**
     * Validate that all required configuration values are present
     */
    private isConfigValid(): boolean {
        return !!(
            this.config.r2AccountId &&
            this.config.r2AccessKeyId &&
            this.config.r2SecretAccessKey &&
            this.config.r2BucketName
        );
    }

    /**
     * Check if a cache entry is still valid
     */
    private isCacheValid<T>(entry: CacheEntry<T> | null | undefined): entry is CacheEntry<T> {
        if (!entry) return false;
        return Date.now() - entry.timestamp < CACHE_DURATION;
    }

    /**
     * Update the client configuration and reinitialize
     */
    public updateConfig(newConfig: R2Config): void {
        this.config = newConfig;
        this.clearCache();
        this.initializeClient();
    }

    /**
     * Clear all caches
     */
    public clearCache(): void {
        this.manifestCache = null;
        this.metadataCache.clear();
        console.log('R2Client: Cache cleared');
    }

    /**
     * Fetch an object from R2 bucket
     */
    private async fetchObject(key: string): Promise<string> {
        if (!this.s3Client) {
            throw new Error('R2Client not initialized. Please check your configuration.');
        }

        try {
            const command = new GetObjectCommand({
                Bucket: this.config.r2BucketName,
                Key: key,
            });

            const response = await this.s3Client.send(command);

            if (!response.Body) {
                throw new Error(`No data received for key: ${key}`);
            }

            // Convert stream to string
            const bodyString = await response.Body.transformToString();
            return bodyString;
        } catch (error: any) {
            console.error(`R2Client: Error fetching object ${key}:`, error);
            throw new Error(`Failed to fetch ${key}: ${error.message}`);
        }
    }

    /**
     * Get the component manifest from R2
     * Returns list of available components
     */
    public async getComponentManifest(): Promise<ComponentManifest> {
        // Return cached manifest if valid
        if (this.isCacheValid(this.manifestCache)) {
            console.log('R2Client: Returning cached manifest');
            return this.manifestCache.data;
        }

        console.log('R2Client: Fetching fresh manifest from R2');

        try {
            const manifestString = await this.fetchObject('components:manifest');
            const manifest: ComponentManifest = JSON.parse(manifestString);

            // Cache the result
            this.manifestCache = {
                data: manifest,
                timestamp: Date.now(),
            };

            console.log(`R2Client: Manifest cached with ${manifest.components.length} components`);
            return manifest;
        } catch (error) {
            console.error('R2Client: Failed to fetch manifest:', error);

            // Return empty manifest on error
            return {
                components: [],
                version: '0.0.0',
                generatedAt: new Date().toISOString(),
            };
        }
    }

    /**
     * Get metadata for a specific component
     * @param componentName The name of the component
     */
    public async getComponentMetadata(componentName: string): Promise<ComponentMetadata | null> {
        // Return cached metadata if valid
        const cachedMetadata = this.metadataCache.get(componentName);
        if (this.isCacheValid(cachedMetadata)) {
            console.log(`R2Client: Returning cached metadata for ${componentName}`);
            return cachedMetadata.data;
        }

        console.log(`R2Client: Fetching fresh metadata for ${componentName} from R2`);

        try {
            const key = `component:${componentName}:metadata`;
            const metadataString = await this.fetchObject(key);
            const metadata: ComponentMetadata = JSON.parse(metadataString);

            // Cache the result
            this.metadataCache.set(componentName, {
                data: metadata,
                timestamp: Date.now(),
            });

            console.log(`R2Client: Metadata cached for ${componentName}`);
            return metadata;
        } catch (error) {
            console.error(`R2Client: Failed to fetch metadata for ${componentName}:`, error);
            return null;
        }
    }

    /**
     * Test connection to R2
     * @returns true if connection successful, false otherwise
     */
    public async testConnection(): Promise<boolean> {
        if (!this.s3Client) {
            return false;
        }

        try {
            await this.fetchObject('components:manifest');
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get cache statistics for debugging
     */
    public getCacheStats(): { manifest: boolean; metadataCount: number } {
        return {
            manifest: this.isCacheValid(this.manifestCache),
            metadataCount: Array.from(this.metadataCache.values()).filter(entry =>
                this.isCacheValid(entry)
            ).length,
        };
    }
}
