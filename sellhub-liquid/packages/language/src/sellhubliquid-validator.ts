import type { ValidationAcceptor, ValidationChecks } from 'langium';
import type { SellhubliquidAstType, Person } from './generated/ast.js';
import type { SellhubliquidServices } from './sellhubliquid-module.js';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: SellhubliquidServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.SellhubliquidValidator;
    const checks: ValidationChecks<SellhubliquidAstType> = {
        Person: validator.checkPersonStartsWithCapital
    };
    registry.register(checks, validator);
}

/**
 * Implementation of custom validations.
 */
export class SellhubliquidValidator {

    checkPersonStartsWithCapital(person: Person, accept: ValidationAcceptor): void {
        if (person.name) {
            const firstChar = person.name.substring(0, 1);
            if (firstChar.toUpperCase() !== firstChar) {
                accept('warning', 'Person name should start with a capital.', { node: person, property: 'name' });
            }
        }
    }

}
