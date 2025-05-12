/**
 * Type utility helpers
 */

/**
 * Utility type to make certain properties optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Utility type to make certain properties required
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * Utility type for creating a lookup object
 */
export type Lookup<T> = Record<string, T>;

/**
 * Utility type for nullable values
 */
export type Nullable<T> = T | null;

/**
 * Utility type for deep partial objects
 */
export type DeepPartial<T> = T extends object ? {
  [P in keyof T]?: DeepPartial<T[P]>;
} : T;