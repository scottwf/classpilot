import { AppShell } from "@/src/features/planner/AppShell";
import { McpTokensPage } from "@/src/features/planner/McpTokensPage";
import { SettingsTabs } from "@/src/features/planner/SettingsTabs";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase, getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { listMcpTokens } from "@/src/lib/db/mcp-tokens-repository";
import { revokeMcpTokenAction } from "./actions";

export const dynamic = "force-dynamic";

// Same host as the web app, different port -- see docs/MCP-SETUP.md. No
// dedicated env var for this exists yet, so it's derived from
// NEXT_PUBLIC_APP_URL's hostname rather than adding a new one just for
// display purposes.
function deriveMcpUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    return "http://<your-host>:3900/mcp";
  }

  try {
    const hostname = new URL(appUrl).hostname;
    return `http://${hostname}:3900/mcp`;
  } catch {
    return "http://<your-host>:3900/mcp";
  }
}

export default async function McpSettingsRoute() {
  const userId = await requireAuth();

  const db = getClassPilotDatabase();
  const plannerData = getClassPilotPlannerData(userId);
  const tokens = listMcpTokens(db, userId);

  return (
    <AppShell activePage="settings" data={plannerData}>
      <SettingsTabs active="mcp" />
      <McpTokensPage mcpUrl={deriveMcpUrl()} revokeTokenAction={revokeMcpTokenAction} tokens={tokens} />
    </AppShell>
  );
}
