import type { ValidationAcceptor, ValidationChecks } from 'langium';
import type { LiquidSellhubAstType, Person } from './generated/ast.js';
import type { LiquidSellhubServices } from './liquid-sellhub-module.js';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: LiquidSellhubServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.LiquidSellhubValidator;
    const checks: ValidationChecks<LiquidSellhubAstType> = {
        Person: validator.checkPersonStartsWithCapital
    };
    registry.register(checks, validator);
}

/**
 * Implementation of custom validations.
 */
export class LiquidSellhubValidator {

    checkPersonStartsWithCapital(person: Person, accept: ValidationAcceptor): void {
        if (person.name) {
            const firstChar = person.name.substring(0, 1);
            if (firstChar.toUpperCase() !== firstChar) {
                accept('warning', 'Person name should start with a capital.', { node: person, property: 'name' });
            }
        }
    }

}
