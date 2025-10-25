export interface ValidationRule {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: any) => string | null;
}

export interface ValidationResult {
    isValid: boolean;
    errors: { [field: string]: string };
}

export interface FormField {
    value: any;
    rules: ValidationRule;
    label: string;
}

export interface FormValidationSchema {
    [fieldName: string]: FormField;
}

/**
 * Validate a single field based on its rules
 */
export const validateField = (value: any, rules: ValidationRule, label: string): string | null => {
    // Required validation
    if (rules.required) {
        if (value === null || value === undefined || value === '' || 
            (Array.isArray(value) && value.length === 0)) {
            return `${label} is required`;
        }
    }

    // Skip other validations if value is empty and not required
    if (!rules.required && (value === null || value === undefined || value === '')) {
        return null;
    }

    // String validations
    if (typeof value === 'string') {
        if (rules.minLength && value.length < rules.minLength) {
            return `${label} must be at least ${rules.minLength} characters long`;
        }

        if (rules.maxLength && value.length > rules.maxLength) {
            return `${label} must be no more than ${rules.maxLength} characters long`;
        }

        if (rules.pattern && !rules.pattern.test(value)) {
            return `${label} format is invalid`;
        }
    }

    // Array validations (for images)
    if (Array.isArray(value)) {
        if (rules.required && value.length === 0) {
            return `${label} is required`;
        }
    }

    // Custom validation
    if (rules.custom) {
        const customError = rules.custom(value);
        if (customError) {
            return customError;
        }
    }

    return null;
};

/**
 * Validate entire form based on validation schema
 */
export const validateForm = (schema: FormValidationSchema): ValidationResult => {
    const errors: { [field: string]: string } = {};
    let isValid = true;

    Object.entries(schema).forEach(([fieldName, field]) => {
        const error = validateField(field.value, field.rules, field.label);
        if (error) {
            errors[fieldName] = error;
            isValid = false;
        }
    });

    return { isValid, errors };
};

/**
 * Predefined validation rules
 */
export const validationRules = {
    required: { required: true },
    email: {
        required: true,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    price: {
        required: true,
        custom: (value: string) => {
            const numValue = parseFloat(value.replace(/[$,]/g, ''));
            if (isNaN(numValue) || numValue <= 0) {
                return 'Please enter a valid price greater than 0';
            }
            return null;
        }
    },
    notes: {
        required: true,
        maxLength: 1000
    },
    images: {
        required: false
    }
};

/**
 * Format price input with currency symbol and commas
 */
export const formatPrice = (value: string): string => {
    // Remove all non-numeric characters except decimal
    const numericValue = value.replace(/[^\d.]/g, '');
    
    // Parse as number
    const num = parseFloat(numericValue);
    
    if (isNaN(num)) return '';
    
    // Format with commas and dollar sign
    return '$' + num.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
};

/**
 * Extract numeric value from formatted price
 */
export const extractNumericPrice = (formattedPrice: string): number => {
    const numericValue = formattedPrice.replace(/[$,]/g, '');
    return parseFloat(numericValue) || 0;
}; 