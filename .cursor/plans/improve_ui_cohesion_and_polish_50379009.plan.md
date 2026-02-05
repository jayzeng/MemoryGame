---
name: Improve UI Cohesion and Polish
overview: Refine the Squishmallow Memory Parade UI to be more cohesive, playful, and aligned with the design specs. Focus on the Home screen, button feedback, and overall visual polish.
todos:
  - id: refine-button-component-with-spec-aligned-styles-and-press-animation
    content: Refine Button component with spec-aligned styles and press animation.
    status: completed
  - id: update-home-screen-layout-with-a-unified-player-profile-card-and-decluttered-ui
    content: Update Home screen layout with a unified Player Profile card and decluttered UI.
    status: completed
  - id: implement-a-parent-gate-settings-modal-for-sparkle-mode-and-other-configs
    content: Implement a "Parent Gate" settings modal for Sparkle Mode and other configs.
    status: completed
  - id: style-the-collection-progress-bar-to-be-more-squishy-and-themed
    content: Style the collection progress bar to be more "squishy" and themed.
    status: completed
  - id: apply-consistent-figma-spec-shadows-and-glows-across-all-components
    content: Apply consistent Figma-spec shadows and glows across all components.
    status: completed
  - id: polish-world-select-and-game-screens-for-better-visual-consistency
    content: Polish World Select and Game screens for better visual consistency.
    status: completed
isProject: false
---

1. **Refine Home Screen Layout:**
  - Combine name entry and profile photo into a unified "Player Profile" card that looks like a polaroid or sticker.
  - Move Sparkle Mode and other settings into a "Parent Gate" modal to declutter the main view.
  - Style the collection progress bar to be more "squishy" and themed.
  - Improve the "Safe & Cozy Play" footer to look like a premium badge.
2. **Enhance Button Interactions:**
  - Update `[components/Button.tsx](components/Button.tsx)` to include a scale-down animation on press (`active:scale-95`).
  - Ensure all buttons use the correct Figma-spec colors and border-bottom styling.
3. **Visual Polish & Design System Alignment:**
  - Apply consistent shadow and glow effects as defined in the Figma specs.
  - Update typography usage to be consistent across all components using `font-heading` and `font-body`.
  - Add a subtle "Squishmallow" texture or pattern to more components.
4. **Improve World Select & Game UI:**
  - Refine the World Card layout in `[components/WorldSelect.tsx](components/WorldSelect.tsx)` to be more "premium" (better spacing, card shadows).
  - Enhance the "Match Celebration" in `[components/Game.tsx](components/Game.tsx)` with a more prominent success glow.
5. **Multiplayer & Parent Mode Integration:**
  - Ensure the "Parent Gate" is functional for accessing settings.
  - Improve the leaderboard visual style to match the rest of the game.

