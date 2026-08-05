import { decryptField, encryptField } from "@/src/lib/crypto/field-cipher";
import type { ClassPilotDatabase } from "./sqlite";

const settingsId = "current";

export type AppSettings = {
  aiApiKey: string;
  aiBaseUrl: string;
  aiModel: string;
};

type AppSettingsRow = {
  ai_api_key_encrypted: string;
  ai_base_url: string;
  ai_model: string;
};

const emptySettings: AppSettings = {
  aiApiKey: "",
  aiBaseUrl: "",
  aiModel: "",
};

/**
 * Reads the single-row app settings, decrypting the AI API key. Returns
 * all-empty settings (never throws) when the row doesn't exist yet — unlike
 * school_years, this table has no seed step, since settings are optional.
 */
export function getAppSettings(db: ClassPilotDatabase): AppSettings {
  const row = db
    .prepare(
      "SELECT ai_api_key_encrypted, ai_base_url, ai_model FROM app_settings WHERE id = ?",
    )
    .get(settingsId) as AppSettingsRow | undefined;

  if (!row) {
    return emptySettings;
  }

  return {
    aiApiKey: decryptField(row.ai_api_key_encrypted),
    aiBaseUrl: row.ai_base_url,
    aiModel: row.ai_model,
  };
}

export function updateAppSettings(db: ClassPilotDatabase, input: AppSettings): void {
  db.prepare(
    `INSERT INTO app_settings (id, ai_api_key_encrypted, ai_base_url, ai_model)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       ai_api_key_encrypted = excluded.ai_api_key_encrypted,
       ai_base_url = excluded.ai_base_url,
       ai_model = excluded.ai_model`,
  ).run(settingsId, encryptField(input.aiApiKey), input.aiBaseUrl, input.aiModel);
}
