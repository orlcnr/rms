# RMS Enterprise UI Rules

These rules are mandatory.
Do not override them.
Do not interpret them creatively.
Follow strictly.

--------------------------------------------------
1. GLOBAL SYSTEM RULES
--------------------------------------------------

- This is an enterprise Restaurant ERP system.
- Do NOT create startup-style UI.
- Do NOT use gradients.
- Do NOT use neon colors.
- Do NOT use decorative animations.
- UI must prioritize clarity over aesthetics.
- All colors must come from defined design tokens.
- No hard-coded hex values allowed in components.

--------------------------------------------------
2. DESIGN TOKEN CONTRACT
--------------------------------------------------

All styling must use the following tokens.

BACKGROUND TOKENS:
--bg-app: #f6f7f9
--bg-surface: #ffffff
--bg-muted: #f1f2f4
--bg-hover: subtle neutral tint

BORDER TOKENS:
--border-light: #e9e9e9
--border-medium: #dcdcdc

TEXT TOKENS:
--text-primary: #2b2b2b
--text-secondary: #555555
--text-muted: #777777
--text-inverse: #ffffff

PRIMARY BRAND:
--primary-main: flat orange
--primary-hover: darker orange
--primary-subtle: soft orange tint

SEMANTIC TOKENS:
Each semantic color must include:
- main
- bg-subtle
- border
- text

Defined semantics:
--success
--warning
--danger
--info

--------------------------------------------------
3. TYPOGRAPHY RULES
--------------------------------------------------

- Use modern neutral sans-serif.
- No decorative fonts.
- Financial values must be bold.
- Numeric columns must be right-aligned.
- Tables must support tabular numeric alignment.

--------------------------------------------------
4. LAYOUT RULES
--------------------------------------------------

- Use 8px spacing grid only.
- No arbitrary spacing.
- All padding must use spacing tokens.
- All cards must use consistent internal padding.

--------------------------------------------------
5. COMPONENT CONTRACTS
--------------------------------------------------

BUTTONS:
- Primary: solid primary-main
- Secondary: border only
- Ghost: no background
- Danger: semantic danger
- Must include hover + focus + disabled states

INPUTS:
- Must include focus outline
- Must include error state
- Must not rely only on color for error

TABLES:
- Must support 100+ rows
- Must support dense mode
- Must have clear header separation
- Must include hover state
- Must include sorting indicator
- Must right-align numeric data

SIDEBAR:
- Must support collapse
- Active item must show primary indicator
- Icons must be consistent stroke width

MODALS:
- Must include overlay
- Must trap focus
- Must have clear primary action

--------------------------------------------------
6. INTERACTION RULES
--------------------------------------------------

- Hover must be subtle.
- Focus must be visible and accessible.
- Transitions must be fast and minimal.
- No decorative motion.

--------------------------------------------------
7. THEME RULES
--------------------------------------------------

- Light theme is default.
- Dark theme must use same token naming.
- Only token values change between themes.
- No component-level theme overrides.

--------------------------------------------------
8. PRODUCT IDENTITY
--------------------------------------------------

UI must look capable of:
- Managing 50+ branches
- Handling high transaction volume
- Supporting audit processes
- Being used 10+ hours daily

Minimize eye fatigue.
Maximize clarity.