import type { ValidationAcceptor, ValidationChecks } from 'langium';
import type { SellhubLiquidAstType, IslandTag } from './generated/ast.js';
import type { SellhubLiquidServices } from './sellhub-liquid-module.js';
import { R2Client } from './services/r2-client.js';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: SellhubLiquidServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.SellhubLiquidValidator;
    const checks: ValidationChecks<SellhubLiquidAstType> = {
        IslandTag: [
            validator.checkIslandComponentExists,
            validator.checkIslandRequiredProps,
            validator.checkIslandHydrateValue
        ]
    };
    registry.register(checks, validator);
}

/**
 * Implementation of custom validations.
 */
export class SellhubLiquidValidator {
    private r2Client: R2Client;

    constructor(r2Client: R2Client) {
        this.r2Client = r2Client;
    }

    /**
     * Validate that the island component exists in the manifest
     */
    async checkIslandComponentExists(islandTag: IslandTag, accept: ValidationAcceptor): Promise<void> {
        const componentName = this.extractComponentName(islandTag);

        if (!componentName) {
            accept('error', 'Island component name is required', {
                node: islandTag,
                property: 'name'
            });
            return;
        }

        try {
            const manifest = await this.r2Client.getComponentManifest();

            if (!manifest.components.includes(componentName)) {
                accept('error', `Unknown component "${componentName}". Component not found in manifest.`, {
                    node: islandTag,
                    property: 'name'
                });
            }
        } catch (error) {
            // Don't report errors if we can't fetch the manifest
            console.error('SellhubLiquidValidator: Failed to validate component existence:', error);
        }
    }

    /**
     * Validate that required props are provided
     */
    async checkIslandRequiredProps(islandTag: IslandTag, accept: ValidationAcceptor): Promise<void> {
        const componentName = this.extractComponentName(islandTag);

        if (!componentName) {
            return;
        }

        try {
            const metadata = await this.r2Client.getComponentMetadata(componentName);

            if (!metadata || !metadata.props) {
                return;
            }

            // Get provided props
            const providedProps = this.getProvidedProps(islandTag);

            // Check for missing required props
            for (const [propName, propDef] of Object.entries<any>(metadata.props)) {
                if (propDef.required && !providedProps.has(propName)) {
                    accept('error', `Missing required prop "${propName}" for component "${componentName}"`, {
                        node: islandTag,
                        property: 'props'
                    });
                }
            }

            // Check for unknown props
            for (const providedProp of providedProps) {
                if (!metadata.props[providedProp]) {
                    accept('warning', `Unknown prop "${providedProp}" for component "${componentName}"`, {
                        node: islandTag,
                        property: 'props'
                    });
                }
            }
        } catch (error) {
            console.error('SellhubLiquidValidator: Failed to validate required props:', error);
        }
    }

    /**
     * Validate hydrate value if provided
     */
    checkIslandHydrateValue(islandTag: IslandTag, accept: ValidationAcceptor): void {
        if (!islandTag.hydrate) {
            return;
        }

        const hydrateValue = this.extractStringValue(islandTag.hydrate);

        if (!hydrateValue) {
            return;
        }

        const validStrategies = ['eager', 'lazy', 'idle'];

        if (!validStrategies.includes(hydrateValue)) {
            accept('error', `Invalid hydration strategy "${hydrateValue}". Must be one of: ${validStrategies.join(', ')}`, {
                node: islandTag,
                property: 'hydrate'
            });
        }
    }

    /**
     * Extract component name from IslandTag
     */
    private extractComponentName(islandTag: IslandTag): string | null {
        const name = islandTag.name;

        if (typeof name === 'string') {
            // Remove quotes if present
            return name.replace(/^["']|["']$/g, '');
        }

        return null;
    }

    /**
     * Extract string value (remove quotes)
     */
    private extractStringValue(value: any): string | null {
        if (typeof value === 'string') {
            return value.replace(/^["']|["']$/g, '');
        }

        return null;
    }

    /**
     * Get set of provided prop names from IslandTag
     */
    private getProvidedProps(islandTag: IslandTag): Set<string> {
        const props = new Set<string>();

        if (!islandTag.props || !islandTag.props.properties) {
            return props;
        }

        for (const property of islandTag.props.properties) {
            if (property.key) {
                props.add(property.key);
            }
        }

        return props;
    }
}
