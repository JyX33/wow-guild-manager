// Jest configuration for ES modules
export default {
  // Tell Jest to expect ESM modules
  preset: 'ts-jest/presets/default-esm',
  
  // Transform TypeScript files with ts-jest
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.json',
      },
    ],
  },
  
  // Explicitly handle file extensions
  moduleFileExtensions: ['ts', 'tsx', 'mjs', 'js', 'jsx', 'json', 'node'],
  
  // Ignore node_modules and dist folders
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  
  // ESM support for package imports
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^(../../../shared/types/.*)\\.js$': '$1',
  },

  // Add moduleDirectories to help Jest locate modules
  moduleDirectories: ['node_modules', '../shared'],
  
  // Node environment for tests
  testEnvironment: 'node',
  
  // Use for Jest's global API
  injectGlobals: true,
  
  // Other settings
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  clearMocks: true,
  
  // Override testTimeout if needed
  testTimeout: 30000,
};