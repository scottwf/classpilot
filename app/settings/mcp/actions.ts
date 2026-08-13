"use server";

import { redirect } from "next/navigation";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase } from "@/src/lib/db/classpilot-db";
import { createMcpToken, revokeMcpToken } from "@/src/lib/db/mcp-tokens-repository";

export type CreateMcpTokenResult =
  | { ok: true; id: string; token: string }
  | { ok: false; error: string };

/**
 * Creates a new MCP token for the signed-in user. Called directly from a
 * client component (CreateMcpTokenForm), not a <form action>, so the
 * plaintext token can be returned straight to the caller and shown once --
 * see createMcpToken's doc comment for why it can never be shown again
 * after this.
 */
export async function createMcpTokenAction(label: string): Promise<CreateMcpTokenResult> {
  const userId = await requireAuth();

  const trimmedLabel = label.trim();

  if (!trimmedLabel) {
    return { ok: false, error: "Give the token a label, e.g. \"Claude Code\" or \"ChatGPT\"." };
  }

  const db = getClassPilotDatabase();
  const { id, token } = createMcpToken(db, userId, trimmedLabel);

  return { ok: true, id, token };
}

export async function revokeMcpTokenAction(formData: FormData) {
  const userId = await requireAuth();

  const id = String(formData.get("id") ?? "").trim();

  if (id) {
    revokeMcpToken(getClassPilotDatabase(), userId, id);
  }

  redirect("/settings/mcp");
}
