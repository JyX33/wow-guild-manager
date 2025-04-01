# Guild Member List UI Enhancement: Card View Plan

## Goals

* Provide a clear, quick overview of guild members, primarily focusing on Main characters.
* Support administrative tasks for Guild Masters/Officers (e.g., rank management, distinguishing Mains/Alts).
* Improve UI/UX compared to the previous table view, especially regarding clarity and handling of Alts.

## Proposed Solution: Card View (Mains First, Alts in Modal)

1. **Core Concept:** Display each *Main* character as an individual card. Alts are initially hidden but accessible via an action on the Main's card, which opens a modal.

2. **Main Character Card Structure:**
    * **Layout:** Design a card layout for each Main character.
    * **Key Info:** Prominently display Name, Level, Item Level, Class/Spec (with color/icon), and Rank.
    * **Visuals:** Use class colors. Consider adding character portraits if available.
    * **Alt Indicator/Button:** Include a clear button or icon (e.g., "View Alts (2)") if the Main character has associated Alts. This button triggers the opening of the Alt modal.

3. **Displaying Alts (Modal):**
    * **Interaction:** Clicking the "View Alts" button on a Main's card.
    * **Mechanism:** Open a **modal dialog** window.
    * **Modal Content:** The modal should clearly state it's showing Alts for "[Main Character Name]". Inside the modal, display the Alts (e.g., simple list or mini-cards) with relevant details (Name, Level, Item Level, Class/Spec).

4. **Sorting & Filtering:**
    * **Controls:** Place sorting (e.g., dropdown for Name, Level, Item Level, Rank) and filtering controls (e.g., text search for Name, dropdowns for Class, Rank) above the grid of cards.
    * **Behavior:** These controls will rearrange or filter the *Main character cards* shown in the view.

5. **Administrative Actions (for GM/Officers):**
    * Include relevant action buttons directly on the Main character cards (e.g., "Manage Rank", "Set Status"). These buttons should only be visible/enabled for users with appropriate permissions.

6. **Responsiveness:**
    * Ensure the card grid reflows correctly on different screen sizes.
    * Ensure individual card content adapts well (e.g., text wrapping, element stacking).
    * Ensure the modal dialog is responsive.

7. **Loading/Error States:**
    * Implement skeleton loaders mimicking the card layout for a better loading perception.
    * Display clear error messages if data fetching fails.

## Plan Summary Diagram

```mermaid
graph TD
    A[Analyze Goals: Overview (Mains First) & Admin] --> B{Implement Card View};

    subgraph Card View Structure
        B --> C[Main Character Cards];
        B --> D[Alt Display Mechanism];
    end

    C --> C1[Card Layout & Key Info];
    C --> C2[Visuals (Class Color/Portrait)];
    C --> C3[Alt Indicator/Button];

    D --> D1[Click Alt Button];
    D --> D2[Open Modal Dialog];
    D --> D3[Show Alt Details in Modal];

    subgraph Functionality
        B --> E[Sorting & Filtering];
        B --> F[Admin Actions];
        B --> G[Responsiveness];
        B --> H[Loading/Error States];
    end

    E --> E1[Controls Above Cards];
    E --> E2[Sort/Filter Main Cards];

    F --> F1[Action Buttons on Cards];
    F --> F2[Permission-Based Visibility];

    G --> G1[Card Grid Reflow];
    G --> G2[Individual Card Adaptation];
    G --> G3[Responsive Modal];

    H --> H1[Skeleton Card Loaders];
    H --> H2[Clear Error Messages];

    B --> I{Implementation};
