---
name: link-market-artisan
description: Link a market and an artisan bidirectionally on the ains.art website. Adds the market slug to the artisan's `markets` list and the artisan slug to the market's `artisans` list.
---

# Link Market & Artisan

Adds a bidirectional link between a market page (`src/pages/m/<slug>.md`) and an artisan page (`src/pages/a/<slug>.md`).

## When to use

- User says "link artisan X to market Y"
- User mentions that an artisan participates in a market
- User asks to update the artisan's markets or a market's artisans

## Workflow

### 1. Identify slugs

Determine the market slug (filename without `.md` under `src/pages/m/`) and the artisan slug (filename without `.md` under `src/pages/a/`). If the user provides partial names, use `glob` to find matching files.

If either file doesn't exist, tell the user and stop.

### 2. Add forward link (market → artisan)

Read `src/pages/m/<market-slug>.md`. If the artisan slug is not already in the `artisans` list in the frontmatter, add it. Preserve alphabetical or existing ordering.

If there is no `artisans` field yet, add one:

```yaml
artisans:
  - "<artisan-slug>"
```

### 3. Add backlink (artisan → market)

Read `src/pages/a/<artisan-slug>.md`. If the market slug is not already in the `markets` list in the frontmatter, add it. Preserve alphabetical or existing ordering.

If there is no `markets` field yet, add one:

```yaml
markets:
  - "<market-slug>"
```

### 4. Format

Run `bunx prettier --write src/pages/m/<market-slug>.md src/pages/a/<artisan-slug>.md`.

### 5. Verify

Run `bunx astro check` to catch any issues.

## How the backlink works

The artisan page (`artisan.astro` layout) reads the `markets` frontmatter field, globs `../pages/m/*.md`, and filters for matching slugs. This renders a "Märkte" section on the artisan profile page linking to each market. This is the **backlink** — it makes markets discoverable from the artisan page.

The market page (`markt.astro` layout) reads the `artisans` frontmatter field, globs `../pages/a/*.md`, and renders an "Ausstellende" section linking to each artisan page. This is the **forward link**.

Both must be kept in sync.

## Important gotchas

- Slugs are kebab-case, without `.md` extension.
- Only link artisans that exist in `src/pages/a/` and markets that exist in `src/pages/m/`.
- `url` is reserved in Astro frontmatter — not relevant here but good to remember.
