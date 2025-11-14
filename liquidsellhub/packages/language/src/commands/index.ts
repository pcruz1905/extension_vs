/**
 * Command handlers for Islands components operations
 * Handles cache refresh, component sync, and R2 connection testing
 */

import { Connection } from 'vscode-languageserver';
import { R2Client } from '../services/r2-client.js';
import { ConfigService } from '../services/config-service.js';

export class CommandHandler {
    private connection: Connection;
    private r2Client: R2Client;
    private configService: ConfigService;

    constructor(connection: Connection, r2Client: R2Client, configService: ConfigService) {
        console.log('🎮 [CommandHandler] Constructor called');
        this.connection = connection;
        this.r2Client = r2Client;
        this.configService = configService;
        console.log('✅ [CommandHandler] Constructor completed - connection, r2Client, and configService initialized');
    }

    /**
     * Register all custom commands
     */
    public registerCommands(): void {
        console.log('📝 [CommandHandler] Registering all custom commands...');

        // Refresh cache command
        console.log('📝 [CommandHandler] Registering: sellhubb/refreshCache');
        this.connection.onRequest('sellhubb/refreshCache', async () => {
            console.log('📨 [CommandHandler] Received request: sellhubb/refreshCache');
            return this.handleRefreshCache();
        });

        // Sync components command
        console.log('📝 [CommandHandler] Registering: sellhubb/syncComponents');
        this.connection.onRequest('sellhubb/syncComponents', async () => {
            console.log('📨 [CommandHandler] Received request: sellhubb/syncComponents');
            return this.handleSyncComponents();
        });

        // Show cache stats command
        console.log('📝 [CommandHandler] Registering: sellhubb/showCacheStats');
        this.connection.onRequest('sellhubb/showCacheStats', async () => {
            console.log('📨 [CommandHandler] Received request: sellhubb/showCacheStats');
            return this.handleShowCacheStats();
        });

        // Test R2 connection command
        console.log('📝 [CommandHandler] Registering: sellhubb/testConnection');
        this.connection.onRequest('sellhubb/testConnection', async () => {
            console.log('📨 [CommandHandler] Received request: sellhubb/testConnection');
            return this.handleTestConnection();
        });

        console.log('✅ [CommandHandler] All commands registered successfully!');
    }

    /**
     * Handle refresh cache command
     */
    private async handleRefreshCache(): Promise<{ success: boolean; message: string }> {
        try {
            this.r2Client.clearCache();
            return {
                success: true,
                message: 'Cache cleared successfully'
            };
        } catch (error: any) {
            return {
                success: false,
                message: `Failed to clear cache: ${error.message}`
            };
        }
    }

    /**
     * Handle sync components command
     */
    private async handleSyncComponents(): Promise<{ success: boolean; message: string; componentCount?: number }> {
        try {
            // Clear cache first
            this.r2Client.clearCache();

            // Fetch fresh manifest
            const manifest = await this.r2Client.getComponentManifest();

            return {
                success: true,
                message: `Successfully synced ${manifest.components.length} components`,
                componentCount: manifest.components.length
            };
        } catch (error: any) {
            return {
                success: false,
                message: `Failed to sync components: ${error.message}`
            };
        }
    }

    /**
     * Handle show cache stats command
     */
    private async handleShowCacheStats(): Promise<{ success: boolean; stats?: any; message?: string }> {
        try {
            const stats = this.r2Client.getCacheStats();

            return {
                success: true,
                stats: {
                    manifestCached: stats.manifest,
                    metadataEntriesCached: stats.metadataCount
                }
            };
        } catch (error: any) {
            return {
                success: false,
                message: `Failed to get cache stats: ${error.message}`
            };
        }
    }

    /**
     * Handle test connection command
     */
    private async handleTestConnection(): Promise<{ success: boolean; message: string }> {
        console.log('🧪 [CommandHandler] handleTestConnection() called');

        try {
            console.log('🔍 [CommandHandler] Validating configuration...');
            // Validate configuration
            if (!this.configService.isValid()) {
                console.error('❌ [CommandHandler] Configuration validation FAILED');
                const errors = this.configService.getValidationErrors();
                console.error('❌ [CommandHandler] Validation errors:', errors);
                return {
                    success: false,
                    message: `Configuration invalid:\n${errors.join('\n')}`
                };
            }

            console.log('✅ [CommandHandler] Configuration is valid');
            console.log('🌐 [CommandHandler] Testing R2 connection...');

            // Test connection
            const connected = await this.r2Client.testConnection();

            if (connected) {
                console.log('✅ [CommandHandler] Connection test PASSED');
                return {
                    success: true,
                    message: 'Successfully connected to R2 bucket'
                };
            } else {
                console.error('❌ [CommandHandler] Connection test FAILED');
                return {
                    success: false,
                    message: 'Failed to connect to R2 bucket. Please check your credentials.'
                };
            }
        } catch (error: any) {
            console.error('❌ [CommandHandler] FATAL ERROR in handleTestConnection');
            console.error('❌ [CommandHandler] Error:', error);
            return {
                success: false,
                message: `Connection test failed: ${error.message}`
            };
        }
    }
}
