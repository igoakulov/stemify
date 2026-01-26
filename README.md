# STEMify

STEMify is a local-first web app that turns natural-language STEM prompts into interactive, editable 3D visualizations.

- Frontend: Next.js (App Router) + React + TypeScript
- Styling: Tailwind CSS (v4) + shadcn/ui

## Development

Install deps:

```bash
pnpm install
```

Run dev server:

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Scripts

- `pnpm dev`
- `pnpm lint`
- `pnpm build`
- `pnpm start`

## Specs

Product and architecture specs live outside the app repo root by default.

If you keep `specs/` and `scenes/` in this repo, they are ignored by git via `.gitignore`.
