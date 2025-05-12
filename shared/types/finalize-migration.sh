#!/bin/bash

# This script finalizes the shared types migration by:
# 1. Verifying that all types are exported correctly
# 2. Making a backup of the current index.ts
# 3. Replacing it with the new version

# Step 1: Move to the types directory
cd "$(dirname "$0")"

# Step 2: Run TSC to verify the test file compiles
echo "Verifying types with TypeScript..."
cd ../../
npx tsc shared/types/test-exports.ts --noEmit

# Check if TypeScript verification succeeded
if [ $? -eq 0 ]; then
  echo "✓ Type verification successful!"
  
  # Step 3: Make a backup of the current index.ts
  echo "Creating backup of current index.ts..."
  cd shared/types/
  mv index.ts index.ts.bak
  
  # Step 4: Replace with the new version
  echo "Installing new index.ts..."
  mv index.ts.new index.ts
  
  echo "✓ Migration completed successfully!"
  echo "The old index.ts has been backed up as index.ts.bak"
else
  echo "✗ Type verification failed! Migration aborted."
  echo "Please fix the errors and try again."
  exit 1
fi