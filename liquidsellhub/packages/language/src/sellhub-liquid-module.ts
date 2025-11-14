import { type Module, inject } from 'langium';
import {
    createDefaultModule,
    createDefaultSharedModule,
    type DefaultSharedModuleContext,
    type LangiumServices,
    type LangiumSharedServices,
    type PartialLangiumServices
} from 'langium/lsp';
import { SellhubLiquidGeneratedModule, SellhubLiquidGeneratedSharedModule } from './generated/module.js';
import { SellhubLiquidValidator, registerValidationChecks } from './sellhub-liquid-validator.js';
import { R2Client } from './services/r2-client.js';
import { ConfigService } from './services/config-service.js';
import { IslandsCompletionProvider } from './providers/islands-completion-provider.js';
import { ContextCompletionProvider } from './providers/context-completion-provider.js';
import { IslandsHoverProvider } from './providers/islands-hover-provider.js';
import { IslandsCodeActionProvider } from './providers/islands-code-action-provider.js';
import { LiquidFormatter } from './providers/liquid-formatter.js';

/**
 * Declaration of custom services - add your own service classes here.
 */
export type SellhubLiquidAddedServices = {
    validation: {
        SellhubLiquidValidator: SellhubLiquidValidator
    },
    services: {
        R2Client: R2Client,
        ConfigService: ConfigService
    },
    providers: {
        IslandsCompletionProvider: IslandsCompletionProvider,
        ContextCompletionProvider: ContextCompletionProvider,
        IslandsHoverProvider: IslandsHoverProvider,
        IslandsCodeActionProvider: IslandsCodeActionProvider
    }
}

/**
 * Union of Langium default services and your custom services - use this as constructor parameter
 * of custom service classes.
 */
export type SellhubLiquidServices = LangiumServices & SellhubLiquidAddedServices

/**
 * Dependency injection module that overrides Langium default services and contributes the
 * declared custom services. The Langium defaults can be partially specified to override only
 * selected services, while the custom services must be fully specified.
 */
export const SellhubLiquidModule: Module<SellhubLiquidServices, PartialLangiumServices & SellhubLiquidAddedServices> = {
    services: {
        ConfigService: (services) => {
            console.log('🏗️ [MODULE] Creating ConfigService...');
            const configService = new ConfigService();

            // Debug: Check what's available
            console.log('🔍 [MODULE] services.shared exists:', !!services.shared);
            console.log('🔍 [MODULE] services.shared.workspace exists:', !!(services.shared && services.shared.workspace));
            console.log('🔍 [MODULE] services.shared.lsp exists:', !!(services.shared && services.shared.lsp));
            console.log('🔍 [MODULE] services.shared.lsp.Connection exists:', !!(services.shared && services.shared.lsp && services.shared.lsp.Connection));

            // Set configuration provider from shared services
            if (services.shared && services.shared.workspace && services.shared.workspace.ConfigurationProvider) {
                console.log('✅ [MODULE] Setting ConfigurationProvider');
                configService.setConfigurationProvider(services.shared.workspace.ConfigurationProvider);
            } else {
                console.warn('⚠️ [MODULE] ConfigurationProvider NOT available');
            }

            // Set connection for direct workspace configuration access
            if (services.shared && services.shared.lsp && services.shared.lsp.Connection) {
                console.log('✅ [MODULE] Setting Connection');
                configService.setConnection(services.shared.lsp.Connection);
            } else {
                console.warn('⚠️ [MODULE] LSP Connection NOT available');
            }

            console.log('✅ [MODULE] ConfigService created');
            return configService;
        },
        R2Client: (services) => {
            // Initialize R2Client with configuration from ConfigService
            const configService = services.services.ConfigService;
            const config = configService.getConfig();
            return new R2Client(config);
        }
    },
    providers: {
        IslandsCompletionProvider: (services) => {
            const r2Client = services.services.R2Client;
            const contextCompletionProvider = services.providers.ContextCompletionProvider;
            return new IslandsCompletionProvider(services, r2Client, contextCompletionProvider);
        },
        ContextCompletionProvider: () => new ContextCompletionProvider(),
        IslandsHoverProvider: (services) => {
            const r2Client = services.services.R2Client;
            return new IslandsHoverProvider(r2Client);
        },
        IslandsCodeActionProvider: (services) => {
            const r2Client = services.services.R2Client;
            return new IslandsCodeActionProvider(r2Client);
        }
    },
    validation: {
        SellhubLiquidValidator: (services) => {
            const r2Client = services.services.R2Client;
            return new SellhubLiquidValidator(r2Client);
        }
    },
    lsp: {
        CompletionProvider: (services) => services.providers.IslandsCompletionProvider,
        CodeActionProvider: (services) => services.providers.IslandsCodeActionProvider,
        Formatter: () => new LiquidFormatter()
    }
};

/**
 * Create the full set of services required by Langium.
 *
 * First inject the shared services by merging two modules:
 *  - Langium default shared services
 *  - Services generated by langium-cli
 *
 * Then inject the language-specific services by merging three modules:
 *  - Langium default language-specific services
 *  - Services generated by langium-cli
 *  - Services specified in this file
 *
 * @param context Optional module context with the LSP connection
 * @returns An object wrapping the shared services and the language-specific services
 */
export function createSellhubLiquidServices(context: DefaultSharedModuleContext): {
    shared: LangiumSharedServices,
    SellhubLiquid: SellhubLiquidServices
} {
    const shared = inject(
        createDefaultSharedModule(context),
        SellhubLiquidGeneratedSharedModule
    );
    const SellhubLiquid = inject(
        createDefaultModule({ shared }),
        SellhubLiquidGeneratedModule,
        SellhubLiquidModule
    );
    shared.ServiceRegistry.register(SellhubLiquid);

    // Load configuration asynchronously
    if (context.connection) {
        console.log('🔌 [MODULE] Context has connection - setting up onInitialized handler');
        // Running in language server, wait for initialization
        context.connection.onInitialized(async () => {
            console.log('='.repeat(80));
            console.log('🎬 [MODULE] LSP onInitialized event fired!');
            console.log('='.repeat(80));

            try {
                console.log('📥 [MODULE] Calling ConfigService.loadConfiguration()...');
                await SellhubLiquid.services.ConfigService.loadConfiguration();
                console.log('✅ [MODULE] ConfigService.loadConfiguration() completed');

                // Update R2Client with loaded configuration
                console.log('🔄 [MODULE] Getting config from ConfigService...');
                const config = SellhubLiquid.services.ConfigService.getConfig();
                console.log('📊 [MODULE] Config retrieved:', JSON.stringify({
                    r2AccountId: config.r2AccountId ? `${config.r2AccountId.substring(0, 8)}...` : 'MISSING',
                    r2AccessKeyId: config.r2AccessKeyId ? `${config.r2AccessKeyId.substring(0, 8)}...` : 'MISSING',
                    r2SecretAccessKey: config.r2SecretAccessKey ? '***PRESENT***' : 'MISSING',
                    r2BucketName: config.r2BucketName || 'MISSING'
                }, null, 2));

                console.log('🔄 [MODULE] Updating R2Client with loaded config...');
                SellhubLiquid.services.R2Client.updateConfig(config);
                console.log('✅ [MODULE] R2Client updated successfully');
            } catch (error) {
                console.error('❌ [MODULE] Error during initialization:');
                console.error(error);
            }

            console.log('='.repeat(80));
            console.log('🎉 [MODULE] onInitialized handler completed');
            console.log('='.repeat(80));
        });
        console.log('✅ [MODULE] onInitialized handler registered');
    } else {
        console.log('⚠️ [MODULE] No connection in context - not running as language server');
        // Not running in language server, initialize immediately
        shared.workspace.ConfigurationProvider.initialized({});
    }

    registerValidationChecks(SellhubLiquid);

    return { shared, SellhubLiquid };
}
