#!/bin/bash
# Run just our specific tests
npx jest tests/http-client.test.ts tests/battlenet-api-client.test.ts --testPathIgnorePatterns="integration"