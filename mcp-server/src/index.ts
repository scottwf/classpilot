import type { NextFunction, Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { registerClassPilotTools } from "./tools.ts";
import { getDb } from "./db.ts";
import { resolveMcpToken } from "../../src/lib/db/mcp-tokens-repository.ts";

const PORT = Number(process.env.PORT ?? 3900);

function buildServer(userId: string) {
  const server = new McpServer({
    name: "classpilot",
    version: "0.1.0",
  });
  registerClassPilotTools(server, userId);
  return server;
}

const app = createMcpExpressApp({
  host: "0.0.0.0",
  allowedHosts: [
    "172.16.1.140",
    "localhost",
    "127.0.0.1",
    "echo",
    "echo.tail00bf7.ts.net",
    // Reached via the public domain's /mcp* path, proxied here by Caddy
    // (CPM proxy host id 49) -- Host header stays classpilot.woods-fehr.ca
    // even though the request lands on this container's own port.
    "classpilot.woods-fehr.ca",
  ],
});

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

type AuthedRequest = Request & { userId?: string };

// Per-user token auth (issue #21 Phase 4), replacing the single shared
// CLASSPILOT_MCP_TOKEN env var everyone used to get full read/write access
// to every teacher's data. Tokens are created/revoked from Settings > MCP
// Tokens in the app; see src/lib/db/mcp-tokens-repository.ts for the
// hash-at-rest storage and resolution logic.
function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const provided = req.header("x-classpilot-mcp-key");
  const resolved = provided ? resolveMcpToken(getDb(), provided) : undefined;

  if (!resolved) {
    res.status(401).json({
      jsonrpc: "2.0",
      error: { code: -32001, message: "Unauthorized" },
      id: null,
    });
    return;
  }

  req.userId = resolved.userId;
  next();
}

app.post("/mcp", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const server = buildServer(req.userId!);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    res.on("close", () => {
      transport.close();
      server.close();
    });
  } catch (error) {
    console.error("Error handling MCP request:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});

app.get("/mcp", requireAuth, (_req, res) => {
  res.writeHead(405).end(
    JSON.stringify({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed." },
      id: null,
    }),
  );
});

app.delete("/mcp", requireAuth, (_req, res) => {
  res.writeHead(405).end(
    JSON.stringify({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed." },
      id: null,
    }),
  );
});

app.listen(PORT, () => {
  console.log(`ClassPilot MCP server listening on port ${PORT}`);
});
