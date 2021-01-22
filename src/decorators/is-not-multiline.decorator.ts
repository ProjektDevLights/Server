import { registerDecorator, ValidationOptions } from 'class-validator';
export function IsNotMultiLine(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: 'isNotMultiLine',
            target: object.constructor,
            propertyName: propertyName,
            options: {
                message: `${propertyName} must not be multiline`,
                ...validationOptions
            },
            validator: {
                validate(value: any) {
                    return !value.includes("\n") && !value.includes("\r");
                },
            },
        });
    };
}