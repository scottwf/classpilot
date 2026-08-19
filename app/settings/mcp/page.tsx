import { AppShell } from "@/src/features/planner/AppShell";
import { McpTokensPage } from "@/src/features/planner/McpTokensPage";
import { SettingsTabs } from "@/src/features/planner/SettingsTabs";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase, getClassPilotPlannerData } from "@/src/lib/db/classpilot-db";
import { listMcpTokens } from "@/src/lib/db/mcp-tokens-repository";
import { revokeMcpTokenAction } from "./actions";

export const dynamic = "force-dynamic";

// Same public URL as the web app, at the /mcp path -- Caddy (CPM proxy
// host id 49) routes /mcp* to the classpilot-mcp container's port
// separately from everything else, which goes to the main app. Falls back
// to the direct host:3900 form when NEXT_PUBLIC_APP_URL isn't set (e.g.
// local dev), matching the pre-public-routing setup documented in
// docs/MCP-SETUP.md.
function deriveMcpUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    return "http://<your-host>:3900/mcp";
  }

  try {
    return new URL("/mcp", appUrl).toString();
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
