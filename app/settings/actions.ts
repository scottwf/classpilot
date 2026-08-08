"use server";

import { redirect } from "next/navigation";
import { requireAuth } from "@/src/lib/auth/server";
import { getClassPilotDatabase } from "@/src/lib/db/classpilot-db";
import { deleteSchoolYear, setActiveSchoolYear } from "@/src/lib/db/planner-repository";
import { getAppSettings, updateAppSettings } from "@/src/lib/db/settings-repository";
import { listProviderModels } from "@/src/lib/ai/provider";
import { AiError } from "@/src/lib/ai/types";

export async function updateSettingsAction(formData: FormData) {
  await requireAuth();

  const db = getClassPilotDatabase();
  const current = getAppSettings(db);

  const submittedKey = String(formData.get("aiApiKey") ?? "").trim();
  const aiBaseUrl = String(formData.get("aiBaseUrl") ?? "").trim();
  const aiModel = String(formData.get("aiModel") ?? "").trim();
  const aiLocalBaseUrl = String(formData.get("aiLocalBaseUrl") ?? "").trim();
  const aiLocalModel = String(formData.get("aiLocalModel") ?? "").trim();

  updateAppSettings(db, {
    // The field is never pre-filled with the real secret (see SettingsPage),
    // so a blank submission means "didn't type a new one," not "remove it" —
    // keep the existing key. Use the separate clear action to actually unset it.
    aiApiKey: submittedKey || current.aiApiKey,
    aiBaseUrl,
    aiModel,
    aiLocalBaseUrl,
    aiLocalModel,
  });

  redirect("/settings?saved=1");
}

export type TestAiProviderResult = { ok: true; message: string } | { ok: false; error: string };

/**
 * Validates a provider/model pair from the Settings page before saving —
 * calls the provider's `/models` endpoint with the given (unsaved) values
 * and confirms the typed model ID is actually in the list, so a typo
 * surfaces immediately instead of only on the next "Draft with AI" click.
 *
 * `apiKey` is `undefined` for the local-provider test (no key concept —
 * never falls back to the hosted provider's saved key). For the hosted
 * test, an explicit blank string means "use whatever's already saved"
 * (mirrors updateSettingsAction, since the password field is never
 * pre-filled with the real secret).
 */
export async function testAiProviderAction(
  apiKey: string | undefined,
  baseUrl: string,
  model: string,
): Promise<TestAiProviderResult> {
  await requireAuth();

  const trimmedBaseUrl = baseUrl.trim().replace(/\/+$/, "");
  const trimmedModel = model.trim();

  if (!trimmedBaseUrl) {
    return { error: "Enter a base URL first.", ok: false };
  }

  if (!trimmedModel) {
    return { error: "Enter a model ID first.", ok: false };
  }

  const resolvedApiKey =
    apiKey === undefined ? "" : apiKey.trim() || getAppSettings(getClassPilotDatabase()).aiApiKey;

  let models: string[];
  try {
    models = await listProviderModels({ apiKey: resolvedApiKey, baseUrl: trimmedBaseUrl });
  } catch (error) {
    return {
      error: error instanceof AiError ? error.message : "Could not reach the provider.",
      ok: false,
    };
  }

  if (models.length === 0) {
    return {
      message: `Connected to ${trimmedBaseUrl}, but it didn't list any models — couldn't confirm "${trimmedModel}" specifically.`,
      ok: true,
    };
  }

  if (!models.includes(trimmedModel)) {
    return {
      error: `Connected to ${trimmedBaseUrl}, but "${trimmedModel}" isn't in its list of ${models.length} models. Check the exact model ID for this provider.`,
      ok: false,
    };
  }

  return { message: `Connected — "${trimmedModel}" is available.`, ok: true };
}

export async function clearAiApiKeyAction() {
  await requireAuth();

  const db = getClassPilotDatabase();
  const current = getAppSettings(db);

  updateAppSettings(db, { ...current, aiApiKey: "" });

  redirect("/settings?saved=1");
}

export async function switchSchoolYearAction(formData: FormData) {
  await requireAuth();

  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    redirect("/settings?error=year");
  }

  setActiveSchoolYear(getClassPilotDatabase(), id);

  redirect("/settings");
}

export async function deleteSchoolYearAction(formData: FormData) {
  await requireAuth();

  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    redirect("/settings?error=year");
  }

  try {
    deleteSchoolYear(getClassPilotDatabase(), id);
  } catch {
    redirect("/settings?error=delete-active-year");
  }

  redirect("/settings");
}
