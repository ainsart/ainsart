---
name: add-market
description: Add a new ceramic market and its organizer to the ains.art website. Use when the user provides a market URL, event details, or asks to add a market/event/organizer. Loads the nominatim-geocode skill automatically to resolve coordinates.
---

# Add Market to ains.art

This skill guides you through creating the two files needed to add a new market event to the ains.art website: an **organizer page** (under `src/pages/o/`) and a **market edition page** (under `src/pages/m/`).

## When to use

- User gives a URL to a market event page (e.g. `https://www.example.de/markt-2026/`)
- User says "add this market", "create a page for", "new event", etc.
- User provides market details (name, dates, place, organizer, etc.)

## Workflow

### 1. Gather information

Fetch the market web page via `webfetch` if the user provided a URL. Extract:

- Market/event title and location (place — building, street, town)
- Organizing entity (name, city, website)
- Date(s) and times for each day
- List of artisans / exhibitors (names only, no need to create artisan pages)
- Any interesting description (1–2 sentences max)

If the user provided the details directly, skip the fetch.

### 2. Check for existing files

Use `glob` to list existing files in:

- `src/pages/o/*.md` — see if organizer already exists
- `src/pages/m/*.md` — see if market already exists
- `src/pages/a/*.md` — see if artisans exist

If the organizer already exists, **skip** creating the organizer page. Reuse its slug.

### 3. Create the Organizer page

Path: `src/pages/o/<slug>.md`

Template:

```yaml
---
layout: ../../layouts/organizer.astro
slug: "<slug>" # links to markets via organizer field. MATCHES FILENAME
name: "<Organizer Name>"
location: "<City>"
website: "<https://...>"
---
Brief description (1 sentence).
```

**Rules:**

- `slug` must match the filename (e.g. file `art-e-promusis.md` → `slug: "art-e-promusis"`). Kebab-case.
- Omit `location` if unknown.
- `website` not `url` (reserved by Astro).

### 4. Create the Market edition page

Path: `src/pages/m/<slug>.md`

Template:

```yaml
---
layout: ../../layouts/markt.astro
title: "<Market Title>"
place: "<Venue, Town>"
website: "<https://...>" # NOT "url" — reserved by Astro
badges:
  - start: "<YYYY-MM-DD>THH:MM+02:00[Europe/Berlin]"
    end: "<YYYY-MM-DD>THH:MM+02:00[Europe/Berlin]"
  - start: "<YYYY-MM-DD>THH:MM+02:00[Europe/Berlin]"
    end: "<YYYY-MM-DD>THH:MM+02:00[Europe/Berlin]"
lnglat: [<lng>, <lat>]
description: "<Kurzbeschreibung des Markts (wird in Karte/Timeline als Zusammenfassung verwendet)>"
organizer: "<organizer-slug>" # matches organizer's slug
year: <YYYY>
artisans:
  - "<artisan-filename>" # OPTIONAL — matches artisan filename without .md
---
1–2 sentence factual description. No hyperlinks here. German locale.
```

**Rules:**

- Use `+02:00[Europe/Berlin]` for Mar–Oct (CEST), `+01:00[Europe/Berlin]` for Nov–Feb (CET).
- `lnglat` is `[longitude, latitude]` — use the **nominatim-geocode** skill to resolve from the place address.
- `website` not `url` (reserved by Astro).
- Always include a `description` field in the frontmatter: a single-line summary of the market.
- `artisans` list is optional. Only include artisans that exist in `src/pages/a/*.md`.
- Badges: one entry per day, with its own start/end time. Do NOT create one long spanning badge.

### 5. Resolve coordinates

Call the `nominatim-geocode` skill (`skill({ name: "nominatim-geocode" })`) to resolve `lnglat` from the place/address.

### 6. Format

Run `bunx prettier --write src/pages/o/<file> src/pages/m/<file>`.

### 7. Verify

Run `bunx astro check` to catch TypeScript/frontmatter issues.

## File naming conventions

| Type      | Directory      | Filename pattern         | Example                          |
| --------- | -------------- | ------------------------ | -------------------------------- |
| Organizer | `src/pages/o/` | `<slug>.md`              | `art-e-promusis.md`              |
| Market    | `src/pages/m/` | `<kebab-name>-<year>.md` | `toepfermarkt-iffezheim-2026.md` |
| Artisan   | `src/pages/a/` | `<slug>.md`              | `tito-keramik.md`                |

## Important gotchas

- **`url` is reserved** in Astro frontmatter (overrides page URL). Always use `website`.
- **Organizer pages need `slug`** field matching their filename for `markt-organizer.astro` to find them.
- **Artisans list** on market pages uses full filename (e.g. `"tito-keramik"`), matched against `a/*.md` without `.md`.
- **No tests**, no ESLint, `trailingSlash: "never"`, German locale (`de-DE`), OKLCH colors.
- **Geocoding**: max 1 req/s. Only query when the user actually needs a new market added.
