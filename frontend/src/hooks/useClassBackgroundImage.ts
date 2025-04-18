import { RefObject, useEffect, useState } from 'react'; // Import RefObject

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
 * Assumes images are located in `/src/assets/class-backgrounds/` and named in kebab-case (e.g., 'death-knight.webp').
 * Lazily loads the image only when the target element is intersecting the viewport.
 * @param className - The character's class name (e.g., "Death Knight").
 * @param elementRef - A React ref attached to the element that should trigger the load.
 * @returns The URL of the loaded background image, or null if not found or loading.
 */
export const useClassBackgroundImage = (
  className: string | undefined,
  elementRef: RefObject<HTMLElement> // Add elementRef parameter
): string | null => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const kebabCaseName = getClassNameKebabCase(className);

  useEffect(() => {
    let isMounted = true;
    let observer: IntersectionObserver | null = null;
    const element = elementRef.current; // Get the current element from the ref

    // Reset image URL when class name or element changes
    setImageUrl(null);

    // Only proceed if we have an element to observe and a valid class name
    if (element && kebabCaseName) {
      const expectedModuleKey = `/src/assets/class-backgrounds/${kebabCaseName}.webp`;

      // Check cache immediately in case it was loaded previously (e.g., scrolled past and back)
      if (imageCache[expectedModuleKey]) {
        setImageUrl(imageCache[expectedModuleKey]);
        return; // Already cached, no need for observer
      }

      // Define the callback for the Intersection Observer
      const handleIntersection = (entries: IntersectionObserverEntry[]) => {
        entries.forEach((entry) => {
          // If the element is intersecting and we haven't loaded the image yet
          if (entry.isIntersecting && !imageUrl && isMounted) {
            // Check cache again just before fetching
            if (imageCache[expectedModuleKey]) {
              setImageUrl(imageCache[expectedModuleKey]);
            } else if (imageModules[expectedModuleKey]) {
              // Dynamically import the module
              imageModules[expectedModuleKey]()
                .then((mod: any) => {
                  if (isMounted && mod.default) {
                    imageCache[expectedModuleKey] = mod.default; // Cache the image URL
                    setImageUrl(mod.default);
                  } else if (isMounted) {
                    console.warn(`Module loaded but default export missing for: ${expectedModuleKey}`);
                    setImageUrl(null);
                  }
                })
                .catch(error => {
                  console.error(`Failed to load background image module for class "${className}" at path ${expectedModuleKey}:`, error);
                  if (isMounted) setImageUrl(null);
                });
            } else {
              console.warn(`Background image module not found in glob for class "${className}". Expected key: ${expectedModuleKey}`);
              if (isMounted) setImageUrl(null);
            }

            // Once loaded (or failed), we don't need to observe anymore
            if (observer) {
              observer.unobserve(element);
            }
          }
        });
      };

      // Create and start the observer
      observer = new IntersectionObserver(handleIntersection, {
        rootMargin: '0px', // Optional: load slightly before it enters viewport
        threshold: 0.1 // Optional: trigger when 10% is visible
      });
      observer.observe(element);

    } else if (!kebabCaseName && isMounted) {
      // Handle case where class name is invalid/missing
       setImageUrl(null);
    }

    // Cleanup function
    return () => {
      isMounted = false;
      if (observer && element) {
        observer.unobserve(element); // Stop observing the element
      }
    };
    // Add elementRef to dependency array to re-run effect if the ref changes (though unlikely)
  }, [className, kebabCaseName, imageUrl, elementRef]);

  return imageUrl; // Return the loaded image URL or null
};