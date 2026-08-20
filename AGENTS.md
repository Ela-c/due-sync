# AGENTS.md

## Purpose

This guide defines how coding agents should contribute to the UI of DueSync.
Follow these rules to keep styling coherent, minimal, and consistent with the current extension popup.

## Scope

Applies to UI work in:

- src/App.tsx
- src/index.css
- src/components/ui/\*

Avoid changing data flow or extension behavior unless the task explicitly asks for it.

## Product Context

DueSync is a compact Chrome extension popup, not a full dashboard.
Design intent:

- lightweight and functional
- minimal visual noise
- clear hierarchy through spacing, type, and subtle borders

## Current Brand System

Source of truth: src/index.css

Use these semantic tokens (preferred) instead of hardcoded colors in components:

- bg-background, text-foreground
- bg-card, text-card-foreground
- border-border
- bg-primary, text-primary-foreground
- bg-secondary, text-secondary-foreground
- text-muted-foreground
- text-accent
- text-destructive

Mapped brand values currently in :root:

- primary: #0472F0
- primary hover/ring: #015ADA
- accent teal: #24E0DE
- primary text: #10233F
- secondary text: #5D718A
- background: #F7FAFC
- card surface: #FFFFFF
- border/input: #DCE7F3
- font: Inter Variable/Inter
- base radius token: 0.625rem (10px)

## UI Principles

1. Keep it compact

- Popup width is constrained (see #root in src/index.css).
- Prefer tight but readable spacing.

2. Prioritize clarity over decoration

- Use whitespace and border contrast.
- Avoid decorative gradients, large shadows, or flashy effects.

3. Use accent color sparingly

- Teal is for syncing/success emphasis only.
- Primary blue remains the default call-to-action color.

4. Keep rounded corners subtle

- Stay in the 8px to 12px range unless an existing component already defines a compatible size.

## Component Conventions

### Buttons

Use src/components/ui/button.tsx variants via the Button component.

- Primary actions: variant default
- Secondary navigation: variant outline
- Utility actions (Select all, Clear all): variant ghost

Do not introduce one-off button styles unless needed for a new reusable variant.

### Cards

Use src/components/ui/card.tsx primitives.

- Card surfaces should stay flat (minimal/no shadow).
- Borders should use border-border.
- Footer areas can use subtle secondary tint, consistent with existing CardFooter styling.

### Lists and selectable rows

- Use bordered rows with subtle hover feedback.
- Keep hover effects low-contrast (for example, primary tint at low opacity).
- Preserve comfortable click targets.

### Inputs and checkboxes

- Keep checkbox accent aligned with primary color when appropriate.
- Maintain readable label text contrast.

### Loading states

Use Skeleton from src/components/ui/skeleton.tsx and match existing heights/spacing patterns.

## Typography Rules

- Default to Inter through existing tokens.
- Keep title scale modest for popup context.
- Use muted text for secondary metadata only.
- Avoid introducing custom font families.

## Layout and Density Rules

- Maintain current section-based structure in src/App.tsx.
- Respect existing max-height and internal scroll regions.
- Avoid adding new permanent panels, dense toolbars, or dashboard-like blocks.

## Accessibility and Interaction

- Preserve visible focus styles from shared Button styles.
- Do not remove keyboard-accessible controls.
- Keep text contrast high enough against background and card surfaces.
- Ensure hover-only cues are not the only cue for state.

## Styling Workflow for Agents

When asked to adjust UI styling:

1. Inspect src/index.css first and prefer token updates.
2. Reuse semantic classes (text-foreground, bg-card, border-border, etc.).
3. Update shared primitives in src/components/ui/\* only when the change should be global.
4. Keep App-level class edits local and minimal.
5. Build to validate no regressions.

## Consistency Checklist Before Finishing

- Uses semantic color tokens rather than ad-hoc hex values in JSX.
- Keeps radius, border, and spacing aligned with existing patterns.
- No new heavy shadow treatment.
- Primary blue used for main actions; teal used sparingly.
- Popup remains compact and non-dashboard in appearance.
- Existing functionality and layout flow unchanged unless requested.

## Validation

Run:

- pnpm run build

If visual changes are broad, also spot-check popup states:

- units loading and list
- pagination controls
- task loading and checklist
- error message appearance
- disabled and focus states for actions
