/* Runs before test env; polyfills required by react-router-dom etc. */
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
