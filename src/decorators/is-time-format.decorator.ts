import { registerDecorator, ValidationOptions } from "class-validator";
import moment from "moment";
export function IsRightTimeFormat(validationOptions?: ValidationOptions) {
  return function(object: Object, propertyName: string) {
    registerDecorator({
      name: "isRightTimeFormat",
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message: `${propertyName} is not the right Time format, must be HH:mm`,
        ...validationOptions,
      },
      validator: {
        validate(value: any) {
          return moment(value, "HH:mm", true).isValid();
        },
      },
    });
  };
}
