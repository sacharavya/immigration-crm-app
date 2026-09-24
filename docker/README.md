# CaseBind — try it in Docker

One command brings up the CRM and everything it needs on your machine:
Postgres, Supabase Auth, PostgREST, Storage and a mail catcher, with the
schema and two demo accounts applied on first start.

```sh
git clone https://github.com/sacharavya/immigration-crm-app.git
cd immigration-crm-app/docker
docker compose up -d --build
```

The first run pulls images and builds the app (5–10 minutes). When
`docker compose ps` shows `app` as running, open:

| What | Where |
|---|---|
| CRM | http://localhost:3000 |
| Operator portal | http://localhost:3000/admin |
| Every email the system sends (password resets, invites) | http://localhost:8025 |
| Supabase API gateway | http://localhost:8000 |

> Run it through `docker compose`, not `docker run casebind-app`. On its own
> the app container publishes no port (the browser gets "connection
> refused") and has no database or auth behind it. Compose does both.
>
> The stack lives on the `feat/multitenancy` branch until it is merged.

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Firm super user (Big Bang Immigration) | `demo@bigbang.local` | `CaseBind-Demo-2026` |
| Platform operator | `admin@casebind.local` | `CaseBind-Admin-2026` |

The operator can add firms and their first user from `/admin`; the operator
cannot see inside any firm's data.

## What is not wired in the trial

These need real credentials and are left empty on purpose. The app runs
without them; the related feature reports that it isn't configured.

- Document storage — Microsoft Graph / a firm's connected OneDrive or Google
  Drive (`GRAPH_*`, `MS_OAUTH_*`, `GOOGLE_OAUTH_*`).
- Outbound client email through Resend (`RESEND_API_KEY`). Auth emails still
  work and land in Mailpit.
- NOC keyword extraction (`GROQ_API_KEY`).

Add them under `app.environment` in `docker-compose.yml` to try those parts.

## Everyday commands

```sh
docker compose logs -f app          # app logs
docker compose logs init            # what the migration runner did
docker compose down                 # stop, keep data
docker compose down -v              # stop and wipe the database and files
docker compose up -d --build app    # rebuild after pulling new code
```

New migration files in `supabase/migrations` are applied on the next
`docker compose up`; the runner records what it has already applied.

## Secrets

Every key and password in `docker-compose.yml` is a throwaway for a laptop.
Change all of them before this stack is reachable from the internet.
