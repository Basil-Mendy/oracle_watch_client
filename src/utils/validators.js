/**
 * Form validation helpers
 */

export const validators = {
    email: (value) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(value) ? null : 'Invalid email address';
    },

    password: (value) => {
        if (!value) return 'Password is required';
        if (value.length < 8) return 'Password must be at least 8 characters';
        return null;
    },

    required: (value, fieldName = 'This field') => {
        if (!value || value.trim() === '') {
            return `${fieldName} is required`;
        }
        return null;
    },

    minLength: (value, min, fieldName = 'This field') => {
        if (value && value.length < min) {
            return `${fieldName} must be at least ${min} characters`;
        }
        return null;
    },

    maxLength: (value, max, fieldName = 'This field') => {
        if (value && value.length > max) {
            return `${fieldName} must not exceed ${max} characters`;
        }
        return null;
    },

    number: (value) => {
        if (isNaN(value) || value === '') {
            return 'Must be a valid number';
        }
        return null;
    },

    positive: (value) => {
        if (value < 0) {
            return 'Must be a positive number';
        }
        return null;
    },
};

export default validators;
