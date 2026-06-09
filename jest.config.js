/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  // criterios.js uses `module.exports` guarded by `typeof module !== 'undefined'`,
  // so it can be required directly from Node. script.js targets the browser and
  // will be loaded in a vm sandbox by the helper in tests/helpers/browserEnv.js.
};
