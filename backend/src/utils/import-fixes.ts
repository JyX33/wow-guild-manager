/**
 * This utility file provides a centralized way to handle modules that don't have default exports
 * but are imported as default exports in the codebase. This approach allows us to avoid modifying
 * every import statement throughout the codebase.
 */

import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import * as process from 'node:process';

// Export the modules as default to maintain compatibility with default imports
export default {
  crypto,
  jwt,
  process
};

// Also export the modules individually for specific imports
export { crypto, jwt, process };