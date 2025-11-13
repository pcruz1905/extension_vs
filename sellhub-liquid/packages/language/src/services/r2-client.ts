import * as vscode from "vscode";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type {
  CacheEntry,
  ComponentManifest,
  ComponentMetadata,
  LiquidSellhubConfig,
} from "../types/index.js";

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export class R2Client {
  private manifestCache: CacheEntry<ComponentManifest> | null = null;
  private metadataCache: Map<string, CacheEntry<ComponentMetadata>> = new Map();
  private config: LiquidSellhubConfig | null = null;
  private s3Client: S3Client | null = null;

  constructor(config: LiquidSellhubConfig | null) {
    this.config = config;

    this.validateConfig();

    if (config) {
      this.s3Client = new S3Client({
        endpoint: `https://${config.r2AccountId}.r2.cloudflarestorage.com`,
        region: "auto",
        credentials: {
          accessKeyId: config.r2AccessKeyId,
          secretAccessKey: config.r2SecretAccessKey,
        },
      });
    }
  }

  /** Update configuration dynamically */
  public updateConfig(cfg: LiquidSellhubConfig): void {
    this.config = cfg;

    this.validateConfig();

    // Recreate the S3 client with new credentials
    this.s3Client = new S3Client({
      endpoint: `https://${cfg.r2AccountId}.r2.cloudflarestorage.com`,
      region: "auto",
      credentials: {
        accessKeyId: cfg.r2AccessKeyId,
        secretAccessKey: cfg.r2SecretAccessKey,
      },
    });
  }

  /** Validate configuration */
  private validateConfig(): void {
    if (!this.config) {
      throw new Error(
        "R2 client not initialized. Please configure Cloudflare R2 credentials in settings."
      );
    }

    const { r2AccountId, r2AccessKeyId, r2SecretAccessKey, r2BucketName } =
      this.config;

    if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey || !r2BucketName) {
      throw new Error(
        "Missing Cloudflare R2 credentials. Configure sellhub-liquid.r2AccountId, sellhub-liquid.r2AccessKeyId, sellhub-liquid.r2SecretAccessKey, and sellhub-liquid.r2BucketName in settings."
      );
    }
  }

  /** Check if a cache entry is still valid */
  private isCacheValid<T>(entry: CacheEntry<T> | null | undefined): boolean {
    return !!entry && Date.now() - entry.timestamp < CACHE_DURATION;
  }

  /** Fetch a file from Cloudflare R2 */
  private async fetchFromR2(key: string): Promise<string> {
    this.validateConfig();
    if (!this.s3Client) throw new Error("S3 client not initialized");

    const cmd = new GetObjectCommand({
      Bucket: this.config?.r2BucketName,
      Key: key,
    });

    const response = await this.s3Client.send(cmd);
    if (!response.Body)
      throw new Error(`No body returned from R2 for key: ${key}`);

    return await response.Body.transformToString();
  }

  /** Fetch and cache component manifest */
  public async getComponentManifest(): Promise<ComponentManifest> {
    if (this.isCacheValid(this.manifestCache)) {
      return this.manifestCache!.data;
    }

    const data = await this.fetchFromR2("components:manifest");
    const manifest: ComponentManifest = JSON.parse(data);

    this.manifestCache = { data: manifest, timestamp: Date.now() };
    return manifest;
  }

  /** Fetch and cache component metadata */
  public async getComponentMetadata(
    componentName: string
  ): Promise<ComponentMetadata> {
    const cached = this.metadataCache.get(componentName);
    if (this.isCacheValid(cached)) return cached!.data;

    const key = `component:${componentName}:metadata`;
    const data = await this.fetchFromR2(key);
    const metadata: ComponentMetadata = JSON.parse(data);

    this.metadataCache.set(componentName, {
      data: metadata,
      timestamp: Date.now(),
    });

    return metadata;
  }

  /** Clear in-memory cache */
  public clearCache(): void {
    this.manifestCache = null;
    this.metadataCache.clear();
    vscode.window.showInformationMessage("Sellhubb R2 in-memory cache cleared");
  }

  /** Get cache stats for debugging */
  public getCacheStats(): {
    manifestCached: boolean;
    metadataCacheSize: number;
  } {
    return {
      manifestCached: this.isCacheValid(this.manifestCache),
      metadataCacheSize: this.metadataCache.size,
    };
  }
}
