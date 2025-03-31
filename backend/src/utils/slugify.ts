// backend/src/utils/slugify.ts

/**
 * Converts a string into a URL-friendly slug.
 * - Converts to lowercase.
 * - Replaces spaces with hyphens.
 * - Removes characters that are not alphanumeric or hyphens.
 * - Trims leading/trailing hyphens.
 *
 * @param input The string to slugify.
 * @returns The generated slug.
 */
export function createSlug(input: string): string {
  if (!input) {
    return '';
  }

  return input
    .toLowerCase() // Convert to lowercase
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/[^\w-]+/g, '') // Remove all non-word chars except hyphens
    .replace(/--+/g, '-') // Replace multiple hyphens with a single hyphen
    .replace(/^-+/, '') // Trim hyphens from start
    .replace(/-+$/, ''); // Trim hyphens from end
}