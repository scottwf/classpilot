"use server";

import { redirect } from "next/navigation";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase } from "@/src/lib/db/classpilot-db";
import { getAppSettings, updateAppSettings } from "@/src/lib/db/settings-repository";

export async function updateSettingsAction(formData: FormData) {
  await requireAuth();

  const db = getClassPilotDatabase();
  const current = getAppSettings(db);

  const submittedKey = String(formData.get("aiApiKey") ?? "").trim();
  const aiBaseUrl = String(formData.get("aiBaseUrl") ?? "").trim();
  const aiModel = String(formData.get("aiModel") ?? "").trim();

  updateAppSettings(db, {
    // The field is never pre-filled with the real secret (see SettingsPage),
    // so a blank submission means "didn't type a new one," not "remove it" —
    // keep the existing key. Use the separate clear action to actually unset it.
    aiApiKey: submittedKey || current.aiApiKey,
    aiBaseUrl,
    aiModel,
  });

  redirect("/settings?saved=1");
}

export async function clearAiApiKeyAction() {
  await requireAuth();

  const db = getClassPilotDatabase();
  const current = getAppSettings(db);

  updateAppSettings(db, { ...current, aiApiKey: "" });

  redirect("/settings?saved=1");
}
