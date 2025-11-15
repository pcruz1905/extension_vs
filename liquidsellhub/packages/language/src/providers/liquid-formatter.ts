/**
 * LiquidFormatter - Provides code formatting for Liquid templates
 *
 * Enables document formatting support for Liquid files.
 * The actual indentation rules are defined in language-configuration.json
 */

import { AbstractFormatter } from 'langium/lsp';
import { AstNode } from 'langium';

export class LiquidFormatter extends AbstractFormatter {
    protected format(node: AstNode): void {
        // The formatter is registered to enable "Format Document" command
        // Actual formatting rules are handled by language-configuration.json
        // which provides:
        // - Auto-indentation rules
        // - Bracket matching
        // - On-enter rules

        // No custom formatting logic needed here as the language-configuration.json
        // already handles indentation correctly
    }
}
