// backend/src/types/battlenet-api-validator.ts
import * as RefTypes from './battlenet-api-reference.js';
import logger from '../utils/logger.js';
import { trackValidationResult } from '../utils/validation-monitor.js';

/**
 * Validation result for a specific field
 */
export interface FieldValidationResult {
  path: string;
  expected: string;
  received: string | typeof undefined;
  isValid: boolean;
  isCritical: boolean;
}

/**
 * Complete validation result for an object
 */
export interface ValidationResult {
  isValid: boolean;
  hasCriticalFields: boolean;
  failures: FieldValidationResult[];
}

/**
 * Critical fields that must be present for objects to be considered valid
 * even with incomplete validation
 */
const CRITICAL_FIELDS = {
  guild: ['id', 'name', 'faction.type', 'realm.id', 'realm.slug'],
  guildRoster: ['guild.id', 'guild.name', 'members'],
  character: ['id', 'name', 'faction.type', 'realm.id', 'realm.slug', 'character_class.id'],
  characterEquipment: ['character.id', 'character.name', 'equipped_items'],
  mythicKeystone: ['character.id', 'character.name'],
  professions: ['character.id', 'character.name'],
  collections: ['character.id', 'character.name'],
  genericData: [] // No critical fields for generic data
};

/**
 * Type guard to check if a value is an object
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Gets a nested property from an object using a path string (e.g. 'a.b.c')
 */
function getNestedProperty(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined;
  
  const parts = path.split('.');
  let current: any = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  
  return current;
}

/**
 * Gets the type of a value as a string
 */
function getValueType(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

/**
 * Creates a validation result
 */
function createResult(isValid: boolean, failures: FieldValidationResult[] = []): ValidationResult {
  const hasCriticalFields = failures.every(f => !f.isCritical);
  return { isValid, hasCriticalFields, failures };
}

/**
 * Validates basic data types
 */
function validateBasicType(value: unknown, path: string, expectedType: string, isCritical = false): FieldValidationResult | null {
  const actualType = getValueType(value);
  
  // Special case for strings that can be empty but exist
  if (expectedType === 'string' && actualType === 'string') {
    return null; // Valid
  }
  
  if (actualType !== expectedType) {
    return {
      path,
      expected: expectedType,
      received: actualType,
      isValid: false,
      isCritical
    };
  }
  
  return null; // Valid
}

/**
 * Validates if a value has a self link which is common to all Battle.net API responses
 */
function validateSelfLink(data: unknown, path: string): FieldValidationResult | null {
  if (!isObject(data)) {
    return {
      path: `${path}._links`,
      expected: 'object',
      received: getValueType(data),
      isValid: false,
      isCritical: true
    };
  }
  
  const links = data._links;
  if (!isObject(links)) {
    return {
      path: `${path}._links`,
      expected: 'object',
      received: getValueType(links),
      isValid: false,
      isCritical: true
    };
  }
  
  const self = (links as any).self;
  if (!isObject(self)) {
    return {
      path: `${path}._links.self`,
      expected: 'object',
      received: getValueType(self),
      isValid: false,
      isCritical: true
    };
  }
  
  const href = (self as any).href;
  if (typeof href !== 'string') {
    return {
      path: `${path}._links.self.href`,
      expected: 'string',
      received: getValueType(href),
      isValid: false,
      isCritical: true
    };
  }
  
  return null; // Valid
}

/**
 * Checks if at least the critical fields exist in the object
 */
function hasCriticalFieldsOnly(data: unknown, type: keyof typeof CRITICAL_FIELDS): boolean {
  if (!isObject(data)) return false;
  
  const criticalFields = CRITICAL_FIELDS[type];
  return criticalFields.every(field => {
    const value = getNestedProperty(data, field);
    return value !== undefined;
  });
}

/**
 * Validates a guild object against the reference type
 */
export function validateGuild(data: unknown): ValidationResult {
  if (!isObject(data)) {
    const result = createResult(false, [{
      path: '',
      expected: 'object',
      received: getValueType(data),
      isValid: false,
      isCritical: true
    }]);

    // Track validation result
    trackValidationResult('guild', result);

    return result;
  }

  const failures: FieldValidationResult[] = [];

  // Check self link
  const selfLinkFailure = validateSelfLink(data, '');
  if (selfLinkFailure) failures.push(selfLinkFailure);

  // Check required fields
  const requiredFields: Array<[string, string, boolean]> = [
    ['id', 'number', true],
    ['name', 'string', true],
    ['faction.type', 'string', true],
    ['faction.name', 'string', false], // LocalizedString is an object
    ['achievement_points', 'number', false],
    ['member_count', 'number', false],
    ['realm.id', 'number', true],
    ['realm.name', 'string', false], // LocalizedString is an object
    ['realm.slug', 'string', true],
    ['created_timestamp', 'number', false]
  ];

  for (const [field, expectedType, isCritical] of requiredFields) {
    const value = getNestedProperty(data, field);
    const failure = validateBasicType(value, field, expectedType, isCritical);
    if (failure) failures.push(failure);
  }

  // Check if we have at least the critical fields
  const hasCriticalFields = hasCriticalFieldsOnly(data, 'guild');
  const result = createResult(failures.length === 0, failures);

  // Track validation result
  trackValidationResult('guild', result);

  if (failures.length > 0 && hasCriticalFields) {
    logger.warn({
      validationType: 'guild',
      failureCount: failures.length,
      criticalFailures: failures.filter(f => f.isCritical).length,
      hasCriticalFields: true
    }, 'Partial validation succeeded: guild has critical fields but failed complete validation');
  }

  return result;
}

/**
 * Validates a guild roster object against the reference type
 */
export function validateGuildRoster(data: unknown): ValidationResult {
  if (!isObject(data)) {
    return createResult(false, [{
      path: '',
      expected: 'object',
      received: getValueType(data),
      isValid: false,
      isCritical: true
    }]);
  }
  
  const failures: FieldValidationResult[] = [];
  
  // Check self link
  const selfLinkFailure = validateSelfLink(data, '');
  if (selfLinkFailure) failures.push(selfLinkFailure);
  
  // Check guild object
  const guild = (data as any).guild;
  if (!isObject(guild)) {
    failures.push({
      path: 'guild',
      expected: 'object',
      received: getValueType(guild),
      isValid: false,
      isCritical: true
    });
  } else {
    // Check guild fields
    const guildFields: Array<[string, string, boolean]> = [
      ['id', 'number', true],
      ['name', 'string', true],
      ['faction.type', 'string', false],
      ['faction.name', 'string', false], // LocalizedString is an object
      ['realm.id', 'number', false],
      ['realm.slug', 'string', false],
      ['realm.name', 'string', false] // LocalizedString is an object
    ];
    
    for (const [field, expectedType, isCritical] of guildFields) {
      const value = getNestedProperty(guild, field);
      const failure = validateBasicType(value, `guild.${field}`, expectedType, isCritical);
      if (failure) failures.push(failure);
    }
  }
  
  // Check members array
  const members = (data as any).members;
  if (!Array.isArray(members)) {
    failures.push({
      path: 'members',
      expected: 'array',
      received: getValueType(members),
      isValid: false,
      isCritical: true
    });
  }
  
  // Check if we have at least the critical fields
  if (failures.length > 0 && hasCriticalFieldsOnly(data, 'guildRoster')) {
    logger.warn({
      validationType: 'guildRoster',
      failureCount: failures.length,
      criticalFailures: failures.filter(f => f.isCritical).length,
      hasCriticalFields: true
    }, 'Partial validation succeeded: guild roster has critical fields but failed complete validation');
    return createResult(false, failures);
  }
  
  return createResult(failures.length === 0, failures);
}

/**
 * Validates a character object against the reference type
 */
export function validateCharacter(data: unknown): ValidationResult {
  if (!isObject(data)) {
    return createResult(false, [{
      path: '',
      expected: 'object',
      received: getValueType(data),
      isValid: false,
      isCritical: true
    }]);
  }
  
  const failures: FieldValidationResult[] = [];
  
  // Check self link
  const selfLinkFailure = validateSelfLink(data, '');
  if (selfLinkFailure) failures.push(selfLinkFailure);
  
  // Check required fields
  const requiredFields: Array<[string, string, boolean]> = [
    ['id', 'number', true],
    ['name', 'string', true],
    ['gender.type', 'string', false],
    ['gender.name', 'string', false], // LocalizedString is an object
    ['faction.type', 'string', true],
    ['faction.name', 'string', false], // LocalizedString is an object
    ['race.id', 'number', false],
    ['race.name', 'string', false], // LocalizedString is an object
    ['character_class.id', 'number', true],
    ['character_class.name', 'string', false], // LocalizedString is an object
    ['active_spec.id', 'number', false],
    ['active_spec.name', 'string', false], // LocalizedString is an object
    ['realm.id', 'number', true],
    ['realm.name', 'string', false], // LocalizedString is an object
    ['realm.slug', 'string', true],
    ['level', 'number', false],
    ['achievement_points', 'number', false],
    ['last_login_timestamp', 'number', false],
    ['equipped_item_level', 'number', false]
  ];
  
  for (const [field, expectedType, isCritical] of requiredFields) {
    const value = getNestedProperty(data, field);
    const failure = validateBasicType(value, field, expectedType, isCritical);
    if (failure) failures.push(failure);
  }
  
  // Check if we have at least the critical fields
  if (failures.length > 0 && hasCriticalFieldsOnly(data, 'character')) {
    logger.warn({
      validationType: 'character',
      failureCount: failures.length,
      criticalFailures: failures.filter(f => f.isCritical).length,
      hasCriticalFields: true
    }, 'Partial validation succeeded: character has critical fields but failed complete validation');
    return createResult(false, failures);
  }
  
  return createResult(failures.length === 0, failures);
}

/**
 * Validates a character equipment object against the reference type
 */
export function validateCharacterEquipment(data: unknown): ValidationResult {
  if (!isObject(data)) {
    return createResult(false, [{
      path: '',
      expected: 'object',
      received: getValueType(data),
      isValid: false,
      isCritical: true
    }]);
  }
  
  const failures: FieldValidationResult[] = [];
  
  // Check self link
  const selfLinkFailure = validateSelfLink(data, '');
  if (selfLinkFailure) failures.push(selfLinkFailure);
  
  // Check character reference
  const character = (data as any).character;
  if (!isObject(character)) {
    failures.push({
      path: 'character',
      expected: 'object',
      received: getValueType(character),
      isValid: false,
      isCritical: true
    });
  } else {
    // Check character fields
    const characterFields: Array<[string, string, boolean]> = [
      ['id', 'number', true],
      ['name', 'string', true],
      ['realm.id', 'number', false],
      ['realm.slug', 'string', false],
      ['realm.name', 'string', false] // LocalizedString is an object
    ];
    
    for (const [field, expectedType, isCritical] of characterFields) {
      const value = getNestedProperty(character, field);
      const failure = validateBasicType(value, `character.${field}`, expectedType, isCritical);
      if (failure) failures.push(failure);
    }
  }
  
  // Check equipped_items array
  const equippedItems = (data as any).equipped_items;
  if (!Array.isArray(equippedItems)) {
    failures.push({
      path: 'equipped_items',
      expected: 'array',
      received: getValueType(equippedItems),
      isValid: false,
      isCritical: true
    });
  }
  
  // Check if we have at least the critical fields
  if (failures.length > 0 && hasCriticalFieldsOnly(data, 'characterEquipment')) {
    logger.warn({
      validationType: 'characterEquipment',
      failureCount: failures.length,
      criticalFailures: failures.filter(f => f.isCritical).length,
      hasCriticalFields: true
    }, 'Partial validation succeeded: character equipment has critical fields but failed complete validation');
    return createResult(false, failures);
  }
  
  return createResult(failures.length === 0, failures);
}

/**
 * Validates a mythic keystone profile object against the reference type
 */
export function validateMythicKeystoneProfile(data: unknown): ValidationResult {
  if (!isObject(data)) {
    return createResult(false, [{
      path: '',
      expected: 'object',
      received: getValueType(data),
      isValid: false,
      isCritical: true
    }]);
  }
  
  const failures: FieldValidationResult[] = [];
  
  // Check self link
  const selfLinkFailure = validateSelfLink(data, '');
  if (selfLinkFailure) failures.push(selfLinkFailure);
  
  // Check character reference
  const character = (data as any).character;
  if (!isObject(character)) {
    failures.push({
      path: 'character',
      expected: 'object',
      received: getValueType(character),
      isValid: false,
      isCritical: true
    });
  } else {
    // Check character fields
    const characterFields: Array<[string, string, boolean]> = [
      ['id', 'number', true],
      ['name', 'string', true],
      ['realm.id', 'number', false],
      ['realm.slug', 'string', false],
      ['realm.name', 'string', false] // LocalizedString is an object
    ];
    
    for (const [field, expectedType, isCritical] of characterFields) {
      const value = getNestedProperty(character, field);
      const failure = validateBasicType(value, `character.${field}`, expectedType, isCritical);
      if (failure) failures.push(failure);
    }
  }
  
  // Check current_period
  const currentPeriod = (data as any).current_period;
  if (!isObject(currentPeriod)) {
    failures.push({
      path: 'current_period',
      expected: 'object',
      received: getValueType(currentPeriod),
      isValid: false,
      isCritical: false
    });
  } else {
    // Check period
    const period = currentPeriod.period;
    if (!isObject(period)) {
      failures.push({
        path: 'current_period.period',
        expected: 'object',
        received: getValueType(period),
        isValid: false,
        isCritical: false
      });
    }
    
    // Check best_runs
    const bestRuns = currentPeriod.best_runs;
    if (!Array.isArray(bestRuns)) {
      failures.push({
        path: 'current_period.best_runs',
        expected: 'array',
        received: getValueType(bestRuns),
        isValid: false,
        isCritical: false
      });
    }
  }
  
  // Check if we have at least the critical fields
  if (failures.length > 0 && hasCriticalFieldsOnly(data, 'mythicKeystone')) {
    logger.warn({
      validationType: 'mythicKeystone',
      failureCount: failures.length,
      criticalFailures: failures.filter(f => f.isCritical).length,
      hasCriticalFields: true
    }, 'Partial validation succeeded: mythic keystone profile has critical fields but failed complete validation');
    return createResult(false, failures);
  }
  
  return createResult(failures.length === 0, failures);
}

/**
 * Validates a professions object against the reference type
 */
export function validateProfessions(data: unknown): ValidationResult {
  if (!isObject(data)) {
    return createResult(false, [{
      path: '',
      expected: 'object',
      received: getValueType(data),
      isValid: false,
      isCritical: true
    }]);
  }
  
  const failures: FieldValidationResult[] = [];
  
  // Check self link
  const selfLinkFailure = validateSelfLink(data, '');
  if (selfLinkFailure) failures.push(selfLinkFailure);
  
  // Check character reference
  const character = (data as any).character;
  if (!isObject(character)) {
    failures.push({
      path: 'character',
      expected: 'object',
      received: getValueType(character),
      isValid: false,
      isCritical: true
    });
  } else {
    // Check character fields
    const characterFields: Array<[string, string, boolean]> = [
      ['id', 'number', true],
      ['name', 'string', true],
      ['realm.id', 'number', false],
      ['realm.slug', 'string', false],
      ['realm.name', 'string', false] // LocalizedString is an object
    ];
    
    for (const [field, expectedType, isCritical] of characterFields) {
      const value = getNestedProperty(character, field);
      const failure = validateBasicType(value, `character.${field}`, expectedType, isCritical);
      if (failure) failures.push(failure);
    }
  }
  
  // Check primaries array
  const primaries = (data as any).primaries;
  if (!Array.isArray(primaries)) {
    failures.push({
      path: 'primaries',
      expected: 'array',
      received: getValueType(primaries),
      isValid: false,
      isCritical: false
    });
  }
  
  // Check secondaries array
  const secondaries = (data as any).secondaries;
  if (!Array.isArray(secondaries)) {
    failures.push({
      path: 'secondaries',
      expected: 'array',
      received: getValueType(secondaries),
      isValid: false,
      isCritical: false
    });
  }
  
  // Check if we have at least the critical fields
  if (failures.length > 0 && hasCriticalFieldsOnly(data, 'professions')) {
    logger.warn({
      validationType: 'professions',
      failureCount: failures.length,
      criticalFailures: failures.filter(f => f.isCritical).length,
      hasCriticalFields: true
    }, 'Partial validation succeeded: professions has critical fields but failed complete validation');
    return createResult(false, failures);
  }
  
  return createResult(failures.length === 0, failures);
}

/**
 * Validates a collections index object against the reference type
 */
export function validateCollectionsIndex(data: unknown): ValidationResult {
  if (!isObject(data)) {
    return createResult(false, [{
      path: '',
      expected: 'object',
      received: getValueType(data),
      isValid: false,
      isCritical: true
    }]);
  }
  
  const failures: FieldValidationResult[] = [];
  
  // Check self link
  const selfLinkFailure = validateSelfLink(data, '');
  if (selfLinkFailure) failures.push(selfLinkFailure);
  
  // Check character reference
  const character = (data as any).character;
  if (!isObject(character)) {
    failures.push({
      path: 'character',
      expected: 'object',
      received: getValueType(character),
      isValid: false,
      isCritical: true
    });
  } else {
    // Check character fields
    const characterFields: Array<[string, string, boolean]> = [
      ['id', 'number', true],
      ['name', 'string', true],
      ['realm.id', 'number', false],
      ['realm.slug', 'string', false],
      ['realm.name', 'string', false] // LocalizedString is an object
    ];
    
    for (const [field, expectedType, isCritical] of characterFields) {
      const value = getNestedProperty(character, field);
      const failure = validateBasicType(value, `character.${field}`, expectedType, isCritical);
      if (failure) failures.push(failure);
    }
  }
  
  // Check required link fields
  const linkFields = ['pets', 'mounts', 'toys', 'heirlooms', 'transmogs'];
  for (const field of linkFields) {
    const link = (data as any)[field];
    if (!isObject(link) || typeof link.href !== 'string') {
      failures.push({
        path: field,
        expected: 'object with href string',
        received: getValueType(link),
        isValid: false,
        isCritical: false
      });
    }
  }
  
  // Check if we have at least the critical fields
  if (failures.length > 0 && hasCriticalFieldsOnly(data, 'collections')) {
    logger.warn({
      validationType: 'collections',
      failureCount: failures.length,
      criticalFailures: failures.filter(f => f.isCritical).length,
      hasCriticalFields: true
    }, 'Partial validation succeeded: collections index has critical fields but failed complete validation');
    return createResult(false, failures);
  }
  
  return createResult(failures.length === 0, failures);
}

/**
 * Maps type names to validator functions
 */
/**
 * Generic validator that accepts any data
 * Used for endpoints without a specific schema
 */
function validateGenericData(data: unknown): ValidationResult {
  // For generic data, we accept anything that's not null or undefined
  const isValid = data !== null && data !== undefined;

  return {
    isValid,
    hasCriticalFields: isValid, // If it exists, it has critical fields
    failures: isValid ? [] : [{
      path: 'data',
      expected: 'any non-null value',
      received: data === null ? 'null' : 'undefined',
      isValid: false,
      isCritical: true
    }]
  };
}

export const validators = {
  guild: validateGuild,
  guildRoster: validateGuildRoster,
  character: validateCharacter,
  characterEquipment: validateCharacterEquipment,
  mythicKeystone: validateMythicKeystoneProfile,
  professions: validateProfessions,
  collections: validateCollectionsIndex,
  genericData: validateGenericData
};

/**
 * Type guard for Battle.net Guild
 */
export function isBattleNetGuild(data: unknown): data is RefTypes.BattleNetGuildRef {
  const result = validateGuild(data);
  return result.isValid || result.hasCriticalFields;
}

/**
 * Type guard for Battle.net Guild Roster
 */
export function isBattleNetGuildRoster(data: unknown): data is RefTypes.BattleNetGuildRosterRef {
  const result = validateGuildRoster(data);
  return result.isValid || result.hasCriticalFields;
}

/**
 * Type guard for Battle.net Character
 */
export function isBattleNetCharacter(data: unknown): data is RefTypes.BattleNetCharacterRef {
  const result = validateCharacter(data);
  return result.isValid || result.hasCriticalFields;
}

/**
 * Type guard for Battle.net Character Equipment
 */
export function isBattleNetCharacterEquipment(data: unknown): data is RefTypes.BattleNetCharacterEquipmentRef {
  const result = validateCharacterEquipment(data);
  return result.isValid || result.hasCriticalFields;
}

/**
 * Type guard for Battle.net Mythic Keystone Profile
 */
export function isBattleNetMythicKeystoneProfile(data: unknown): data is RefTypes.BattleNetMythicKeystoneProfileRef {
  const result = validateMythicKeystoneProfile(data);
  return result.isValid || result.hasCriticalFields;
}

/**
 * Type guard for Battle.net Professions
 */
export function isBattleNetProfessions(data: unknown): data is RefTypes.BattleNetProfessionsRef {
  const result = validateProfessions(data);
  return result.isValid || result.hasCriticalFields;
}

/**
 * Type guard for Battle.net Collections Index
 */
export function isBattleNetCollectionsIndex(data: unknown): data is RefTypes.BattleNetCollectionsIndexRef {
  const result = validateCollectionsIndex(data);
  return result.isValid || result.hasCriticalFields;
}

/**
 * Type guard for generic Battle.net data
 * Accepts any non-null data
 */
export function isBattleNetGenericData<T = any>(data: unknown): data is T {
  const result = validateGenericData(data);
  return result.isValid || result.hasCriticalFields;
}