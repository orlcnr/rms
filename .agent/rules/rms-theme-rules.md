# RMS THEME IMPLEMENTATION (NEXT + TAILWIND)

Light theme is default.

Dark theme must:
- Use class-based theme (class="dark")
- Override tokens only in tailwind.config.js
- Not override component structure

Do not write conditional color classes inside components.
Theme switching must not change layout.