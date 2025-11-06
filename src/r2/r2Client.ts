import * as vscode from "vscode";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type {
  CacheEntry,
  ComponentManifest,
  ComponentMetadata,
  SellhubbConfig,
} from "../types";

/**
 * Cache duration in milliseconds (5 minutes)
 */
const CACHE_DURATION = 5 * 60 * 1000;

/**
 * R2 client for fetching component data from Cloudflare R2 via AWS SDK
 */
export class R2Client {
  private manifestCache: CacheEntry<ComponentManifest> | null = null;
  private metadataCache: Map<string, CacheEntry<ComponentMetadata>> = new Map();
  private config: SellhubbConfig | null = null;
  private s3Client: S3Client | null = null;

  constructor(c: SellhubbConfig) {
    this.config = c;
    this.validateConfig();

    this.s3Client = new S3Client({
      endpoint: `https://${c.r2AccountId}.r2.cloudflarestorage.com`,
      region: "auto",
      credentials: {
        accessKeyId: c.r2AccessKeyId,
        secretAccessKey: c.r2SecretAccessKey,
      },
    });
  }

  /**
   * Initialize or update configuration from VS Code settings
   */
  public updateConfig(): void {
    const config = vscode.workspace.getConfiguration("sellhubb");

    this.config = {
      r2BucketName: config.get<string>("r2BucketName") || "",
      r2AccountId: config.get<string>("r2AccountId") || "",
      r2AccessKeyId: config.get<string>("r2AccessKeyId") || "",
      r2SecretAccessKey: config.get<string>("r2SecretAccessKey") || "",
    };

    this.validateConfig();
  }

  /**
   * Validate that required configuration is present
   */
  private validateConfig(): void {
    if (!this.config) {
      throw new Error(
        "R2 client not initialized. Please configure Cloudflare R2 credentials in settings."
      );
    }

    if (
      !this.config.r2AccountId ||
      !this.config.r2AccessKeyId ||
      !this.config.r2SecretAccessKey ||
      !this.config.r2BucketName
    ) {
      throw new Error(
        "Missing Cloudflare R2 credentials. Please configure sellhubb.r2AccountId, sellhubb.r2AccessKeyId, sellhubb.r2SecretAccessKey and sellhubb.r2BucketName in settings."
      );
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
   * Fetch a value from Cloudflare R2 using AWS SDK
   */

  private async fetchFromR2(key: string): Promise<string> {
    this.validateConfig();
    if (!this.s3Client) throw new Error("S3 client not initialized");

    const cmd = new GetObjectCommand({
      Bucket: this.config?.r2BucketName,
      Key: key,
    });

    const response = await this.s3Client.send(cmd);

    if (!response.Body) {
      throw new Error(`No body returned from R2 for key: ${key}`);
    }

    // Convert the readable stream to a string
    const bodyString = await response.Body.transformToString();

    return bodyString;
  }

  /**
   * Get the component manifest (list of all components)
   */
  public async getComponentManifest(): Promise<ComponentManifest> {
    if (this.isCacheValid(this.manifestCache)) {
      return this.manifestCache!.data;
    }

    try {
      const data = await this.fetchFromR2("components:manifest");
      const manifest: ComponentManifest = JSON.parse(data);

      this.manifestCache = {
        data: manifest,
        timestamp: Date.now(),
      };

      return manifest;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(
        `Failed to fetch component manifest from R2: ${message}`
      );
      throw error;
    }
  }

  /**
   * Get metadata for a specific component
   */
  public async getComponentMetadata(
    componentName: string
  ): Promise<ComponentMetadata> {
    // Check cache first
    const cached = this.metadataCache.get(componentName);
    if (this.isCacheValid(cached)) {
      return cached!.data;
    }

    // Fetch from R2
    try {
      const key = `component:${componentName}:metadata`;
      const data = await this.fetchFromR2(key);
      const metadata: ComponentMetadata = JSON.parse(data);

      // Update cache
      this.metadataCache.set(componentName, {
        data: metadata,
        timestamp: Date.now(),
      });

      return metadata;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(
        `Failed to fetch metadata for ${componentName}: ${errorMessage}`
      );
      throw error;
    }
  }

  /**
   * Clear all caches (useful for manual refresh)
   */
  public clearCache(): void {
    this.manifestCache = null;
    this.metadataCache.clear();
    vscode.window.showInformationMessage("Sellhubb component cache cleared");
  }

  /**
   * Get cache statistics for debugging
   */
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
