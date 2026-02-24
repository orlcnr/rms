import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator'

export function IsSafeString(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: 'isSafeString',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    if (typeof value !== 'string') return false

                    // XSS patterns
                    const xssPatterns = [
                        /<script[^>]*>.*?<\/script>/gi,
                        /javascript:/gi,
                        /on\w+\s*=/gi,
                        /<iframe/gi,
                        /<object/gi,
                        /<embed/gi,
                        /vbscript:/gi,
                        /data:text\/html/gi
                    ]

                    return !xssPatterns.some(pattern => pattern.test(value))
                },
                defaultMessage(args: ValidationArguments) {
                    return `${args.property} contains potentially dangerous content`
                }
            }
        })
    }
}

export function IsSlug(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: 'isSlug',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    if (typeof value !== 'string') return false
                    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
                },
                defaultMessage(args: ValidationArguments) {
                    return `${args.property} must be a valid slug (lowercase letters, numbers, and hyphens only)`
                }
            }
        })
    }
}
