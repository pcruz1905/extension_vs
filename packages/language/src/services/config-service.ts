/**
 * ConfigService - Manages R2 configuration for the language server
 * Handles loading and validation of R2 credentials
 */

import { R2Config } from '../types/index.js';
import type { Connection } from 'vscode-languageserver';

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
    private connection: Connection | null = null;

    /**
     * Set the configuration provider (typically from LSP workspace configuration)
     */
    public setConfigurationProvider(provider: ConfigurationProvider): void {
        this.configProvider = provider;
    }

    /**
     * Set the LSP connection for direct configuration access
     */
    public setConnection(connection: Connection): void {
        this.connection = connection;
    }

    /**
     * Load configuration from the workspace
     */
    public async loadConfiguration(): Promise<R2Config> {
        console.log('⚙️ [ConfigService] loadConfiguration() called');

        // Try using connection.workspace.getConfiguration first (more direct)
        if (this.connection) {
            console.log('🔌 [ConfigService] Connection available, trying workspace.getConfiguration...');
            try {
                const result = await this.connection.workspace.getConfiguration({
                    section: 'sellhubb'
                });
                console.log('🔍 [ConfigService] Workspace config result:', result);
                console.log('🔍 [ConfigService] Result type:', typeof result);
                console.log('🔍 [ConfigService] Result keys:', result ? Object.keys(result) : 'null');

                if (result && (result.r2AccountId || result.r2AccessKeyId || result.r2SecretAccessKey || result.r2BucketName)) {
                    const r2AccountId = result.r2AccountId || '';
                    const r2AccessKeyId = result.r2AccessKeyId || '';
                    const r2SecretAccessKey = result.r2SecretAccessKey || '';
                    const r2BucketName = result.r2BucketName || '';

                    console.log('✅ [ConfigService] Found config via connection.workspace.getConfiguration');
                    console.log('🔍 [ConfigService] r2AccountId:', r2AccountId ? `${r2AccountId.substring(0, 8)}...` : 'NOT SET');
                    console.log('🔍 [ConfigService] r2AccessKeyId:', r2AccessKeyId ? `${r2AccessKeyId.substring(0, 8)}...` : 'NOT SET');
                    console.log('🔍 [ConfigService] r2SecretAccessKey:', r2SecretAccessKey ? '***PRESENT***' : 'NOT SET');
                    console.log('🔍 [ConfigService] r2BucketName:', r2BucketName || 'NOT SET');

                    this.config = {
                        r2AccountId,
                        r2AccessKeyId,
                        r2SecretAccessKey,
                        r2BucketName,
                    };

                    console.log('✅ [ConfigService] Configuration loaded successfully from connection');
                    return this.config;
                }
            } catch (error) {
                console.error('❌ [ConfigService] Failed to load via connection.workspace.getConfiguration');
                console.error('❌ [ConfigService] Error:', error);
            }
        }

        // Fallback to configProvider
        if (!this.configProvider) {
            console.warn('⚠️ [ConfigService] No configuration provider set - using default empty config');
            return this.config;
        }

        console.log('📋 [ConfigService] Configuration provider exists, loading workspace settings...');

        try {
            console.log('🔍 [ConfigService] Fetching sellhubb configuration section...');
            // Get the entire sellhubb configuration object
            const sellhubbConfig = await this.configProvider.getConfiguration('sellhub-liquid', 'sellhubb');
            console.log('🔍 [ConfigService] sellhubbConfig received:', sellhubbConfig);
            console.log('🔍 [ConfigService] sellhubbConfig type:', typeof sellhubbConfig);
            console.log('🔍 [ConfigService] sellhubbConfig keys:', sellhubbConfig ? Object.keys(sellhubbConfig) : 'null');

            // Extract individual values from the configuration object
            const r2AccountId = sellhubbConfig?.r2AccountId || '';
            const r2AccessKeyId = sellhubbConfig?.r2AccessKeyId || '';
            const r2SecretAccessKey = sellhubbConfig?.r2SecretAccessKey || '';
            const r2BucketName = sellhubbConfig?.r2BucketName || '';

            console.log('🔍 [ConfigService] r2AccountId:', r2AccountId ? `${r2AccountId.substring(0, 8)}...` : 'NOT SET');
            console.log('🔍 [ConfigService] r2AccessKeyId:', r2AccessKeyId ? `${r2AccessKeyId.substring(0, 8)}...` : 'NOT SET');
            console.log('🔍 [ConfigService] r2SecretAccessKey:', r2SecretAccessKey ? '***PRESENT***' : 'NOT SET');
            console.log('🔍 [ConfigService] r2BucketName:', r2BucketName || 'NOT SET');

            this.config = {
                r2AccountId,
                r2AccessKeyId,
                r2SecretAccessKey,
                r2BucketName,
            };

            console.log('✅ [ConfigService] Configuration loaded successfully');
            console.log('📊 [ConfigService] Config summary:', JSON.stringify({
                r2AccountId: this.config.r2AccountId ? `${this.config.r2AccountId.substring(0, 8)}...` : 'MISSING',
                r2AccessKeyId: this.config.r2AccessKeyId ? `${this.config.r2AccessKeyId.substring(0, 8)}...` : 'MISSING',
                r2SecretAccessKey: this.config.r2SecretAccessKey ? '***PRESENT***' : 'MISSING',
                r2BucketName: this.config.r2BucketName || 'MISSING'
            }, null, 2));

            return this.config;
        } catch (error) {
            console.error('❌ [ConfigService] Failed to load configuration');
            console.error('❌ [ConfigService] Error:', error);
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
        console.log('🔄 [ConfigService] updateConfig() called');
        console.log('🔄 [ConfigService] Updating config with:', JSON.stringify({
            r2AccountId: newConfig.r2AccountId ? `${newConfig.r2AccountId.substring(0, 8)}...` : 'unchanged',
            r2AccessKeyId: newConfig.r2AccessKeyId ? `${newConfig.r2AccessKeyId.substring(0, 8)}...` : 'unchanged',
            r2SecretAccessKey: newConfig.r2SecretAccessKey ? '***PRESENT***' : 'unchanged',
            r2BucketName: newConfig.r2BucketName || 'unchanged'
        }, null, 2));

        this.config = {
            ...this.config,
            ...newConfig,
        };

        console.log('✅ [ConfigService] Configuration updated successfully');
        console.log('📊 [ConfigService] New config summary:', JSON.stringify({
            r2AccountId: this.config.r2AccountId ? `${this.config.r2AccountId.substring(0, 8)}...` : 'MISSING',
            r2AccessKeyId: this.config.r2AccessKeyId ? `${this.config.r2AccessKeyId.substring(0, 8)}...` : 'MISSING',
            r2SecretAccessKey: this.config.r2SecretAccessKey ? '***PRESENT***' : 'MISSING',
            r2BucketName: this.config.r2BucketName || 'MISSING'
        }, null, 2));
    }

    /**
     * Validate that all required configuration values are present
     */
    public isValid(): boolean {
        console.log('🔍 [ConfigService] isValid() called - validating configuration...');

        const hasAccountId = !!this.config.r2AccountId;
        const hasAccessKeyId = !!this.config.r2AccessKeyId;
        const hasSecretKey = !!this.config.r2SecretAccessKey;
        const hasBucketName = !!this.config.r2BucketName;

        console.log('🔍 [ConfigService] Validation details:', {
            hasAccountId,
            hasAccessKeyId,
            hasSecretKey,
            hasBucketName
        });

        const isValid = hasAccountId && hasAccessKeyId && hasSecretKey && hasBucketName;

        if (isValid) {
            console.log('✅ [ConfigService] Configuration is VALID');
        } else {
            console.error('❌ [ConfigService] Configuration is INVALID');
        }

        return isValid;
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
