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

## TODO: How to properly store the hashed auth codes?

Can I store the auth codes in clear? Or is it too dangerous?

## TODO: How many login attemts do I allow?

Just one? After an email is send, user has one attempt to enter the correct code!?

## TODO: How to assure availability of the login?

Rate limit attempts for login of same email.
How to avoid spam?

## TODO: How to persist data?

For now, I only need a SQL DB.

- Session table
- User table
- Artisan table
- Market table
- Market organizer table

In the future I also have to store images of artisans and markets.

## TODO: What to use as SQL DB?

I'd like to use SQLite because it is so simple (just a file).
But I've heared it's not a good fit for a Kubernetes cloud because of the block storage attachment?!

## TODO: How to provide the DB data to the frontend?

As JSON via FastAPI?

## TODO: Do I want polyrepos or monorepo for api / webapp?

## TODO: How to send mail for login?

## TODO: How to manage secrets?

I already have Bitwarden.

## TODO: What to use as the reverse proxy?

I'd like to use Caddy, I've worked with it in the past.

## TODO: Do I want to use IaC tool like Terraform?

I guess not yet. For now I only want a single node.
But I do need block storage.

## TODO: How to verify artisans?

A user can claim ownership of an artisan or market page.
Then I have to manually verify the ownership and give exclusive authorization of that page info to that user.

## TODO: What about image upload?

This will be a paid feature for verified artisans.

## Do I want to self-host the email server?

No. Too much pain.

## Do I want to use JWT for auth?

No. Stateless auth is a lie. Just a regular httpOnly session ID cookie with a server-side session in the DB.

## TODO How to avoid missuse of login for spam?

Attackers might want me to send a bunch of spam mails to a victim with auth codes.
