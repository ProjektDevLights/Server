import { registerDecorator, ValidationOptions } from 'class-validator';
import { USER_PATTERNS } from 'src/interfaces/patterns/user-pattern.type';
export function IsPattern(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: 'isPattern',
            target: object.constructor,
            propertyName: propertyName,
            options: {
                message: `${propertyName} must be one of [${USER_PATTERNS.join(", ")}]`,
                ...validationOptions
            },
            validator: {
                validate(value: any) {
                    return USER_PATTERNS.includes(value);
                },
            },
        });
    };
}