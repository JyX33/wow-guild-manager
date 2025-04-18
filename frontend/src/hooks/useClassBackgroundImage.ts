import { useEffect, useState } from 'react';

// Utility function to convert class name to kebab-case
const getClassNameKebabCase = (className: string | undefined): string | null => {
  if (!className) return null;
  // Handles names like "Death Knight" -> "death-knight"
  return className.toLowerCase().replace(/\s+/g, '-');
};

// Cache to store loaded image URLs
const imageCache: Record<string, string> = {};

// Vite's way to handle dynamic imports from a directory
// Ensure the path matches your asset location exactly
// Change the glob pattern to look for .webp files
const imageModules = import.meta.glob('/src/assets/class-backgrounds/*.webp');

/**
 * Custom hook to dynamically load and cache background images based on WoW class names.
 * Assumes images are located in `/src/assets/class-backgrounds/` and named in kebab-case (e.g., 'death-knight.webp'). // Updated extension in comment
 * @param className - The character's class name (e.g., "Death Knight").
 * @returns The URL of the loaded background image, or null if not found or loading.
 */
export const useClassBackgroundImage = (className: string | undefined): string | null => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const kebabCaseName = getClassNameKebabCase(className);

  useEffect(() => {
    let isMounted = true; // Flag to prevent state updates on unmounted component
    setImageUrl(null); // Reset image URL when class name changes

    if (kebabCaseName) {
      // Construct the key to look for .webp files
      const expectedModuleKey = `/src/assets/class-backgrounds/${kebabCaseName}.webp`;

      // Check cache first
      if (imageCache[expectedModuleKey]) {
        if (isMounted) {
          setImageUrl(imageCache[expectedModuleKey]);
        }
        return; // Exit if image is cached
      }

      // Check if the module exists in Vite's glob import map
      if (imageModules[expectedModuleKey]) {
        // Dynamically import the module
        imageModules[expectedModuleKey]()
          .then((mod: any) => { // Using 'any' for simplicity, define type if needed
            if (isMounted && mod.default) {
              imageCache[expectedModuleKey] = mod.default; // Cache the image URL
              setImageUrl(mod.default);
            } else if (isMounted) {
               console.warn(`Module loaded but default export missing for: ${expectedModuleKey}`);
               setImageUrl(null); // Fallback if module structure is unexpected
            }
          })
          .catch(error => {
            // Log error if import fails (e.g., network issue, file corruption)
            console.error(`Failed to load background image module for class "${className}" at path ${expectedModuleKey}:`, error);
            if (isMounted) {
              setImageUrl(null); // Fallback on error
            }
          });
      } else {
        // Log warning if the specific image file doesn't seem to exist based on the glob map
        // This helps identify missing assets during development
        // Updated warning message
        console.warn(`Background image module not found in glob for class "${className}". Expected key: ${expectedModuleKey}`);
        if (isMounted) {
          setImageUrl(null); // Fallback if file is missing
        }
      }
    } else {
      // No class name provided, ensure imageUrl is null
      if (isMounted) {
        setImageUrl(null);
      }
    }

    // Cleanup function to set isMounted to false when the component unmounts
    return () => {
      isMounted = false;
    };
  }, [className, kebabCaseName]); // Re-run the effect if the class name changes

  return imageUrl; // Return the loaded image URL or null
};