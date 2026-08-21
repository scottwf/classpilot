# MCP Server Setup

ClassPilot ships a separate MCP server (`mcp-server/`, deployed as the
`classpilot-mcp` container) that exposes your planner data — units, lessons,
classes, schedule, curriculum outcomes — as [MCP](https://modelcontextprotocol.io)
tools over Streamable HTTP. Any MCP client (Claude Code, Claude Desktop,
Claude cowork, or anything else that speaks MCP) can connect to it and read
or write your plan directly, instead of you copying content between a chat
window and the app by hand.

**It never has access to the Student CMS tables** (roster, contacts, notes,
support plans). It shares the same SQLite database file as the main app —
anything the MCP server creates or edits shows up in the web UI immediately,
and vice versa.

Every request is scoped to **your own account's data only** — see
"Per-user tokens" below.

## What it can do

| Tool | Does |
|---|---|
| `get_planner_data` | Read the active school year, classes, units, lessons, and curriculum outcomes |
| `get_unit` / `get_lesson` | Read one unit or lesson by ID |
| `create_unit` / `update_unit` | Create or edit a unit |
| `create_unit_with_lessons` | Create a unit and its lessons in one call |
| `create_lesson` / `update_lesson` | Create or edit a single lesson |
| `import_lesson_markdown` | Parse and create a lesson from Markdown (same format as `/lessons/import`) |
| `extend_lesson` | Duplicate a lesson onto the class's next meeting day, linked as a continuation |
| `shift_lessons` | Cascade-reschedule every lesson in a unit on/after a date, by N of the class's actual meeting days |
| `create_class` / `update_class` / `delete_class` | Manage classes. Meeting days/times are **not** set here — see `set_class_schedule` |
| `get_schedule` / `set_class_schedule` | Read or replace a class's whole bell-schedule (which cycle days it meets, and at what times) |

`create_class`/`update_class` deliberately don't accept a class's meeting
days — `set_class_schedule` is the single source of truth for that (it
overwrites the class's `cycleDays` when you save a schedule), matching how
the web UI's Schedule page works.

Units no longer take a `color` field — a unit's color is always a shade of
its class's color now, not an independent choice.

## Per-user tokens

Every MCP token belongs to one account and only ever sees that account's
data — a token has no way to reach another account's classes, units, or
lessons, even if it somehow guessed their IDs.

### 1. Create a token

Sign in to ClassPilot, go to **Settings → MCP Tokens**, give it a label
(e.g. "Claude Desktop", "Claude Code — laptop"), and create it. **The
plaintext token is shown exactly once, right after creation** — copy it
immediately. Only its hash is stored, so if you lose it, revoke it and
create a new one.

The same page shows the server URL to use and the exact header name.

### 2. Connect a client

**Public URL (works from anywhere, including Claude cowork):**

```
https://classpilot.woods-fehr.ca/mcp
```

**LAN-only URL** (if you're on the same network as the server and don't
need remote access):

```
http://172.16.1.140:3900/mcp
```

Both require the same header: `x-classpilot-mcp-key: <your token>`.

#### Claude Code

```bash
claude mcp add --transport http --scope user classpilot \
  https://classpilot.woods-fehr.ca/mcp \
  --header "x-classpilot-mcp-key: <your token>"
```

`--scope user` makes it available in every Claude Code session on that
machine, not just the current project.

#### Claude Desktop / Claude cowork

Add to your MCP config (Claude Desktop: Settings → Developer → Edit
Config), matching the `mcpServers` shape Claude Desktop expects for a
remote HTTP server — consult
[Claude Desktop's MCP docs](https://modelcontextprotocol.io/quickstart/user)
for the current config format, since it's changed between versions. The URL
and header are the same as the Claude Code example above.

### 3. Verify the connection

Ask your MCP client to call `get_planner_data` (or just ask it something
like "what units do I have this year?"). If it responds with real data from
your school year, the connection is working.

### Revoking a token

Settings → MCP Tokens → Revoke, next to the token. Takes effect
immediately — the next request with that token gets `401 Unauthorized`.
Revoked tokens are kept (not deleted) so there's a record of what existed.

## Self-hosting notes (only relevant if you're standing up your own instance)

- ClassPilot is deployed via Docker Compose (see the main
  [README](../README.md)) — the `classpilot-mcp` service is already defined
  in `compose.yaml` alongside the main `classpilot` service and starts with
  it.
- `CLASSPILOT_MCP_TOKEN` in `.env` is **no longer used** — the MCP server
  doesn't read it at all. Per-user tokens (above) replaced it. Safe to leave
  the leftover line in `.env` or remove it.
- The MCP server validates the `Host` header on incoming requests against a
  hardcoded allow-list in `mcp-server/src/index.ts`. If you're deploying on
  a different domain/host than what's already listed there, add it and
  redeploy (`docker compose up -d --build`) — a request from an unlisted
  host is rejected before it ever reaches the auth check. This list isn't
  environment-configurable yet; it's a plain code edit.
- To expose `/mcp` on the same public domain as the main app (rather than a
  raw `host:3900` address), configure your reverse proxy to route the
  `/mcp*` path prefix to the `classpilot-mcp` container's port, leaving
  everything else routed to the main app's port. On this deployment that's
  a Caddy Proxy Manager (CPM) `locationRules` entry on the existing proxy
  host — see `Homelab/Networking/caddy-migration-plan.md` in the Obsidian
  vault for the exact procedure (CPM's create/update API has a known bug;
  the fallback is a direct SQLite edit, documented there).

## Troubleshooting

- **`401 Unauthorized`** — the `x-classpilot-mcp-key` header doesn't match
  any active token, or the token was revoked. Create a new one from
  Settings → MCP Tokens.
- **Connection refused / timeout** — confirm the port/domain you're using
  is reachable from where you're connecting (firewall, Tailscale ACL,
  etc.), and that the `classpilot-mcp` container is actually running:
  `docker ps` should show it healthy.
- **Request rejected before auth even runs** — your connecting hostname
  isn't in `allowedHosts` (self-hosting notes above).
- **A tool call returns "not found" for something you can see in the web
  UI** — double check you're using a token for the right account; a token
  can only ever see its own account's data, by design.
