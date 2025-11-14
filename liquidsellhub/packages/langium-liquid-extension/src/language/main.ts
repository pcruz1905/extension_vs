import { startLanguageServer } from 'langium/lsp';
import { NodeFileSystem } from 'langium/node';
import { createConnection, ProposedFeatures } from 'vscode-languageserver/node.js';
import { createSellhubLiquidServices, CommandHandler } from 'sellhub-liquid-language';

console.log('='.repeat(80));
console.log('🚀 [LSP MAIN] Sellhub Liquid Language Server Starting...');
console.log('='.repeat(80));

console.log('🔌 [LSP MAIN] Creating connection to the client...');
// Create a connection to the client
const connection = createConnection(ProposedFeatures.all);
console.log('✅ [LSP MAIN] Connection created successfully');

console.log('🏗️ [LSP MAIN] Creating Sellhub Liquid services...');
// Inject the shared services and language-specific services
const { shared, SellhubLiquid } = createSellhubLiquidServices({ connection, ...NodeFileSystem });
console.log('✅ [LSP MAIN] Services created successfully');

console.log('📊 [LSP MAIN] Checking R2Client availability...');
if (SellhubLiquid.services.R2Client) {
    console.log('✅ [LSP MAIN] R2Client service found and ready');
} else {
    console.error('❌ [LSP MAIN] R2Client service NOT FOUND - this is a critical error!');
}

console.log('📊 [LSP MAIN] Checking ConfigService availability...');
if (SellhubLiquid.services.ConfigService) {
    console.log('✅ [LSP MAIN] ConfigService found and ready');
} else {
    console.error('❌ [LSP MAIN] ConfigService NOT FOUND - this is a critical error!');
}

console.log('🎮 [LSP MAIN] Creating CommandHandler...');
// Register custom command handlers
const commandHandler = new CommandHandler(
    connection,
    SellhubLiquid.services.R2Client,
    SellhubLiquid.services.ConfigService
);
console.log('✅ [LSP MAIN] CommandHandler created');

console.log('📝 [LSP MAIN] Registering commands...');
commandHandler.registerCommands();
console.log('✅ [LSP MAIN] Commands registered');

console.log('📥 [LSP MAIN] Registering configuration update handler...');
connection.onNotification('sellhubb/updateConfiguration', (config: any) => {
    console.log('='.repeat(80));
    console.log('📨 [LSP MAIN] Received configuration from client!');
    console.log('='.repeat(80));
    console.log('📊 [LSP MAIN] Config received:');
    console.log('  r2AccountId:', config.r2AccountId ? `${config.r2AccountId.substring(0, 8)}...` : 'NOT SET');
    console.log('  r2AccessKeyId:', config.r2AccessKeyId ? `${config.r2AccessKeyId.substring(0, 8)}...` : 'NOT SET');
    console.log('  r2SecretAccessKey:', config.r2SecretAccessKey ? '***PRESENT***' : 'NOT SET');
    console.log('  r2BucketName:', config.r2BucketName || 'NOT SET');

    console.log('🔄 [LSP MAIN] Updating ConfigService...');
    SellhubLiquid.services.ConfigService.updateConfig(config);
    console.log('✅ [LSP MAIN] ConfigService updated');

    console.log('🔄 [LSP MAIN] Updating R2Client...');
    SellhubLiquid.services.R2Client.updateConfig(config);
    console.log('✅ [LSP MAIN] R2Client updated');
    console.log('='.repeat(80));
});
console.log('✅ [LSP MAIN] Configuration update handler registered');

console.log('▶️ [LSP MAIN] Starting language server...');
// Start the language server with the shared services
startLanguageServer(shared);
console.log('✅ [LSP MAIN] Language server started successfully!');
console.log('='.repeat(80));
console.log('🎉 [LSP MAIN] Sellhub Liquid Language Server is now RUNNING');
console.log('='.repeat(80));
