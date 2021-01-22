import { registerDecorator, ValidationOptions } from 'class-validator';
import moment from "moment";
export function IsFutureDate(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: 'isFutureDate',
            target: object.constructor,
            propertyName: propertyName,
            options: {
                message: `${propertyName} is in the past`,
                ...validationOptions
            },
            validator: {
                validate(value: any) {
                    return moment(value).isAfter(moment());
                },
            },
        });
    };
}