import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
    // Config files and build output: no type-checked linting
    {
        ignores: [
            'node_modules',
            'dist',
            'build',
            'out',
            '**/*.config.js',
            '**/*.config.cjs',
            '**/*.config.ts',
            '**/*.cjs',
            'coverage',
            '**/*.js.map',
        ],
    },

    // Apply to source TypeScript files only (config files are ignored)
    {
        files: ['src/**/*.{ts,tsx}'],
    },

    // ESLint recommended rules
    eslint.configs.recommended,

    // TypeScript ESLint recommended (no type-checked for broader compatibility)
    ...tseslint.configs.recommended,

    // Main configuration for TypeScript files
    {
        files: ['src/**/*.{ts,tsx}'],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                project: './tsconfig.json',
            },
            globals: {
                // Browser globals
                window: 'readonly',
                document: 'readonly',
                navigator: 'readonly',
                console: 'readonly',
                // Node.js globals
                process: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
                module: 'readonly',
                require: 'readonly',
                Buffer: 'readonly',
                global: 'readonly',
            },
        },
        rules: {
            // ====== Naming Conventions (STYLE.md Section 3) ======
            '@typescript-eslint/naming-convention': [
                'error',
                {
                    selector: 'default',
                    format: ['camelCase'],
                    leadingUnderscore: 'allow',
                    trailingUnderscore: 'allow',
                },
                {
                    selector: 'variable',
                    format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
                    leadingUnderscore: 'allow',
                    trailingUnderscore: 'allow',
                },
                {
                    selector: 'typeLike',
                    format: ['PascalCase'],
                },
                {
                    selector: 'enumMember',
                    format: ['UPPER_CASE'],
                },
                {
                    selector: 'property',
                    format: null,
                },
                {
                    selector: 'function',
                    format: ['camelCase', 'PascalCase'],
                    leadingUnderscore: 'allow',
                },
                {
                    selector: 'import',
                    format: ['camelCase', 'PascalCase'],
                    leadingUnderscore: 'allow',
                },
            ],

            // ====== Variable Declaration (STYLE.md Section 3) ======
            'prefer-const': 'error',
            'no-var': 'error',
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                },
            ],

            // ====== Array Type Syntax ======
            '@typescript-eslint/array-type': 'off',

            // ====== Explicit Member Accessibility (STYLE.md Section 3) ======
            '@typescript-eslint/explicit-member-accessibility': [
                'warn',
                {
                    accessibility: 'explicit',
                    overrides: {
                        constructors: 'no-public',
                    },
                },
            ],

            // ====== Brace Style Requirements (STYLE.md Section 2 & 3) ======
            curly: ['error', 'all'],
            'brace-style': 'off',
            '@typescript-eslint/brace-style': [
                'error',
                '1tbs',
                {
                    allowSingleLine: false,
                },
            ],

            // ====== Switch Default Case (STYLE.md Section 2) ======
            'default-case': 'error',
            'default-case-last': 'error',

            // ====== Code Quality Rules ======
            'no-console': 'warn',
            'no-debugger': 'error',
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/no-inferrable-types': 'off',

            // ====== Async/Promise Best Practices ======
            '@typescript-eslint/no-floating-promises': 'warn',
            '@typescript-eslint/no-misused-promises': 'warn',

            // ====== Type Safety ======
            '@typescript-eslint/strict-boolean-expressions': 'off',
            '@typescript-eslint/no-non-null-assertion': 'warn',
            '@typescript-eslint/require-await': 'warn',
        },
    },

    // Test files: relax strict rules for Jest patterns
    {
        files: ['src/**/*.test.{ts,tsx}'],
        rules: {
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
            '@typescript-eslint/no-require-imports': 'off',
        },
    },

    // Prettier config (must be last to override other formatting rules)
    eslintConfigPrettier,
];
