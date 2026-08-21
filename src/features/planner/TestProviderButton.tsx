"use client";

import { useState } from "react";
import { testAiProviderAction } from "@/app/settings/actions";

type TestProviderButtonProps = {
  /** Omit for the local provider — no API key field there. */
  getApiKey?: () => string;
  getBaseUrl: () => string;
  getModel: () => string;
};

/**
 * Validates the live (possibly unsaved) provider/model values against the
 * provider's /models endpoint, so a typo'd model ID surfaces here instead
 * of only on the next "Draft with AI" click. Reads values via getter
 * functions (backed by refs/state in the caller) rather than plain props
 * so it always sees what's currently typed, not a stale snapshot.
 */
export function TestProviderButton({ getApiKey, getBaseUrl, getModel }: TestProviderButtonProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleTest() {
    setIsTesting(true);
    setResult(null);

    const response = await testAiProviderAction(getApiKey?.(), getBaseUrl(), getModel());

    setIsTesting(false);
    setResult(
      response.ok ? { ok: true, text: response.message } : { ok: false, text: response.error },
    );
  }

  return (
    <div className="mt-2">
      <button
        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
        disabled={isTesting}
        onClick={handleTest}
        type="button"
      >
        {isTesting ? "Testing…" : "Test connection"}
      </button>
      {result ? (
        <p className={`mt-1.5 text-xs ${result.ok ? "text-emerald-700" : "text-rose-700"}`}>
          {result.text}
        </p>
      ) : null}
    </div>
  );
}
