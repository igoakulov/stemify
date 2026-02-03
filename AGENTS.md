# Agent Guidelines for STEMify

This is a Next.js 16 + React 19 + TypeScript 5 application using Tailwind CSS 4 and shadcn/ui components.

## Build & Development Commands

```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm run start

# Lint check
npm run lint
```

**No test runner is currently configured.**

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **React**: 19.2.3
- **TypeScript**: 5.x (strict mode enabled)
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui (New York style)
- **Icons**: Lucide React
- **Package Manager**: pnpm
- **Node**: >= 20

## Code Style Guidelines

### Naming Conventions

- **Variables**: snake_case (e.g., `is_mounted`, `api_key_input`)
- **Functions**: snake_case (e.g., `load_prompt_override`)
- **Types/Interfaces**: PascalCase (e.g., `PromptId`, `RunOptions`)
- **Components**: PascalCase (e.g., `SettingsDialog`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `PROMPT_OVERRIDES_KEY`)
- **Files**: kebab-case (e.g., `system-prompt.ts`)

### Imports

- Use path alias `@/` for all imports (e.g., `@/lib/utils`, `@/components/ui/button`)
- Import types with `type` keyword: `import type { ChatMessage }`
- Group imports: React, external libs, internal, types
- No semicolons at end of import statements

### TypeScript

- Enable strict mode (already configured)
- Explicit return types on exported functions
- Use `FC` type for React components
- Prefer interfaces for object shapes
- Use union types for literals (e.g., `type Mode = "ask" | "build"`)

### Formatting

- No semicolons at end of statements
- Single quotes for strings (double quotes in JSX)
- 2-space indentation
- Max line length: 100 characters
- Trailing commas in multi-line objects/arrays

### Error Handling

- Throw descriptive Error objects
- Use try/catch for async operations
- Validate inputs early with guard clauses
- Use `window.dispatchEvent` for cross-component communication

### React Patterns

- Use `"use client"` directive for client components
- Prefer functional components with hooks
- Use `useMemo` and `useCallback` for expensive computations
- State variables: use `raf` pattern to avoid hydration issues:
  ```typescript
  useEffect(() => {
    const raf = window.requestAnimationFrame(() => setState(value))
    return () => window.cancelAnimationFrame(raf)
  }, [])
  ```

### Styling

- Use Tailwind CSS utility classes
- Use `cn()` utility from `@/lib/utils` for conditional classes
- Dark theme: use `white/10`, `white/50`, `zinc-900`, `zinc-950`
- shadcn/ui components: use `!` prefix to override default styles
- Compact components: minimal padding, no borders

#### Corner Radius Design Tokens

Defined in `src/app/globals.css`:
- `--radius-sm`: 4px (0.25rem) - small elements
- `--radius-md`: 6px (0.375rem) - inputs, small buttons
- `--radius-lg`: 8px (0.5rem) - **base unit**, buttons, inner elements
- `--radius-xl`: 12px (0.75rem) - cards, medium containers
- `--radius-2xl`: 16px (1rem) - **outer containers** with p-2 (8px) padding
- `--radius-3xl`: 24px (1.5rem) - large containers
- `--radius-4xl`: 32px (2rem) - hero sections

**Nesting Rule**: `outer_radius = inner_radius + padding`
- Example: Composer uses `rounded-2xl` (16px) with `p-2` (8px), buttons inside use `rounded-lg` (8px)
- Formula check: 16 = 8 + 8 ✓

### UI Component Guidelines

**Priority order for UI components:**

1. **Chat-related UI** → Use `@assistant-ui/react` and `@assistant-ui/react-markdown`
   - Message bubbles, threads, composers, code blocks
   - Override assistant-ui primitives via props (e.g., `components.CodeHeader`)
   - Only fall back to custom/Tailwind if assistant-ui doesn't provide the primitive

2. **Non-chat UI** → Use shadcn/ui components from `@/components/ui/`
   - Buttons, dialogs, inputs, selects, etc.
   - Import from the ui directory, not from external packages directly

3. **Custom/Tailwind** → Last resort for unique cases
   - Scene viewport, 3D canvas, custom visualizations
   - Follow existing patterns in the codebase

**Example:**
```typescript
// Good: Using assistant-ui for chat code blocks
import { MarkdownTextPrimitive, type CodeHeaderProps } from "@assistant-ui/react-markdown";

<MarkdownTextPrimitive
  components={{
    CodeHeader: MyCustomHeader,  // Override via props
  }}
/>

// Bad: Building custom code blocks when assistant-ui provides them
const MyCustomCodeBlock = () => { ... }  // Don't do this
```

### File Organization

```
src/
  app/           # Next.js app router pages
  components/    # React components
    ui/          # shadcn/ui components
    assistant-ui/  # Assistant-ui overrides and customizations
  lib/           # Utility functions and business logic
    chat/        # Chat-related logic
    prompts/     # Prompt management
    scene/       # 3D scene logic
    settings/    # Settings storage
  types/         # Global type definitions
```

### Local Storage Keys

Prefix with `stemify.` (e.g., `stemify.prompts.overrides.v1`)

### Comments

- Minimal comments - code should be self-documenting
- Use comments to explain "why", not "what"
- TODO comments are acceptable for known issues

## ESLint Configuration

Uses `eslint-config-next` with TypeScript support. Ignores:
- `.next/`, `out/`, `build/`
- `scenes/`, `specs/`, `docs/`

Run `npm run lint` before committing changes.
