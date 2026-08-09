# MCP Server Setup

ClassPilot ships a separate MCP server (`mcp-server/`, deployed as the
`classpilot-mcp` container) that exposes your planner data — units, lessons,
classes, schedule, curriculum outcomes — as [MCP](https://modelcontextprotocol.io)
tools over Streamable HTTP. Any MCP client (Claude Code, Claude Desktop, or
anything else that speaks MCP) can connect to it and read or write your plan
directly, instead of you copying content between a chat window and the app by
hand.

**It never has access to the Student CMS tables** (roster, contacts, notes,
support plans). It shares the same SQLite database file as the main app —
anything the MCP server creates or edits shows up in the web UI immediately,
and vice versa.

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

## Prerequisites

- ClassPilot is already deployed via Docker Compose (see the main
  [README](../README.md)) — the `classpilot-mcp` service is already defined
  in `compose.yaml` alongside the main `classpilot` service and starts with
  it.
- You know the host/IP where ClassPilot runs (e.g. `192.168.1.50`, or a
  Tailscale MagicDNS name like `echo.tailxxxxx.ts.net`).

## 1. Set the MCP token

In your deployment's `.env` (same file the main app uses):

```bash
CLASSPILOT_MCP_TOKEN=replace-with-a-long-random-secret
CLASSPILOT_MCP_PORT=3900
```

Generate a strong token:

```bash
openssl rand -base64 32
```

This token is a **shared secret** — every MCP client that has it can read
and write every unit, lesson, and class in your active school year (never
student records). Treat it like a password. There's currently no per-user
scoping; if you ever share this with someone else, they get full read/write
access to your plan data. (Tracked for a future pass — see the "Known
limitations" section below.)

## 2. Allow your connecting host

The MCP server validates the `Host` header on incoming requests against a
hardcoded allow-list in `mcp-server/src/index.ts`:

```ts
const app = createMcpExpressApp({
  host: "0.0.0.0",
  allowedHosts: [
    "172.16.1.140",
    "localhost",
    "127.0.0.1",
    "echo",
    "echo.tail00bf7.ts.net",
  ],
});
```

If you're deploying on a different machine or connecting via a different
hostname than what's already listed, add it here and redeploy
(`docker compose up -d --build`) — a request from an unlisted host is
rejected before it ever reaches the auth check. This list isn't
environment-configurable yet; it's a plain code edit.

## 3. Start (or redeploy) the containers

```bash
docker compose up -d --build
```

Confirm it's up:

```bash
curl http://<your-host>:3900/health
# {"status":"ok"}
```

## 4. Connect an MCP client

### Claude Code

```bash
claude mcp add --transport http --scope user classpilot \
  http://<your-host>:3900/mcp \
  --header "x-classpilot-mcp-key: <your CLASSPILOT_MCP_TOKEN>"
```

Use whatever address reaches your deployment — a LAN IP
(`http://192.168.1.50:3900/mcp`), a Tailscale MagicDNS name
(`http://echo.tailxxxxx.ts.net:3900/mcp`), or `localhost` if Claude Code is
running on the same machine.

`--scope user` makes it available in every Claude Code session on that
machine, not just the current project.

### Claude Desktop

Add to your MCP config (Settings → Developer → Edit Config), matching the
`mcpServers` shape Claude Desktop expects for a remote HTTP server — consult
[Claude Desktop's MCP docs](https://modelcontextprotocol.io/quickstart/user)
for the current config format, since it's changed between versions. The
URL and header are the same as the Claude Code example above.

### Verify the connection

Ask your MCP client to call `get_planner_data` (or just ask it something
like "what units do I have this year?"). If it responds with real data from
your school year, the connection is working.

## Known limitations

- **Single shared token, no per-user accounts.** Fine for one teacher using
  ClassPilot from multiple machines (their laptop, their desktop, this
  MCP connection). Not fine for handing this token to a second teacher —
  see the multi-user auth work tracked for later (registration/sign-in,
  per-user data isolation, per-user MCP tokens).
- **`allowedHosts` is a code edit, not a config setting.** Adding a new
  connecting host means editing `mcp-server/src/index.ts` and redeploying.
- **No rate limiting or request logging beyond `docker logs classpilot-mcp`.**
  Treat the token with the same care as your ClassPilot login password.

## Troubleshooting

- **`401 Unauthorized`** — the `x-classpilot-mcp-key` header doesn't match
  `CLASSPILOT_MCP_TOKEN` in `.env`. Double check for trailing whitespace or
  a stale token after rotating it (rotating requires a container restart:
  `docker compose up -d` picks up the new `.env` value).
- **Connection refused / timeout** — confirm `CLASSPILOT_MCP_PORT` (default
  `3900`) is reachable from where you're connecting (firewall, Tailscale ACL,
  etc.), and that the `classpilot-mcp` container is actually running:
  `docker ps` should show it healthy.
- **Request rejected before auth even runs** — your connecting hostname
  isn't in `allowedHosts` (see step 2 above).
