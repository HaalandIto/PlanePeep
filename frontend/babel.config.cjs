/**
 * Babel configuration used by Jest (via babel-jest) to transpile test and source files.
 *
 * - @babel/preset-env: Transpiles modern JavaScript to a form Node can run. "node: 'current'"
 *   targets the current Node version so we don't over-transpile.
 * - @babel/preset-react: Transforms JSX into React.createElement (or jsx runtime) so .jsx
 *   test files and React components run under Jest.
 * - babel-preset-vite: Replaces import.meta.env (and import.meta.url) so Vite-style env vars
 *   work under Jest; { env: true } transforms import.meta.env to process.env.
 */
module.exports = {
    presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }],
        ['@babel/preset-typescript', { allowDeclareFields: true }],
        ['babel-preset-vite', { env: true, glob: false }],
    ],
};
