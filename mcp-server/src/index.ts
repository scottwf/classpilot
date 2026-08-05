import type { NextFunction, Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { registerClassPilotTools } from "./tools.ts";

const PORT = Number(process.env.PORT ?? 3900);
const AUTH_TOKEN = process.env.CLASSPILOT_MCP_TOKEN;

if (!AUTH_TOKEN) {
  throw new Error("CLASSPILOT_MCP_TOKEN must be set.");
}

function buildServer() {
  const server = new McpServer({
    name: "classpilot",
    version: "0.1.0",
  });
  registerClassPilotTools(server);
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
  ],
});

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const provided = req.header("x-classpilot-mcp-key");
  if (provided !== AUTH_TOKEN) {
    res.status(401).json({
      jsonrpc: "2.0",
      error: { code: -32001, message: "Unauthorized" },
      id: null,
    });
    return;
  }
  next();
}

app.post("/mcp", requireAuth, async (req, res) => {
  try {
    const server = buildServer();
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
