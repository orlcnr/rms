# RMS COMPONENT ARCHITECTURE RULES

All components must:

- Be reusable
- Be located under /components/erp/
- Use className composition
- Support variants (primary, secondary, danger etc.)
- Support disabled state
- Support focus-visible state

Spacing:
- Use Tailwind spacing scale (8px base)
- No arbitrary px values like p-[13px]

Tables:
- Must support dense mode (text-sm + reduced padding)
- Numeric columns must use text-right
- Must support overflow-x-auto
- Must handle 100+ rows performance-wise

Forms:
- Must include focus-visible:ring-primary-main
- Must include aria attributes
- Must include error state styling

Sidebar:
- Must support collapsed state
- Active item must use border-l-4 border-primary-main