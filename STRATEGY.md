# Strategy

## Do I want to keep a minimal set of vendors?

Yes. It reduces cost, reduces dependencies.
I want to be able to switch providers if needed (no vendor lock-in).
But I don't want to pay subscription for different services at various vendors.

## What is the current situation?

Static site, built with Astro, hosted on GitHub Pages.

## Do I need a backend?

Yes, I need more data (markets, artisans, ...) that I want to crowd-source.

## Do I want to use Kubernetes?

Yes, I want to learn Kubernetes, Talos, GitOps, ...

## Do I want a clear backend / frontend seperation?

Yes. I want to render the backend JSON in the frontend.
At least I want a clean JSON API such that I can build other clients (e.g. CLI for AI agents) later.

## Which provider do I want to use?

Hetzner, it is a community favorite located in EU.

## Which distro for the Kubernetes Nodes?

Talos: declarative, immutable, kube-native

## What to use for the frontend?

Astro with shadcn-ui. It builds HTML-first web pages with modern UI design.

## What to use for the map?

Maplibre GL with OpenFreeMap. It looks more modern than OSM and is still free to use.
In the future I might have to host my own map tile server or use a paid service.

## What to use as the backend language / framework?

Python / FastAPI. I'm a Python developer with knowledge of the FastAPI framework.

## How do I want to authenticate users?

I just want to support email as authentication:

- User enters email address (this is the user ID).
- Backend sends a one-time auth code to the email address.
- User enters one-time code in the app.
- Backend validates (correct and not outdated yet).
- Backend sets a httpOnly session cookie and stores the session ID in the database.
- The session lives as long as the user keeps the session cookie.

Sessions are **server-side in the DB** (no JWT).
Logout = delete the session row.

## TODO: How to protect agains CSRF?

A evil website might make a state-changing request to api.ains.art and the browser just sends the session cookie!

## How to properly store the hashed auth codes?

Decision: **store hashed, never cleartext.** Use HMAC-SHA256 with a server-side pepper
(a random secret kept in SOPS/Bitwarden, never in the DB). Compare by hashing the
submitted code with the same pepper and a constant-time compare.

Why not cleartext: the SQLite DB file is replicated off-site to R2 by Litestream and to
backups, so a leaked backup would expose valid-yet-unused codes. The pepper makes the
6-digit space un-brute-forceable offline. No salt needed for HMAC of a short code as
long as the pepper stays secret.

## How many login attempts do I allow?

Decision: **up to 5 attempts** per issued code within its 10-minute TTL. On the 6th wrong
attempt, invalidate the code and require a new request. One attempt is too harsh (typos).
Track `attempts` on the `login_codes` row.

## How to assure availability of the login?

Decision: Rate-limit the **request** endpoint, not just verify:

- per-email: 1 request / 60s, 5 / hour
- per-IP: 10 / hour

Use `slowapi` (in-process, fine for a single node; swap for Redis if nodes ever multiply).
Return a generic "if the address is known, a code was sent" so the request endpoint does
not leak which emails exist. Keep an allowlist of admin emails initially so only you can
log in until registration is opened.

## How to persist data?

For now, I only need a SQL DB.

- `users` (id, email, is_admin, created_at)
- `sessions` (id, user_id, created_at, expires_at, csrf_token)
- `login_codes` (id, email, code_hash, attempts, expires_at, created_at)
- `artisans` (id, slug, name, location, ..., owner_id nullable)
- `markets` (id, slug, title, place, website, organizer_id, lnglat, description, year, owner_id nullable)
- `organizers` (id, slug, name, location, website, owner_id nullable)
- `badges` (id, market_id, start, end, title) — one market has many dated editions
- `claims` (id, user_id, resource_type, resource_id, status, created_at) — for ownership verification
- `images` (id, owner_id, resource_type, resource_id, r2_key, created_at) — later

`owner_id` on artisans/markets/organizers enables the verify-artisan flow (exclusive write
for the approved owner).

## What to use as SQL DB?

## TODO: Where to store the SQL DB?

On the same VM that Talos runs on or buy some block storage at Hetzner?

## TODO: What is WAL mode?

## TODO: How to do backups?

Decision: **SQLite + Litestream** on a local PersistentVolume.

The "block storage attachment" worry only applies to _multi-writer / ReadWriteMany_
volumes. SQLite is single-writer and runs fine on a single-node cluster where exactly one
pod writes one file to a local PV (local NVMe, or a Hetzner Volume mounted via
`machine.kubelet.extraMounts`). Litestream runs as a sidecar and continuously replicates
the SQLite WAL to R2, giving point-in-time recovery and surviving node rebuilds (restore =
replay the WAL into a fresh DB file on a new PV). No Postgres operator, no extra vendor,
just a file — which matches the "minimal vendors / simple / no subscription" goals.

Migrate to Postgres later only if write concurrency outgrows SQLite. In WAL mode SQLite
handles thousands of writes/sec — plenty for crowd-sourced market data.

## How to provide the DB data to the frontend?

Decision: **JSON via FastAPI**, versioned (`/v1/markets`, `/v1/artisans`, ...).
Astro fetches at **build time (SSG)** for the public `karte` page so the static build
embeds the latest market data; the Karte island can additionally fetch at runtime for
live updates. A clean versioned JSON API also makes the future CLI / AI-agent client
trivial.

## Do I want polyrepos or monorepo for api / webapp?

Decision: **Monorepo** with clear top-level dirs:

```
web/    # Astro site
api/    # FastAPI
db/     # schema + migrations
infra/  # Talos machineconfig + Flux manifests
```

One PR for a feature that touches schema + API + frontend; shared contracts/types easy to
keep in sync; a single CI.

## TODO: How to send mail for login?

What are the options I have? I'd like to go with a EU provider.

## TODO: How to manage secrets?

What is SOPS? Can I use my private paid Bitwarden plan?

## What to use as the reverse proxy?

Decision: **Caddy** as the edge, using its **built-in automatic Let's Encrypt HTTPS** —
so no cert-manager and no ingress-nginx. Simplest layout: a Caddy Deployment + Service
proxying `api.ains.art` → `fastapi:8000`. (Use the caddy-ingress-controller only if you
later want ingress-style routing for multiple services.) One less component, matches your
Caddy familiarity.

If you proxy the VPS through Cloudflare (orange cloud), Cloudflare terminates TLS and
Caddy only serves behind it — either works. Pointing the A-record directly at the VPS and
letting Caddy do HTTPS is the leanest path.

## Do I want to use IaC tool like Terraform?

Decision: **Skip**, confirmed. Single node. For block storage on Hetzner: attach a
**Hetzner Volume** (network block, ext4), mount it into Talos via
`machine.kubelet.extraMounts`, and use `local-path-provisioner` so PVs land on it. The
Talos machineconfig in git _is_ your IaC. Add Terraform later only if nodes multiply or
get rebuilt often.

## How to verify artisans?

Decision: Add a `claims` table and an `owner_id` column on artisans/markets/organizers.

1. A logged-in user requests ownership of an artisan/market page → creates a `pending` claim.
2. You (admin) review and approve/reject via an admin endpoint/UI.
3. On approval, set `owner_id = user_id` on the resource row.
4. That user now has **exclusive write** authorization over that page's info, enforced by
   a FastAPI dependency (`if current_user.id != resource.owner_id: 403`).

`is_admin` on `users` grants full access for you.

## What about image upload?

Decision: **Out of scope for v1.** Design ahead so it slots in later:

- `images` table (id, owner_id, resource_type, resource_id, r2_key, created_at).
- Upload flow: backend mints a presigned PUT URL to R2; browser uploads directly; backend
  records the metadata. The backend never proxies image bytes.
- Gate behind a `plan`/paid flag on the user/artisan.
- Serve public reads via `img.ains.art` through Cloudflare's CDN.

Don't build it until the core data + auth + claim flow works.

## Do I want to self-host the email server?

No. Too much pain. → Resend.

## Do I want to use JWT for auth?

No. Stateless auth is a lie. Just a regular httpOnly session ID cookie with a server-side
session in the DB. → `sessions` table, CSRF token as above.

## How to avoid misuse of login for spam?

Decision: Attackers could abuse the request endpoint to send unsolicited "auth code" mails
to a victim. Mitigations (defense in depth):

- **Hard per-email rate limit** on the request endpoint (1/60s, 5/hour) so an attacker
  can't spam a single address. See "assure availability of the login".
- **Hard per-IP rate limit** (10/hour) to limit broadcast spam from one source.
- **Allowlist initially**: only allowlisted (admin) emails can request a code until
  registration is opened, which removes the spam surface entirely during early life.
- **Generic response**: never confirm whether an email is registered.
- **Honeypot / proof-of-work** later if needed (e.g. require a turnstile/captcha on the
  request form once public). Not needed while allowlisted.

---

## Stack summary

| Concern                 | Choice                                                             |
| ----------------------- | ------------------------------------------------------------------ |
| Provider                | Hetzner (single VPS)                                               |
| Node OS                 | Talos Linux                                                        |
| Orchestration           | Kubernetes (single node), Flux GitOps                              |
| Storage                 | Hetzner Volume → local-path-provisioner (local PV)                 |
| DB                      | SQLite + Litestream (WAL → R2)                                     |
| Object storage / images | Cloudflare R2 (served via `img.ains.art` CDN)                      |
| Mail / OTP              | Resend HTTP API                                                    |
| Reverse proxy / TLS     | Caddy (automatic Let's Encrypt)                                    |
| Secrets                 | SOPS + age (Flux-decrypted), recovery copy in Bitwarden            |
| Backend                 | Python / FastAPI                                                   |
| Frontend                | Astro + shadcn-ui (SSG, fetches JSON from `/v1`)                   |
| Auth                    | email OTP → server-side session in DB, httpOnly cookie, CSRF token |
| IaC                     | none (Talos machineconfig in git)                                  |
| Repo                    | monorepo: `web/`, `api/`, `db/`, `infra/`                          |
