# AGENTS.md - ains.art

Astro 6 + React 19 + Tailwind CSS 4 + shadcn/ui. Event map and timeline visualization app.

## Commands

```bash
bun run dev        # Dev server on http://localhost:4321
bun run build      # Production build
bun run preview    # Preview production build
bunx astro check   # TypeScript type check
bunx prettier --write .      # Format all files
bunx prettier --write <file> # Format single file
```

No test runner, ESLint, or lint scripts. No tests to run.

## Tech Stack

- **Framework**: Astro 6 with React islands (`client:only="react"`)
- **Styling**: Tailwind CSS 4 (`@theme`, `@import "tailwindcss"`)
- **UI**: shadcn/ui (radix-ui + class-variance-authority)
- **Gestures**: @use-gesture/react (in deps; Karte.tsx uses custom pointer events instead)
- **Maps**: MapLibre GL JS with OpenFreeMap vector tiles (imperative API via refs)
- **Time**: @js-temporal/polyfill for date/time handling
- **Format**: Prettier with prettier-plugin-astro and prettier-plugin-tailwindcss

## Code Style

### Formatting

- No semicolons at end of statements
- Double quotes for strings
- 2 spaces indentation
- Trailing commas in objects/arrays
- Run `bunx prettier --write .` before committing

### Imports

```typescript
// React hooks first
import { useState, useRef, useCallback } from "react";

// Third-party libraries
import { Temporal } from "@js-temporal/polyfill";
import maplibregl from "maplibre-gl";

// Internal aliases (@/* maps to ./src/*)
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// CSS imports (Astro files only)
import "../styles/global.css";
```

### Naming Conventions

- **Components**: PascalCase (e.g., `Karte.tsx`, `Ainsart.tsx`)
- **Utilities**: camelCase (e.g., `cn.ts`, `utils.ts`)
- **Pages**: kebab-case or `index.astro` / `index.md`
- **Classes**: PascalCase (e.g., `TimeBadge`, `EventBadge`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MS_PER_DAY`)
- **Types/Interfaces**: PascalCase with descriptive names
- **Boolean props**: Prefix with `is` or `has`

### TypeScript

- Strict mode enabled (`astro/tsconfigs/strict`)
- Explicit return types on exported functions
- Path aliases: `@/components`, `@/lib/utils`, etc.
- Use `readonly` for immutable properties

### Error Handling

- Guard clauses for missing refs / null checks (`if (!el) return`)
- Optional chaining for cleanup (`mapInstance.current?.remove()`)
- Avoid try/catch unless dealing with external APIs or user input
- Prefer early returns over nested conditionals

### Exports

```typescript
function Button({ className, variant = "default", ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant }), className)} {...props} />
}

export { Button, buttonVariants }
```

### cva Pattern

```typescript
const badgeVariants = cva("base-classes", {
  variants: { variant: { default: "bg-primary text-primary-foreground" } },
  defaultVariants: { variant: "default" },
});
```

## Project Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── Karte.tsx        # Map + timeline (client:only="react"), takes `events` prop
│   ├── Ainsart.tsx      # Branding badge (client:only="react")
│   ├── Footer.astro
│   └── Header.astro
├── layouts/
│   ├── main.astro       # Base HTML layout
│   ├── page.astro       # Content page wrapper (max-w-2xl prose)
│   ├── profile.astro    # Artisan profile layout
│   ├── markt-listing.astro   # Layout for /markt/ index
│   ├── markt-organizer.astro # Layout for organizer pages
│   └── markt-event.astro     # Layout for market edition pages
├── lib/
│   ├── utils.ts         # cn() utility
│   └── events.ts        # Event, EventBadge classes + createEvents() factory + EventData type
├── pages/
│   ├── index.astro      # Homepage
│   ├── karte.astro      # Map page — aggregates events from markdown, passes to <Karte>
│   └── markt/
│       ├── index.md                     # /markt/ — listing page
│       └── {organizer}/
│           ├── index.md                 # /markt/{organizer}/ — organizer profile
│           └── {year}.md                # /markt/{organizer}/{year}/ — market edition
└── styles/
    └── global.css       # Tailwind v4 config + theme
```

## Data Layer — READ THIS FIRST

**There is no shared data file, no content collections, and no database.** All structured data lives in the frontmatter of markdown pages under `src/pages/markt/`.

### Data lives in `.md` frontmatter

Organizer page (`src/pages/markt/paderborn/index.md`):
```yaml
---
layout: ../../../layouts/markt-organizer.astro
name: "Schlosspark und Lippesee Gesellschaft"
location: "Paderborn"
website: "https://..."
---
```

Market page (`src/pages/markt/paderborn/2026.md`):
```yaml
---
layout: ../../../layouts/markt-event.astro
title: "Keramikmarkt Paderborn"
place: "Neuhäuser Schlosspark"
url: "https://..."
badges:
  - start: "2026-04-25T11:00+02:00[Europe/Berlin]"
    end: "2026-04-25T18:00+02:00[Europe/Berlin]"
    title: "Keramikmarkt Paderborn"
lnglat: [8.7105392, 51.7453595]
organizer: "paderborn"
year: 2026
---
```

### Aggregation: use `import.meta.glob` (NOT `Astro.glob`)

`Astro.glob()` was removed in Astro 6. Use Vite's `import.meta.glob({ eager: true })` instead.

**Patterns must be static string literals** — Vite rejects dynamic template literals. Use a broader static pattern and filter at runtime.

```astro
// karte.astro — aggregate all market pages for the map
const modules = import.meta.glob("./markt/**/*.md", { eager: true })
const events = Object.values(modules)
  .filter((p: any) => p.frontmatter?.badges)
  .map((p: any) => ({ title: p.frontmatter.title, ... }))
```

```astro
// markt-listing.astro — find all organizer pages
const modules = import.meta.glob("../pages/markt/*/index.md", { eager: true })
const organizers = Object.entries(modules)
  .filter(([_, mod]: any) => mod.frontmatter?.name)
  .map(([path, mod]: any) => {
    const slug = path.split("/").slice(-2, -1)[0] // extract slug from file path
    return { slug, name: mod.frontmatter.name }
  })
```

```astro
// markt-organizer.astro — find market pages under this organizer
const slug = Astro.url.pathname.split("/").filter(Boolean).pop()
const allModules = import.meta.glob("../pages/markt/*/*.md", { eager: true })
const markets = Object.entries(allModules)
  .filter(([path, mod]: any) => path.includes(`/${slug}/`) && mod.frontmatter?.badges)
  .map(([_, mod]: any) => ({ title: mod.frontmatter.title, ... }))
```

The return type of `import.meta.glob({ eager: true })` is `{ [filePath: string]: { frontmatter, Content, ... } }`. Use `Object.entries()` when you need the path key; use `Object.values()` when you only need the module data.

### Layout frontmatter access

In layouts used by `.md` pages, frontmatter fields are nested under `Astro.props.frontmatter`:
```astro
const { title, place, badges = [] } = Astro.props.frontmatter
```

**NOT** `Astro.props.title` — that only works for layouts used by `.astro` pages.

### Karte component contract

`Karte.tsx` must receive events as a prop — never hardcode event data inside it:
```astro
<Karte client:only="react" events={events} />
```

The `events` prop is `EventData[]` (from `@/lib/events`), containing plain objects with ISO date strings. `Karte.tsx` calls `createEvents()` internally to hydrate them into `Event`/`EventBadge` instances with `Temporal`.

## Key Patterns

### State Management

- Use refs for mutable state that doesn't trigger re-renders (timeline, map)
- Use `forceUpdate` pattern for imperative re-renders
- Separate visual state from data state

### shadcn/ui

- Located in `src/components/ui/`
- Use `cva` for variant management, export component and variants separately
- Use `cn()` utility for class merging

### Tailwind CSS v4

- `@theme` syntax for custom colors, CSS variables in `:root`
- OKLCH color format preferred

## Important Notes

- **No tests** — no test runner configured
- **No ESLint** — relies on Prettier for formatting
- **Astro 6** — `import.meta.glob`, not `Astro.glob`; `Astro.props.frontmatter` in md layouts
- **trailingSlash: "never"** in astro config
- **Date formatting** uses German locale (`de-DE`)
- **OKLCH color format** preferred in Tailwind theme

---

_Last updated: 2026-05-25_
