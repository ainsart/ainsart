---
name: nominatim-geocode
description: Use ONLY when the user asks for lat/lng coordinates from a street address, place name, or location description. Fetches coordinates from the Nominatim geocoding API (https://nominatim.org). Respects the 1 req/s rate limit.
---

# Nominatim Geocoding

Resolve street addresses or place names to latitude/longitude coordinates using the free [Nominatim](https://nominatim.org) geocoding API.

## Usage policy

- Max **1 request per second** — add a `User-Agent` header identifying this app (`ainsart/1.0`)
- Attribution to OpenStreetMap is required: display "&copy; OpenStreetMap contributors" near the map
- For details see: https://operations.osmfoundation.org/policies/nominatim/

## Query format

```
https://nominatim.openstreetmap.org/search?q=<url-encoded address>&format=json&limit=1
```

Use the `webfetch` tool to call the API. It returns a JSON array of results; use the first match.

- `lat` — latitude (string, parse with `parseFloat`)
- `lon` — longitude (string)
- `display_name` — full address for verification

## Example

User: "get coords for Rathaus Frechen, Johann-Schmitz-Platz 1-3, 50226 Frechen"

1. URL-encode the query: `Rathaus%20Frechen%20Johann-Schmitz-Platz%201-3%2050226%20Frechen`
2. Call `webfetch`:
   ```
   https://nominatim.openstreetmap.org/search?q=Rathaus+Frechen+Johann-Schmitz-Platz+1-3+50226+Frechen&format=json&limit=1
   ```
3. Extract `lon` and `lat` from the first result.
4. Return coordinates as `[parseFloat(lon), parseFloat(lat)]` (lnglat order per project convention).

## Output format

Always return coordinates in lnglat order: `[longitude, latitude]`, matching the project's `lnglat` frontmatter convention.