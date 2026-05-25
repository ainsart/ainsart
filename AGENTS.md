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

- No semicolons, double quotes, 2 spaces indentation, trailing commas
- Run `bunx prettier --write .` before committing

**Imports** — React hooks first, then third-party, then `@/` aliases, CSS last (Astro files only).

**Naming** — PascalCase components, camelCase utilities, kebab-case pages. Boolean props prefix with `is` or `has`.

**Exports** — Named exports. Export component and variant separately for cva:
```typescript
export { Button, buttonVariants }
```

## Project Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── Karte.tsx        # Map + timeline (client:only="react")
│   ├── Ainsart.tsx      # Branding badge (client:only="react")
│   ├── Footer.astro
│   └── Header.astro
├── layouts/
│   ├── main.astro       # Base HTML layout
│   ├── page.astro       # Content page wrapper (max-w-2xl prose)
│   ├── profile.astro    # Artisan profile layout (title=handle, name=display)
│   └── markt-*.astro    # Organizer listing, organizer profile, event edition
├── lib/
│   ├── utils.ts         # cn() utility
│   └── events.ts        # Event, EventBadge classes + createEvents() + EventData type
├── pages/
│   ├── index.astro      # Homepage (links to /markt/ and /kunsthandwerkende)
│   ├── karte.astro      # Map page — aggregates events, passes to <Karte>
│   ├── markt/index.md   # /markt/ — listing page (finds all organizer pages)
│   ├── @schlosspark-paderborn.md               # Organizer profile
│   ├── @keramikmarkt-paderborn-2026.md          # Market edition (event)
│   ├── @tito-keramik.md                         # Artisan profile
│   └── *.md             # Static pages (impressum, datenschutz, etc.)
└── styles/
    └── global.css       # Tailwind v4 config + theme
```

## Data Layer — READ THIS FIRST

**No shared data file, no content collections, no database.** All structured data lives in the frontmatter of `@*.md` pages directly under `src/pages/`. Page type is determined by its layout, not its directory.

### Organizer page (`@schlosspark-paderborn.md`)
```yaml
---
layout: ../layouts/markt-organizer.astro
slug: "paderborn"          # links to markets via organizer field
name: "Schlosspark und Lippesee Gesellschaft"
location: "Paderborn"
website: "https://www.schlosspark-paderborn.de"
---
```

### Market edition page (`@keramikmarkt-paderborn-2026.md`)
```yaml
---
layout: ../layouts/markt-event.astro
title: "Keramikmarkt Paderborn"
place: "Neuhäuser Schlosspark"
website: "https://www.paderborn.de/..."   # NOT "url" — reserved by Astro
badges:
  - start: "2026-04-25T11:00+02:00[Europe/Berlin]"
    end: "2026-04-25T18:00+02:00[Europe/Berlin]"
    title: "Keramikmarkt Paderborn"
lnglat: [8.7105392, 51.7453595]
organizer: "paderborn"     # matches organizer's slug
year: 2026
artisans:
  - "@tito-keramik"        # matches artisan filename (without .md)
---
```

### Artisan profile page (`@tito-keramik.md`)
```yaml
---
layout: ../layouts/profile.astro
title: "@tito-keramik"      # handle/slug (also the filename without .md)
name: "Tito Keramik"
location: "Göttingen"
---
```

### Aggregation: use `import.meta.glob` (NOT `Astro.glob`)

All aggregations use `../pages/@*.md` and filter by frontmatter fields to distinguish page types. Patterns must be static string literals.

- **Markets** (for map/organizer): filter by `frontmatter?.badges`
- **Organizers** (for listing): filter by `frontmatter?.slug`
- **Artisans** (for market linking): filter by matching `artisans` list vs filename slug

```astro
// karte.astro — aggregate market events for the map
const modules = import.meta.glob("./@*.md", { eager: true })
const events = Object.values(modules)
  .filter((p: any) => p.frontmatter?.badges)

// markt-listing.astro — find all organizer pages
const modules = import.meta.glob("../pages/@*.md", { eager: true })
const organizers = Object.entries(modules)
  .filter(([_, mod]: any) => mod.frontmatter?.slug)
  .map(([path, mod]: any) => ({
    slug: path.split("/").pop()?.replace(".md", ""),
  }))

// markt-organizer.astro — find markets for this organizer
const { slug } = Astro.props.frontmatter
const modules = import.meta.glob("../pages/@*.md", { eager: true })
const markets = Object.entries(modules)
  .filter(([_, mod]: any) =>
    mod.frontmatter?.organizer === slug && mod.frontmatter?.badges
  )

// markt-event.astro — find linked artisans
const { artisans = [] } = Astro.props.frontmatter
const modules = import.meta.glob("../pages/@*.md", { eager: true })
const linkedArtisans = Object.entries(modules)
  .filter(([path]) => artisans.includes(path.split("/").pop()?.replace(".md", "")))
```

### Layout frontmatter access

In layouts used by `.md` pages, access via `Astro.props.frontmatter`:
```astro
const { title, place, badges = [] } = Astro.props.frontmatter
```

`profile.astro` supports both `.md` (frontmatter) and `.astro` (content):
```typescript
const fm = Astro.props.frontmatter || Astro.props.content
```

### Karte component contract

`Karte.tsx` receives `EventData[]` events as a prop — never hardcode event data inside it. `Karte.tsx` calls `createEvents()` internally to hydrate into `Event`/`EventBadge` instances with `Temporal`.

## Important Gotchas

- **`url` is reserved** in Astro frontmatter (overrides to page URL). Use `website` instead.
- **`@*.md` glob captures all three page types** — always filter by frontmatter fields (`badges`, `slug`, `organizer`).
- **Organizer pages need `slug`** field for `markt-organizer.astro` to match markets via `organizer` field.
- **Artisans list on market pages** uses full filename (e.g., `"@tito-keramik"`), matched against `@*.md` without `.md`.
- **No tests**, no ESLint, `trailingSlash: "never"`, German locale (`de-DE`), OKLCH colors.
- **Astro 6**: `import.meta.glob`, not `Astro.glob`; `Astro.props.frontmatter` in md layouts.
