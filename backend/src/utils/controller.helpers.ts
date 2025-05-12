// Assuming AppError is importable, adjust path if necessary
import { AppError } from './error-handler.js'; 

// Define a generic entity type or use 'any' if types are too diverse
interface UserSpecificEntity {
  user_id?: number | null | undefined; // Updated to match DbCharacterEnhanced
  // Add other common fields if necessary for other checks
}

export function ensureExists<T>(entity: T | null | undefined, entityName = "Entity"): asserts entity is T {
  if (!entity) {
    throw new AppError(`${entityName} not found`, 404);
  }
}

export function ensureOwnership(entity: UserSpecificEntity, userId: number | string | undefined, entityName = "Entity") {
  if (!userId || entity.user_id !== userId) {
    throw new AppError(`Unauthorized access to ${entityName.toLowerCase()}`, 403);
  }
}