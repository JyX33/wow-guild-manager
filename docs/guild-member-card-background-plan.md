# Plan: Add Class Background Images to GuildMemberCard

**Objective:** Dynamically set a background image on the `GuildMemberCard` component based on the member's class, using assets located in `frontend/src/assets/class-backgrounds/` named with kebab-case (e.g., `death-knight.png`). Ensure text remains readable.

**Steps:**

1.  **Create Asset Directory:**
    *   Ensure the directory `frontend/src/assets/class-backgrounds/` exists.
    *   Place class images in this directory, named like `warrior.png`, `death-knight.png`, etc.

2.  **Utility Function (`getClassNameKebabCase`):**
    *   Location: `GuildMemberCard.tsx` or a shared utility file (e.g., `frontend/src/utils/stringUtils.ts`).
    *   Purpose: Convert class names like "Death Knight" to "death-knight".
    *   Implementation:
        ```typescript
        const getClassNameKebabCase = (className: string | undefined): string | null => {
          if (!className) return null;
          return className.toLowerCase().replace(/\s+/g, '-');
        };
        ```

3.  **Custom Hook (`useClassBackgroundImage`):**
    *   Location: Create `frontend/src/hooks/useClassBackgroundImage.ts` or define within `GuildMemberCard.tsx`.
    *   Purpose: Handle dynamic loading, caching, and error handling for class background images.
    *   Implementation:
        ```typescript
        import { useState, useEffect } from 'react';

        // Assuming getClassNameKebabCase is defined here or imported
        const getClassNameKebabCase = (className: string | undefined): string | null => {
          if (!className) return null;
          return className.toLowerCase().replace(/\s+/g, '-');
        };

        const imageCache: Record<string, string> = {}; 

        export const useClassBackgroundImage = (className: string | undefined): string | null => {
          const [imageUrl, setImageUrl] = useState<string | null>(null);
          const kebabCaseName = getClassNameKebabCase(className);

          useEffect(() => {
            let isMounted = true;
            setImageUrl(null); 

            if (kebabCaseName) {
              const imagePath = `/src/assets/class-backgrounds/${kebabCaseName}.png`;

              if (imageCache[imagePath]) {
                 if (isMounted) setImageUrl(imageCache[imagePath]);
              } else {
                const modules = import.meta.glob('/src/assets/class-backgrounds/*.png');
                const moduleKey = `/src/assets/class-backgrounds/${kebabCaseName}.png`;

                if (modules[moduleKey]) {
                  modules[moduleKey]()
                    .then((mod: any) => { 
                      if (isMounted) {
                        imageCache[imagePath] = mod.default; 
                        setImageUrl(mod.default);
                      }
                    })
                    .catch(error => {
                      console.warn(`Background image not found or failed to load for class "${className}" at path ${imagePath}:`, error);
                      if (isMounted) setImageUrl(null); 
                    });
                } else {
                   console.warn(`Background image module not found for class "${className}" at path ${imagePath}`);
                   if (isMounted) setImageUrl(null); 
                }
              }
            } else {
               if (isMounted) setImageUrl(null); 
            }
            
            return () => { isMounted = false; };

          }, [className, kebabCaseName]); 

          return imageUrl;
        };
        ```

4.  **Integrate Hook in `GuildMemberCard`:**
    *   Import `useClassBackgroundImage` into `frontend/src/components/GuildMemberCard.tsx`.
    *   Call the hook:
        ```typescript
        const characterClassName = member.character?.profile_json?.character_class?.name || member.character?.class;
        const backgroundImageUrl = useClassBackgroundImage(characterClassName);
        ```

5.  **Apply Style and Overlay:**
    *   Target the main `div` in `GuildMemberCard.tsx` (currently line 64).
    *   Modify its classes and add inline styles:
        ```jsx
         <div 
           className="border rounded shadow flex flex-col h-full relative overflow-hidden bg-gray-800" // Base background
           style={{
             backgroundImage: backgroundImageUrl ? `url(${backgroundImageUrl})` : 'none',
             backgroundSize: 'cover',
             backgroundPosition: 'center center',
           }}
         >
           {/* Overlay */}
           <div className="absolute inset-0 bg-black bg-opacity-60 z-0"></div> 
           
           {/* Content Wrapper */}
           <div className="relative z-10 flex flex-col h-full p-4 text-white"> 
              {/* ... (rest of the card content) ... */}
           </div>
         </div>
        ```
    *   Adjust text colors within the content wrapper (header, stats, footer) to ensure readability (e.g., `text-white`, `text-gray-300`, `text-blue-400`).
    *   Remove the old `getClassColor` function and its usage.

**Mermaid Diagram:**

```mermaid
graph TD
    A[GuildMemberCard Receives Member Data] --> B{Get Member Class};
    B --> C[useClassBackgroundImage Hook Called];
    subgraph useClassBackgroundImage Hook
        D[useEffect triggered] --> E{Is Class Name Valid?};
        E -- Yes --> F[getClassNameKebabCase];
        F --> G[Construct Image Path];
        G --> H{Check Cache};
        H -- Found --> I[Set imageUrl from Cache];
        H -- Not Found --> J{Use import.meta.glob};
        J -- Module Found --> K{Import Module};
        K -- Success --> L[Cache & Set imageUrl];
        K -- Failure --> M[Log Error & Set imageUrl (null)];
        J -- Module Not Found --> M;
        E -- No --> M;
        I --> N[Return imageUrl];
        L --> N;
        M --> N;
    end
    C --> O{Get backgroundImageUrl from Hook};
    O --> P{Apply Style to Main Div};
    P --> Q[Set backgroundImage: url(...) or none];
    Q --> R[Set backgroundSize, backgroundPosition];
    R --> S[Add Overlay Div];
    S --> T[Wrap Content in Relative Div];
    T --> U[Adjust Text/Element Colors for Contrast];
    U --> V[Render Card];
```

**Next Step:** Switch to Code mode for implementation.