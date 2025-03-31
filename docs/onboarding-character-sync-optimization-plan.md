# Onboarding Character Sync Optimization Plan

## Objective

Optimize the character synchronization process during user login/onboarding. Instead of processing all characters from the user's Battle.net profile every time, modify the backend to only identify and process characters that are new to our system for that specific user.

## Current Process Summary

1. **`OnboardingService.processNewUser`**:
    * Fetches the complete user profile from Battle.net using `battleNetApiClient.getWowProfile`. This profile contains a list of *all* the user's WoW characters across their accounts.
    * Calls `characterModel.syncCharactersFromBattleNet`, passing in the list of all characters.
2. **`CharacterModel.syncCharactersFromBattleNet`**:
    * Receives the full list of characters from the Battle.net profile.
    * Compares each character against the database records for the given `userId`.
    * If a character exists (match by name and realm), it performs an `UPDATE` with the basic data from the profile.
    * If a character does *not* exist, it performs an `INSERT`.
    * It returns a list (`processedIds`) containing the database IDs of *all* characters that were either inserted OR updated.
3. **`OnboardingService.processNewUser` (Continued)**:
    * Uses the `processedIds` list (containing both new and updated character IDs) to fetch enhanced data (`getEnhancedCharacterData`) for each of those characters.
    * Updates the corresponding character records in the database with this enhanced data.

## The Problem

The current implementation syncs (inserts or updates) *every* character from the user's Battle.net profile during the `syncCharactersFromBattleNet` step. The subsequent enhanced data fetch then runs for all these processed characters, not just the newly added ones.

## Proposed Plan

The core idea is to modify `characterModel.syncCharactersFromBattleNet` to only *insert* new characters and return *only* the IDs of those newly inserted characters.

1. **Modify `characterModel.syncCharactersFromBattleNet`:**
    * Continue fetching the list of existing characters for the user from the database (`existingCharsMap`).
    * Iterate through the characters received from the Battle.net profile (`battleNetCharacters`).
    * **Change:** For each character from Battle.net, check if it exists in `existingCharsMap`.
        * If it **exists**: **Do nothing**. Skip the update step entirely for this character during onboarding. Do *not* add its ID to the list of processed IDs.
        * If it **does not exist**: Proceed with the current logic to `INSERT` the new character record into the database. Add the newly generated database ID to the `processedIds` list.
    * **Change:** Adjust the return value. The `updated` count should always be `0`. The `added` count should reflect only the number of characters inserted. The `processedIds` array should contain *only* the IDs of the newly inserted characters.

2. **No Changes Needed Elsewhere (Initially):**
    * `OnboardingService.processNewUser` will automatically work as desired because it relies on the `processedIds` returned by `syncCharactersFromBattleNet`. Since this list will now only contain IDs of *new* characters, the subsequent enhanced data fetch loop will correctly target only those new characters.

3. **Consideration for Existing Character Updates:**
    * This change means existing characters are no longer updated during the login/onboarding flow. We need to ensure that updates for existing characters (e.g., level changes, guild changes detected outside onboarding) are handled by a separate mechanism, likely the background sync process managed by `BattleNetSyncService`.

## Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend API
    participant OnboardingService
    participant CharacterModel
    participant BattleNet API

    User->>Frontend: Logs In
    Frontend->>Backend API: /auth/battlenet/callback (or similar)
    Backend API->>OnboardingService: processNewUser(userId, accessToken, region)
    OnboardingService->>BattleNet API: getWowProfile(region, accessToken)
    BattleNet API-->>OnboardingService: wowProfile (with all characters)
    OnboardingService->>CharacterModel: syncCharactersFromBattleNet(userId, wowProfile.wow_accounts)

    %% --- Proposed Change in CharacterModel.syncCharactersFromBattleNet ---
    CharacterModel->>DB: Fetch existing characters for user (existingCharsMap)
    loop For each character in wowProfile.wow_accounts
        alt Character NOT in existingCharsMap (New Character)
            CharacterModel->>DB: INSERT Character
            CharacterModel->>CharacterModel: Add new ID to processedIds_new
        else Character IS in existingCharsMap (Existing Character)
            CharacterModel->>CharacterModel: Skip (No UPDATE, No ID added)
        end
    end
    CharacterModel-->>OnboardingService: { added: count(processedIds_new), updated: 0, total: wowProfile.chars.length, processedIds: processedIds_new }
    %% --- End Proposed Change ---

    OnboardingService->>CharacterModel: findByIds(processedIds) // Now only gets NEW characters
    CharacterModel-->>OnboardingService: dbCharacters (only new ones)
    loop For each new character in dbCharacters
        OnboardingService->>BattleNet API: getEnhancedCharacterData(...)
        BattleNet API-->>OnboardingService: enhancedData
        OnboardingService->>CharacterModel: update(character.id, enhancedPayload) // Update NEW char with full data
        CharacterModel-->>OnboardingService: Update result
    end
    OnboardingService->>Backend API: Onboarding complete
    Backend API-->>Frontend: Login Success / User Data
    Frontend-->>User: Application Loaded
