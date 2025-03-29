# Logging and Job ID Improvement Plan

## 1. Problem Analysis

Based on the review of `logs/backend.log` and the source code file `backend/src/services/battlenet-api.client.ts`, two issues were identified:

### 1.1. `<no-id>` Prefix in Job IDs

* **Observation:** Log messages from the `ApiClient Limiter` (using Bottleneck.js) show job IDs like `<no-id>-u8azx20mem`.
* **Root Cause:** The code in `backend/src/services/battlenet-api.client.ts`, specifically within the `scheduleWithRetry` method (and the methods calling it like `getGuildData`, `getGuildRoster`, `getEnhancedCharacterData`), does not provide an explicit `id` option when scheduling tasks using `this.limiter.schedule()`.
* **Result:** Bottleneck uses a default placeholder or undefined value for the ID part (`<no-id>`) combined with its internal unique job instance identifier, making it difficult to track specific API calls in the logs.

### 1.2. Missing Timestamps in Logs

* **Observation:** Log entries in `logs/backend.log` do not have timestamps.
* **Root Cause:** The application currently uses standard Node.js `console.log()`, `console.warn()`, and `console.error()` functions for logging throughout the codebase (e.g., in `battlenet-api.client.ts`). These functions do not include timestamps by default.
* **Result:** It's harder to correlate events, measure durations, and debug issues without precise timing information for each log entry.

## 2. Proposed Solution

The following plan addresses the identified issues:

### 2.1. Implement Descriptive Job IDs

* **Action:** Modify the relevant methods (`getGuildData`, `getGuildRoster`, `getEnhancedCharacterData`) in `backend/src/services/battlenet-api.client.ts` to construct and pass a descriptive `id` option when calling `this.limiter.schedule()`.
* **Example IDs:**
  * For `getGuildData`: `id: \`guild-${region}-${realmSlug}-${guildNameSlug}\`` (e.g., `guild-eu-hyjal-in-nomine-honoris`)
  * For `getGuildRoster`: `id: \`roster-${region}-${realmSlug}-${guildNameSlug}\`` (e.g., `roster-eu-hyjal-in-nomine-honoris`)
  * For `getEnhancedCharacterData`: `id: \`char-${region}-${realmSlug}-${characterNameLower}\`` (e.g., `char-eu-hyjal-baleckdolaxe`)
* **Benefit:** Logs will clearly show which specific API call corresponds to each limiter event, significantly improving traceability.

### 2.2. Introduce a Dedicated Logging Library

* **Action:** Integrate a dedicated logging library (e.g., Pino for performance or Winston for configurability) into the backend application.
* **Configuration:** Configure the chosen library to:
  * Automatically prepend timestamps (e.g., ISO 8601 format) to all log messages.
  * Include log levels (e.g., INFO, WARN, ERROR, DEBUG).
  * Potentially output logs in a structured format (like JSON) for easier parsing by log management systems.
* **Refactoring:** Replace all existing `console.log`, `console.warn`, `console.error` calls throughout the backend codebase with the corresponding methods from the new logger instance (e.g., `logger.info()`, `logger.warn()`, `logger.error()`).
* **Benefit:** Provides consistent, timestamped, leveled, and potentially structured logging across the application, enhancing observability and debugging capabilities.

## 3. Conceptual Flow Diagram (Job ID Fix)

```mermaid
graph LR
    A[API Call Method e.g., getGuildData(...)] --> B{Call scheduleWithRetry};
    B --> C{Define taskFn};
    B --> D[Construct Descriptive Job ID e.g., "guild-eu-hyjal-test"];
    B --> E{limiter.schedule(taskFn, { id: JobID })};
    E --> F[Log Event (e.g., 'executing')];
    F --> G[Log Message uses jobInfo.options.id (now descriptive)];
```

## 4. Status

This plan was reviewed and approved on 2025-03-29. Implementation can proceed.
