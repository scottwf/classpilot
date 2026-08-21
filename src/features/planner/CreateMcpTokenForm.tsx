"use client";

import { useState } from "react";
import { createMcpTokenAction } from "@/app/settings/mcp/actions";

/**
 * Calls createMcpTokenAction directly (not a <form action>) so the fresh
 * plaintext token can be shown here once, client-side, without ever
 * passing through a URL or redirect -- see createMcpToken's doc comment:
 * only the hash is stored, so this is the only chance to see it.
 */
export function CreateMcpTokenForm() {
  const [label, setLabel] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleCreate() {
    setIsCreating(true);
    setError(null);

    const result = await createMcpTokenAction(label);

    setIsCreating(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setCreatedToken(result.token);
    setLabel("");
  }

  async function handleCopy() {
    if (!createdToken) return;
    await navigator.clipboard.writeText(createdToken);
    setCopied(true);
  }

  if (createdToken) {
    return (
      <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-medium text-amber-900">
          Copy this token now — you won&apos;t be able to see it again. If you lose it,
          revoke it below and create a new one.
        </p>
        <code className="block break-all rounded-md bg-white px-3 py-2 text-xs text-slate-950">
          {createdToken}
        </code>
        <div className="flex items-center gap-3">
          <button
            className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 shadow-sm hover:bg-amber-100"
            onClick={handleCopy}
            type="button"
          >
            {copied ? "Copied" : "Copy to clipboard"}
          </button>
          <button
            className="text-xs font-medium text-amber-800 underline"
            onClick={() => {
              setCreatedToken(null);
              setCopied(false);
            }}
            type="button"
          >
            Done, hide it
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Label</span>
        <input
          className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Claude Code"
          type="text"
          value={label}
        />
      </label>
      <button
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-60"
        disabled={isCreating || !label.trim()}
        onClick={handleCreate}
        type="button"
      >
        {isCreating ? "Creating…" : "Create token"}
      </button>
      {error ? <p className="w-full text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
