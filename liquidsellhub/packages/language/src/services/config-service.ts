/**
 * ConfigService - Manages R2 configuration for the language server
 * Handles loading and validation of R2 credentials
 */

import { R2Config } from '../types/index.js';

export interface ConfigurationProvider {
    getConfiguration(language: string, configuration: string): Promise<any>;
}

export class ConfigService {
    private config: R2Config = {
        r2AccountId: '',
        r2AccessKeyId: '',
        r2SecretAccessKey: '',
        r2BucketName: '',
    };

    private configProvider: ConfigurationProvider | null = null;

    /**
     * Set the configuration provider (typically from LSP workspace configuration)
     */
    public setConfigurationProvider(provider: ConfigurationProvider): void {
        this.configProvider = provider;
    }

    /**
     * Load configuration from the workspace
     */
    public async loadConfiguration(): Promise<R2Config> {
        if (!this.configProvider) {
            console.warn('ConfigService: No configuration provider set');
            return this.config;
        }

        try {
            // Langium's ConfigurationProvider takes (language, section) as parameters
            const r2AccountId = await this.configProvider.getConfiguration('sellhub-liquid', 'sellhubb.r2AccountId');
            const r2AccessKeyId = await this.configProvider.getConfiguration('sellhub-liquid', 'sellhubb.r2AccessKeyId');
            const r2SecretAccessKey = await this.configProvider.getConfiguration('sellhub-liquid', 'sellhubb.r2SecretAccessKey');
            const r2BucketName = await this.configProvider.getConfiguration('sellhub-liquid', 'sellhubb.r2BucketName');

            this.config = {
                r2AccountId: r2AccountId || '',
                r2AccessKeyId: r2AccessKeyId || '',
                r2SecretAccessKey: r2SecretAccessKey || '',
                r2BucketName: r2BucketName || '',
            };

            console.log('ConfigService: Configuration loaded');
            return this.config;
        } catch (error) {
            console.error('ConfigService: Failed to load configuration:', error);
            return this.config;
        }
    }

    /**
     * Get the current configuration
     */
    public getConfig(): R2Config {
        return { ...this.config };
    }

    /**
     * Update configuration manually (used for testing or direct updates)
     */
    public updateConfig(newConfig: Partial<R2Config>): void {
        this.config = {
            ...this.config,
            ...newConfig,
        };
        console.log('ConfigService: Configuration updated');
    }

    /**
     * Validate that all required configuration values are present
     */
    public isValid(): boolean {
        return !!(
            this.config.r2AccountId &&
            this.config.r2AccessKeyId &&
            this.config.r2SecretAccessKey &&
            this.config.r2BucketName
        );
    }

    /**
     * Get validation errors if configuration is invalid
     */
    public getValidationErrors(): string[] {
        const errors: string[] = [];

        if (!this.config.r2AccountId) {
            errors.push('R2 Account ID is required');
        }
        if (!this.config.r2AccessKeyId) {
            errors.push('R2 Access Key ID is required');
        }
        if (!this.config.r2SecretAccessKey) {
            errors.push('R2 Secret Access Key is required');
        }
        if (!this.config.r2BucketName) {
            errors.push('R2 Bucket Name is required');
        }

        return errors;
    }
}
