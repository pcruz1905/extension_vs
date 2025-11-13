import * as vscode from "vscode";

import type { LiquidSellhubConfig } from "../types/index.js";
import { ConfigurationProvider } from "langium";

/**
 * A ConfigService that manages Sellhub Liquid configuration
 * and acts as the single source of truth for credentials and R2 connection settings.
 */
export class ConfigService {
  private configurationProvider: ConfigurationProvider | null = null;
  private config: LiquidSellhubConfig | null = null;

  constructor() {}

  /**
   * Sets the LSP configuration provider so this service
   * can fetch workspace settings via the Language Server connection.
   */
  public setConfigurationProvider(provider: ConfigurationProvider): void {
    this.configurationProvider = provider;
  }

  /**
   * Loads the configuration either from:
   * - LSP workspace configuration (if in a language server context)
   * - VS Code workspace configuration (if in an extension or CLI context)
   */
  public async loadConfiguration(): Promise<void> {
    try {
      if (this.configurationProvider) {
        // Running inside language server
        const result = await this.configurationProvider.getConfiguration(
          "liquid",
          "sellhub-liquid"
        );
        this.config = this.normalizeConfig(result);
      } else if (vscode?.workspace) {
        // Running inside VS Code extension host
        const result = vscode.workspace.getConfiguration("sellhub-liquid");
        this.config = this.normalizeConfig({
          r2BucketName: result.get("r2BucketName"),
          r2AccountId: result.get("r2AccountId"),
          r2AccessKeyId: result.get("r2AccessKeyId"),
          r2SecretAccessKey: result.get("r2SecretAccessKey"),
        });
      } else {
        // Fallback for testing environments
        this.config = {
          r2BucketName: "",
          r2AccountId: "",
          r2AccessKeyId: "",
          r2SecretAccessKey: "",
        };
      }
    } catch (err) {
      console.error("[ConfigService] Failed to load configuration:", err);
      this.config = null;
    }
  }

  /**
   * Updates the configuration manually, e.g. from command or external trigger.
   */
  public updateConfig(newConfig: Partial<LiquidSellhubConfig>): void {
    this.config = { ...this.config, ...newConfig } as LiquidSellhubConfig;
  }

  /**
   * Returns the current configuration.
   * Throws if not yet loaded or incomplete.
   */
  public getConfig(): LiquidSellhubConfig {
    if (!this.config) {
      throw new Error(
        "ConfigService not initialized. Call loadConfiguration() first."
      );
    }
    return this.config;
  }

  /**
   * Returns whether configuration has been successfully loaded.
   */
  public isConfigured(): boolean {
    const c = this.config;
    return !!(
      c &&
      c.r2BucketName &&
      c.r2AccountId &&
      c.r2AccessKeyId &&
      c.r2SecretAccessKey
    );
  }

  /**
   * Normalize and type-check raw config values.
   */
  private normalizeConfig(raw: any): LiquidSellhubConfig {
    return {
      r2BucketName: String(raw?.r2BucketName ?? ""),
      r2AccountId: String(raw?.r2AccountId ?? ""),
      r2AccessKeyId: String(raw?.r2AccessKeyId ?? ""),
      r2SecretAccessKey: String(raw?.r2SecretAccessKey ?? ""),
    };
  }
}
