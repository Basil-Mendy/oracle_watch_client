/**
 * Professional Design System
 * Colors, spacing, typography, and reusable design tokens
 */

export const colors = {
    // Primary Colors
    primary: {
        main: '#1e40af',      // Deep Blue
        light: '#3b82f6',     // Bright Blue
        lighter: '#dbeafe',   // Light Blue
        dark: '#1e3a8a',      // Dark Blue
    },

    // Secondary Colors
    secondary: {
        main: '#7c3aed',      // Purple
        light: '#a78bfa',     // Light Purple
        dark: '#5b21b6',      // Dark Purple
    },

    // Status Colors
    success: {
        main: '#10b981',      // Emerald Green
        light: '#d1fae5',
        dark: '#047857',
    },

    warning: {
        main: '#f59e0b',      // Amber
        light: '#fef3c7',
        dark: '#d97706',
    },

    error: {
        main: '#ef4444',      // Red
        light: '#fee2e2',
        dark: '#991b1b',
    },

    info: {
        main: '#06b6d4',      // Cyan
        light: '#cffafe',
        dark: '#0369a1',
    },

    // Neutral Colors
    neutral: {
        50: '#f9fafb',
        100: '#f3f4f6',
        200: '#e5e7eb',
        300: '#d1d5db',
        400: '#9ca3af',
        500: '#6b7280',
        600: '#4b5563',
        700: '#374151',
        800: '#1f2937',
        900: '#111827',
    },

    // Semantic Colors
    background: '#ffffff',
    surface: '#f9fafb',
    text: {
        primary: '#111827',
        secondary: '#4b5563',
        tertiary: '#9ca3af',
        inverse: '#ffffff',
    },
    border: '#e5e7eb',
    divider: '#f3f4f6',
};

export const spacing = {
    0: '0',
    1: '0.25rem',    // 4px
    2: '0.5rem',     // 8px
    3: '0.75rem',    // 12px
    4: '1rem',       // 16px
    5: '1.25rem',    // 20px
    6: '1.5rem',     // 24px
    8: '2rem',       // 32px
    10: '2.5rem',    // 40px
    12: '3rem',      // 48px
    16: '4rem',      // 64px
    20: '5rem',      // 80px
    24: '6rem',      // 96px
};

export const typography = {
    fontFamily: "'Segoe UI', 'Inter', 'Roboto', 'Helvetica Neue', sans-serif",

    h1: {
        fontSize: '2.5rem',    // 40px
        fontWeight: 700,
        lineHeight: 1.2,
    },

    h2: {
        fontSize: '2rem',      // 32px
        fontWeight: 700,
        lineHeight: 1.25,
    },

    h3: {
        fontSize: '1.5rem',    // 24px
        fontWeight: 600,
        lineHeight: 1.33,
    },

    h4: {
        fontSize: '1.25rem',   // 20px
        fontWeight: 600,
        lineHeight: 1.4,
    },

    body: {
        fontSize: '1rem',      // 16px
        fontWeight: 400,
        lineHeight: 1.5,
    },

    bodySmall: {
        fontSize: '0.875rem',  // 14px
        fontWeight: 400,
        lineHeight: 1.5,
    },

    caption: {
        fontSize: '0.75rem',   // 12px
        fontWeight: 500,
        lineHeight: 1.33,
    },
};

export const borderRadius = {
    none: '0',
    small: '0.375rem',      // 6px
    base: '0.5rem',         // 8px
    medium: '0.75rem',      // 12px
    large: '1rem',          // 16px
    xlarge: '1.5rem',       // 24px
    full: '9999px',
};

export const shadow = {
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    base: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    md: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    lg: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    xl: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
};

export const transition = {
    fast: '150ms cubic-bezier(0.23, 1, 0.320, 1)',
    base: '250ms cubic-bezier(0.23, 1, 0.320, 1)',
    slow: '350ms cubic-bezier(0.23, 1, 0.320, 1)',
};

export const breakpoints = {
    xs: '0px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    xxl: '1536px',
};
