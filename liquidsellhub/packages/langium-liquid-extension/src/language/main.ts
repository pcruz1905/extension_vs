import { startLanguageServer } from 'langium/lsp';
import { NodeFileSystem } from 'langium/node';
import { createConnection, ProposedFeatures } from 'vscode-languageserver/node.js';
import { createSellhubLiquidServices, CommandHandler } from 'sellhub-liquid-language';

// Create a connection to the client
const connection = createConnection(ProposedFeatures.all);

// Inject the shared services and language-specific services
const { shared, SellhubLiquid } = createSellhubLiquidServices({ connection, ...NodeFileSystem });

// Register custom command handlers
const commandHandler = new CommandHandler(
    connection,
    SellhubLiquid.services.R2Client,
    SellhubLiquid.services.ConfigService
);
commandHandler.registerCommands();

// Start the language server with the shared services
startLanguageServer(shared);
