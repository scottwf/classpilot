# Configuration Reference

Every environment variable ClassPilot reads, across the main app
(`classpilot` container) and the MCP server (`classpilot-mcp` container).
Both containers load the same `.env` file (`env_file: - .env` in
`compose.yaml`), so one file covers both — most variables below are only
read by one of the two, though.

Start from [`.env.example`](../.env.example) and fill in real values before
running `docker compose up -d --build`. See the main
[README](../README.md) for the quick-start version of this; this page is
the complete reference.

## Core / Server

| Variable | Required | Default | Used by | Notes |
|---|---|---|---|---|
| `CLASSPILOT_PORT` | No | `3020` | Docker Compose only | Host-side port mapping for the main app (`${CLASSPILOT_PORT:-3020}:3000`) — the app itself always listens on `3000` inside the container. Not read by the app at runtime. |
| `NEXT_PUBLIC_APP_URL` | No | `http://localhost:3020` | Main app | Used to build the absolute ICS calendar subscribe URL shown on `/settings/calendar`, and to infer whether cookies should be `Secure` (see `CLASSPILOT_COOKIE_SECURE` below). Set this to your real public/LAN URL once you're not just running locally. |
| `CLASSPILOT_DATABASE_PATH` | No | `data/classpilot.sqlite` relative to the working directory (`/app/data/classpilot.sqlite` inside the container) | Both containers | Both containers must point at the same file for the MCP server's writes to show up in the web UI (and vice versa) — `compose.yaml` already hardcodes this to `/app/data/classpilot.sqlite` for `classpilot-mcp` specifically; for the main `classpilot` service it comes from `.env`, matching the same default. |
| `NODE_ENV` | No | unset (development) | Both containers | Not something you set yourself in `.env` — Next.js sets this. Its value gates every "must be set in production" check below: several secrets fall back to insecure dev defaults when `NODE_ENV !== "production"`, and refuse to start without a real value when it is `"production"`. |

## Auth & Security

| Variable | Required in production | Dev fallback | Used by | Notes |
|---|---|---|---|---|
| `CLASSPILOT_APP_PASSWORD` | Yes | `classpilot` | Main app | The login password. Also used as a fallback for `CLASSPILOT_AUTH_SECRET` if that's unset (not recommended — set both). |
| `CLASSPILOT_AUTH_SECRET` | Yes (or falls back to `CLASSPILOT_APP_PASSWORD`) | `classpilot-local-dev-secret` | Main app | Signs the session cookie (HMAC). Generate with `openssl rand -base64 32`. |
| `CLASSPILOT_COOKIE_SECURE` | No | inferred | Main app | `"true"`/`"false"` force the cookie's `Secure` flag either way. Unset: inferred from whether `NEXT_PUBLIC_APP_URL` starts with `https://`. Set explicitly to `"true"` for any real remote access (HTTPS), `"false"` for plain-HTTP local dev. |
| `CLASSPILOT_DATA_KEY` | Yes | derived from a hardcoded dev value | Main app | AES-256-GCM key (32 bytes, base64) encrypting sensitive Student CMS fields at rest (note bodies, contact details, support-plan details, birthdate, student number, strengths — names/dates stay plaintext so the roster stays searchable). Generate with `openssl rand -base64 32`. **If this is lost, every encrypted field becomes permanently unrecoverable** — store it in a password manager, never alongside a database backup. See [backup-and-recovery.md](backup-and-recovery.md). |

## AI Planning Assistant (optional)

The assistant is disabled until at least one of the hosted/local paths
below is configured — either via these env vars or, once the app is
running, via `/settings/ai` (settings saved there take priority over env
vars). Only curriculum and timing context is ever sent to a provider;
student records are never transmitted, regardless of provider.

| Variable | Required | Default | Notes |
|---|---|---|---|
| `CLASSPILOT_AI_API_KEY` | No | empty | Hosted provider (OpenAI or any OpenAI-compatible API) API key. Content-generation only (unit outlines, lesson sections, lesson resources) — never given tool access to student data. |
| `CLASSPILOT_AI_BASE_URL` | No | empty | Hosted provider's base URL, e.g. `https://api.openai.com/v1`. Can also point at a local server if you want the hosted-provider *slot* to be your local model. |
| `CLASSPILOT_AI_MODEL` | No | `gpt-4o-mini` | Hosted provider's model ID. |
| `CLASSPILOT_AI_LOCAL_BASE_URL` | No | empty | Local, OpenAI-compatible server (Ollama, LM Studio, etc.) — no key required. Drives the assistant chat's tool-calling and is the **only** provider ever given access to student data (roster, notes) when configured, since it stays on your network. |
| `CLASSPILOT_AI_LOCAL_MODEL` | No | empty | Local provider's model ID (e.g. `llama3.1` for Ollama). |

## MCP Server

See [MCP-SETUP.md](MCP-SETUP.md) for the full walkthrough — this is the
quick reference.

| Variable | Required | Default | Notes |
|---|---|---|---|
| `CLASSPILOT_MCP_PORT` | No | `3900` | Docker Compose only — host-side port mapping (`${CLASSPILOT_MCP_PORT:-3900}:3900`). The container's internal port is hardcoded to `3900` via `compose.yaml`'s `environment: PORT=3900`, not read from `.env` inside the app. |

**`CLASSPILOT_MCP_TOKEN` is no longer used.** MCP auth is per-user tokens
now, created from Settings → MCP Tokens in the app itself — see
[MCP-SETUP.md](MCP-SETUP.md). The env var can be left in `.env` (harmless)
or removed.

**Not env-configurable:** the MCP server's `allowedHosts` list (which
hostnames/IPs it accepts the `Host` header from) is hardcoded in
`mcp-server/src/index.ts`. Deploying on a new host or connecting via a new
hostname means editing that array directly and redeploying — see
[MCP-SETUP.md](MCP-SETUP.md#self-hosting-notes-only-relevant-if-youre-standing-up-your-own-instance).

## Calendar Feed

| Variable | Required in production | Dev fallback | Notes |
|---|---|---|---|
| `CLASSPILOT_CALENDAR_TOKEN` | Yes | `classpilot-calendar-dev-token` | Gates `/calendar/feed.ics`. Deliberately separate from the login password since it travels in the URL's query string (`?token=...`), not a header or cookie — calendar apps subscribing by URL can't send custom headers or hold a session. **Use a URL-safe token**: generate with `openssl rand -hex 32` (hex, not base64 — base64's `+`/`/`/`=` characters cause problems in query strings). |

## Attachments

| Variable | Required | Default | Notes |
|---|---|---|---|
| `CLASSPILOT_ATTACHMENTS_DIR` | No | `data/attachments` relative to the working directory (`/app/data/attachments` inside the container) | Where uploaded lesson/unit attachment files are stored on disk. Lives under the same `./data` bind mount as the SQLite database by default, so it's covered by the same backup you're already taking — no separate backup step needed unless you override this to point somewhere else. |

## Docker Compose-only (not read by the app)

These configure the containers themselves and are never read via
`process.env` inside ClassPilot's code — they only make sense in `.env`
alongside the app-level variables above, or directly in `compose.yaml`.

| Variable | Purpose |
|---|---|
| `CLASSPILOT_PORT` | Host port for the main app (see Core/Server above). |
| `CLASSPILOT_MCP_PORT` | Host port for the MCP server (see MCP Server above). |

## Minimal production `.env`

```bash
# Core
CLASSPILOT_PORT=3020
NEXT_PUBLIC_APP_URL=https://your-real-domain.example
CLASSPILOT_DATABASE_PATH=/app/data/classpilot.sqlite

# Auth & security — generate each with openssl rand -base64 32
# (CLASSPILOT_CALENDAR_TOKEN specifically wants -hex 32, not base64)
CLASSPILOT_APP_PASSWORD=
CLASSPILOT_AUTH_SECRET=
CLASSPILOT_COOKIE_SECURE=true
CLASSPILOT_DATA_KEY=
CLASSPILOT_CALENDAR_TOKEN=

# MCP server
CLASSPILOT_MCP_TOKEN=
CLASSPILOT_MCP_PORT=3900

# AI assistant — leave blank to keep it disabled
CLASSPILOT_AI_API_KEY=
CLASSPILOT_AI_BASE_URL=
CLASSPILOT_AI_MODEL=
CLASSPILOT_AI_LOCAL_BASE_URL=
CLASSPILOT_AI_LOCAL_MODEL=
```

Every secret above (`CLASSPILOT_APP_PASSWORD`, `CLASSPILOT_AUTH_SECRET`,
`CLASSPILOT_DATA_KEY`, `CLASSPILOT_CALENDAR_TOKEN`, `CLASSPILOT_MCP_TOKEN`)
is required once `NODE_ENV=production` (which the Docker build sets) — the
app and MCP server both fail to start without them rather than silently
falling back to an insecure dev default.
