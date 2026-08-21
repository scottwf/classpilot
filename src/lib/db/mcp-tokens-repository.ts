import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { ClassPilotDatabase } from "./sqlite";

export type McpTokenSummary = {
  id: string;
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

type McpTokenRow = {
  id: string;
  label: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

function mapToken(row: McpTokenRow): McpTokenSummary {
  return {
    id: row.id,
    label: row.label,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    revokedAt: row.revoked_at,
  };
}

// A token is high-entropy random data, not a human-chosen password, so a
// fast digest (not scrypt) is the right tool here -- same reasoning as
// verifyAppPassword/verifyCalendarToken in secrets.ts, both SHA-256.
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Creates a new MCP auth token for userId. Returns the plaintext token --
 * this is the ONLY time it's ever available; only its hash is stored, so
 * losing it means generating a new one, not recovering the old one.
 */
export function createMcpToken(
  db: ClassPilotDatabase,
  userId: string,
  label: string,
): { id: string; token: string } {
  const id = `mcptok-${randomUUID()}`;
  const token = `mcp_${randomBytes(32).toString("hex")}`;
  const createdAt = new Date().toISOString();

  db.prepare(
    "INSERT INTO mcp_tokens (id, user_id, label, token_hash, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(id, userId, label, hashToken(token), createdAt);

  return { id, token };
}

export function listMcpTokens(db: ClassPilotDatabase, userId: string): McpTokenSummary[] {
  const rows = db
    .prepare(
      "SELECT id, label, created_at, last_used_at, revoked_at FROM mcp_tokens WHERE user_id = ? ORDER BY created_at",
    )
    .all(userId) as McpTokenRow[];

  return rows.map(mapToken);
}

export function revokeMcpToken(db: ClassPilotDatabase, userId: string, tokenId: string): void {
  const result = db
    .prepare(
      "UPDATE mcp_tokens SET revoked_at = ? WHERE id = ? AND user_id = ? AND revoked_at IS NULL",
    )
    .run(new Date().toISOString(), tokenId, userId);

  if (result.changes === 0) {
    throw new Error(`MCP token not found: ${tokenId}`);
  }
}

/**
 * Resolves a presented token to its owning userId, or undefined if it
 * doesn't match any non-revoked token. Stamps last_used_at on a
 * successful match. This is the MCP server's entire auth check — see
 * mcp-server/src/index.ts's requireAuth middleware, which is the only
 * caller outside tests.
 */
export function resolveMcpToken(
  db: ClassPilotDatabase,
  token: string,
): { userId: string } | undefined {
  const row = db
    .prepare("SELECT id, user_id FROM mcp_tokens WHERE token_hash = ? AND revoked_at IS NULL")
    .get(hashToken(token)) as { id: string; user_id: string } | undefined;

  if (!row) {
    return undefined;
  }

  db.prepare("UPDATE mcp_tokens SET last_used_at = ? WHERE id = ?").run(
    new Date().toISOString(),
    row.id,
  );

  return { userId: row.user_id };
}
