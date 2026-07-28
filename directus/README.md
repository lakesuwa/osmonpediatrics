# Directus (local CMS)

Docker Compose setup for Directus + PostgreSQL, meant to run alongside the
static `osmonpediatrics` site during development. Not deployed anywhere yet —
"hosting is okay for now" per project decision.

## Why compose instead of `docker run -p 8055:8055 directus/directus`

The bare `docker run` command has no database configured and no persistent
volume, so Directus falls back to an in-memory SQLite instance that resets
every time the container restarts, and it has no `KEY`/`SECRET`/admin
credentials set. This compose file adds a Postgres service, persists both the
database and file uploads to disk, and generates real secrets.

## Setup

```bash
cd directus
cp .env.example .env
```

Fill in `.env`:
- `KEY` — `openssl rand -hex 16`
- `SECRET` — `openssl rand -hex 32`
- `ADMIN_PASSWORD` — any strong password
- `DB_PASSWORD` — any strong password

Then:

```bash
docker compose up -d
```

First boot pulls `directus/directus:11` and `postgis/postgis:16-3.4-alpine`,
runs migrations, and creates the admin user from `ADMIN_EMAIL`/
`ADMIN_PASSWORD`. Visit **http://localhost:8055** and log in.

## Notes

- `data/`, `uploads/`, and `.env` are gitignored — they hold the database
  files, uploaded media, and secrets respectively. Never commit them.
- `docker compose down` stops the stack without deleting data; add `-v` only
  if you intentionally want to wipe the database volume.
- This was prepared but **not started** in the Claude Code sandbox — that
  environment's egress policy blocks Docker Hub's image CDN
  (`production.cloudfront.docker.com` → 403). Run it locally or in any
  environment with normal Docker Hub access.
