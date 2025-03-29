/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { /* ts-jest config options can go here if needed */ }],
  },
  // Optional: Specify roots if your tests aren't directly under the root
  // roots: ['<rootDir>/src'],
  // Optional: Match test files (default is good for most cases)
  // testMatch: ['**/__tests__/**/*.+(ts|tsx|js)', '**/?(*.)+(spec|test).+(ts|tsx|js)'],
  // Optional: Module name mapping if needed
  // moduleNameMapper: {
  //   '^@/(.*)$': '<rootDir>/src/$1',
  // },
  // Optional: Setup files to run before tests (e.g., for env vars, db connections)
  // setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  clearMocks: true, // Automatically clear mock calls and instances between every test
};