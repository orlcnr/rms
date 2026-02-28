# RMS TAILWIND TOKEN CONTRACT

All colors must be defined in tailwind.config.js.
No default Tailwind colors may be used directly.

Use semantic naming only.

Example required structure:

theme: {
  extend: {
    colors: {
      bg: {
        app: "#f6f7f9",
        surface: "#ffffff",
        muted: "#f1f2f4"
      },
      border: {
        light: "#e9e9e9",
        medium: "#dcdcdc"
      },
      text: {
        primary: "#2b2b2b",
        secondary: "#555555",
        muted: "#777777",
        inverse: "#ffffff"
      },
      primary: {
        main: "#F97316",
        hover: "#EA580C",
        subtle: "#FFF7ED"
      },
      success: { ... },
      warning: { ... },
      danger: { ... },
      info: { ... }
    }
  }
}

Usage rules:
- Use bg-bg-app, text-text-primary, border-border-light etc.
- Never use bg-gray-100, text-black, border-gray-300 etc.
- Never hard-code hex in components.