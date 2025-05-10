// Test setup file
import { jest } from '@jest/globals';

jest.setTimeout(30000); // 30 seconds

// Mock environment variables if needed
// process.env.SOME_ENV_VAR = 'test_value';

// Global test helpers
global.consoleErrorBackup = console.error;
console.error = (...args) => {
  if (args[0] && typeof args[0] === 'string' && args[0].includes('Warning: ')) {
    // Filter out React warnings during tests
    return;
  }
  global.consoleErrorBackup(...args);
};

// Restore console.error after tests - moved to individual test files
// since afterAll needs to be imported from @jest/globals