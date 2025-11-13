/**
 * R2Client - Service for fetching component metadata from Cloudflare R2
 * Ported from extension_vs/src/r2Client.ts
 */

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { ComponentManifest, ComponentMetadata, R2Config, CacheEntry } from '../types/index.js';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

export class R2Client {
    private s3Client: S3Client | null = null;
    private config: R2Config;

    // Cache for manifest and component metadata
    private manifestCache: CacheEntry<ComponentManifest> | null = null;
    private metadataCache: Map<string, CacheEntry<ComponentMetadata>> = new Map();

    constructor(config: R2Config) {
        console.log('🚀 [R2Client] Constructor called');
        console.log('🔧 [R2Client] Config received:', JSON.stringify({
            r2AccountId: config.r2AccountId ? `${config.r2AccountId.substring(0, 8)}...` : 'MISSING',
            r2AccessKeyId: config.r2AccessKeyId ? `${config.r2AccessKeyId.substring(0, 8)}...` : 'MISSING',
            r2SecretAccessKey: config.r2SecretAccessKey ? '***PRESENT***' : 'MISSING',
            r2BucketName: config.r2BucketName || 'MISSING'
        }, null, 2));

        this.config = config;
        console.log('📋 [R2Client] Config stored, calling initializeClient()...');
        this.initializeClient();
        console.log('✅ [R2Client] Constructor completed');
    }

    /**
     * Initialize the S3 client with R2 configuration
     */
    private initializeClient(): void {
        console.log('🔍 [R2Client] initializeClient() called');
        console.log('🔍 [R2Client] Validating configuration...');

        if (!this.isConfigValid()) {
            console.error('❌ [R2Client] Configuration validation FAILED!');
            console.error('❌ [R2Client] Invalid configuration, client not initialized');
            console.error('❌ [R2Client] Check your R2 credentials in settings');
            return;
        }

        console.log('✅ [R2Client] Configuration validation PASSED');
        console.log('🔗 [R2Client] Creating S3Client...');
        console.log('🔗 [R2Client] Endpoint will be:', `https://${this.config.r2AccountId}.r2.cloudflarestorage.com`);
        console.log('🔗 [R2Client] Region:', 'auto');
        console.log('🔗 [R2Client] Bucket:', this.config.r2BucketName);

        // Check for proxy configuration
        const proxyUrl = process.env.https_proxy || process.env.HTTPS_PROXY || process.env.http_proxy || process.env.HTTP_PROXY;
        if (proxyUrl) {
            console.log('🌐 [R2Client] Proxy detected:', proxyUrl.substring(0, 50) + '...');
        }

        try {
            const s3Config: any = {
                endpoint: `https://${this.config.r2AccountId}.r2.cloudflarestorage.com`,
                region: 'auto',
                credentials: {
                    accessKeyId: this.config.r2AccessKeyId,
                    secretAccessKey: this.config.r2SecretAccessKey,
                },
                forcePathStyle: true, // Required for R2 to avoid bucket-in-hostname
            };

            // Add proxy support if proxy is configured
            if (proxyUrl) {
                console.log('🔧 [R2Client] Configuring proxy agent...');
                const proxyAgent = new HttpsProxyAgent(proxyUrl);
                s3Config.requestHandler = new NodeHttpHandler({
                    httpAgent: proxyAgent,
                    httpsAgent: proxyAgent,
                });
                console.log('✅ [R2Client] Proxy agent configured');
            }

            this.s3Client = new S3Client(s3Config);
            console.log('✅ [R2Client] S3Client created successfully!');
            console.log('✅ [R2Client] R2Client initialized and ready to use');
        } catch (error) {
            console.error('❌ [R2Client] FATAL ERROR: Failed to initialize S3 client');
            console.error('❌ [R2Client] Error details:', error);
            if (error instanceof Error) {
                console.error('❌ [R2Client] Error message:', error.message);
                console.error('❌ [R2Client] Error stack:', error.stack);
            }
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
        console.log(`📥 [R2Client] fetchObject() called with key: "${key}"`);

        if (!this.s3Client) {
            console.error('❌ [R2Client] fetchObject() FAILED: S3Client is not initialized');
            throw new Error('R2Client not initialized. Please check your configuration.');
        }

        console.log('📤 [R2Client] S3Client exists, preparing GetObjectCommand...');
        console.log('📤 [R2Client] Bucket:', this.config.r2BucketName);
        console.log('📤 [R2Client] Key:', key);

        try {
            const command = new GetObjectCommand({
                Bucket: this.config.r2BucketName,
                Key: key,
            });

            console.log('🌐 [R2Client] Sending command to R2...');
            const startTime = Date.now();
            const response = await this.s3Client.send(command);
            const endTime = Date.now();
            const duration = endTime - startTime;

            console.log(`✅ [R2Client] Response received in ${duration}ms`);
            console.log('📊 [R2Client] Response metadata:', {
                ContentType: response.ContentType,
                ContentLength: response.ContentLength,
                LastModified: response.LastModified,
                ETag: response.ETag
            });

            if (!response.Body) {
                console.error('❌ [R2Client] Response body is empty!');
                throw new Error(`No data received for key: ${key}`);
            }

            console.log('📄 [R2Client] Converting response body to string...');
            // Convert stream to string
            const bodyString = await response.Body.transformToString();
            console.log(`✅ [R2Client] Successfully fetched ${bodyString.length} characters`);
            console.log(`📄 [R2Client] First 100 chars: ${bodyString.substring(0, 100)}...`);

            return bodyString;
        } catch (error: any) {
            console.error(`❌ [R2Client] FATAL ERROR fetching object "${key}"`);
            console.error('❌ [R2Client] Error details:', error);
            if (error instanceof Error) {
                console.error('❌ [R2Client] Error name:', error.name);
                console.error('❌ [R2Client] Error message:', error.message);
                console.error('❌ [R2Client] Error stack:', error.stack);
            }
            if (error.$metadata) {
                console.error('❌ [R2Client] AWS SDK metadata:', error.$metadata);
            }
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
        console.log('🧪 [R2Client] testConnection() called');

        if (!this.s3Client) {
            console.error('❌ [R2Client] testConnection() FAILED: S3Client is not initialized');
            return false;
        }

        console.log('✅ [R2Client] S3Client exists, attempting to fetch manifest...');

        try {
            console.log('🌐 [R2Client] Testing connection by fetching manifest...');
            await this.fetchObject('components:manifest');
            console.log('✅ [R2Client] Connection test PASSED! Successfully connected to R2');
            return true;
        } catch (error) {
            console.error('❌ [R2Client] Connection test FAILED!');
            console.error('❌ [R2Client] Error:', error);
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
