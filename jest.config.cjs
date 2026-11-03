/**
 * Jest configuration for the Frontend test suite.
 *
 * - testEnvironment: 'jsdom' — browser-like globals (window, document) for React/DOM tests.
 * - testMatch: only files ending in .test.js or .test.jsx.
 * - transform: babel-jest for .js/.jsx (see babel.config.cjs: preset-env, preset-react, babel-preset-vite).
 * - setupFiles: polyfills (TextEncoder/TextDecoder) for react-router-dom.
 * - setupFilesAfterEnv: @testing-library/jest-dom matchers.
 * - moduleNameMapper: mock CSS and image imports so components and tests don't load real assets.
 * - transformIgnorePatterns: transpile react-router-dom from node_modules when needed.
 */
/** @type {import('jest').Config} */
module.exports = {
    testEnvironment: 'jsdom',
    setupFiles: ['<rootDir>/src/test/polyfills.cjs'],
    setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
    moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],
    testMatch: ['**/*.test.js', '**/*.test.jsx', '**/*.test.ts', '**/*.test.tsx'],
    transform: {
        '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
    },
    transformIgnorePatterns: ['/node_modules/(?!react-router-dom)'],
    moduleNameMapper: {
        '\\.(png|jpg|jpeg|gif|svg|webp)$': '<rootDir>/src/test/__mocks__/fileMock.cjs',
        '\\.css$': '<rootDir>/src/test/__mocks__/fileMock.cjs',
    },
};
