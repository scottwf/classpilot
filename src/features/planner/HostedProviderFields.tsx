"use client";

import { useRef, useState } from "react";
import { TestProviderButton } from "./TestProviderButton";

type HostedProviderFieldsProps = {
  aiApiKeySet: boolean;
  aiBaseUrl: string;
  aiModel: string;
};

type ProviderPreset = {
  id: string;
  label: string;
  baseUrl: string;
  modelPlaceholder: string;
};

const presets: ProviderPreset[] = [
  {
    baseUrl: "https://api.openai.com/v1",
    id: "openai",
    label: "OpenAI",
    modelPlaceholder: "gpt-4o-mini",
  },
  {
    baseUrl: "https://openrouter.ai/api/v1",
    id: "openrouter",
    label: "OpenRouter (Claude, Gemini, Llama, and more)",
    modelPlaceholder: "anthropic/claude-3.5-sonnet",
  },
  {
    baseUrl: "https://api.deepseek.com/v1",
    id: "deepseek",
    label: "DeepSeek",
    modelPlaceholder: "deepseek-chat",
  },
  {
    baseUrl: "",
    id: "custom",
    label: "Custom (other OpenAI-compatible endpoint)",
    modelPlaceholder: "",
  },
];

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

function presetForBaseUrl(baseUrl: string): ProviderPreset {
  const normalized = baseUrl.trim().replace(/\/+$/, "");
  return (
    presets.find((preset) => preset.baseUrl === normalized) ??
    presets[presets.length - 1]
  );
}

/**
 * Anthropic's own API (api.anthropic.com) isn't offered as a preset here —
 * it uses a different request/response shape than the OpenAI-compatible
 * `/chat/completions` this app's AI layer speaks (see provider.ts/chat.ts).
 * Claude models are reachable through OpenRouter instead, which is
 * OpenAI-compatible.
 */
export function HostedProviderFields({
  aiApiKeySet,
  aiBaseUrl,
  aiModel,
}: HostedProviderFieldsProps) {
  const initialPreset = presetForBaseUrl(aiBaseUrl);
  const [presetId, setPresetId] = useState(initialPreset.id);
  const [customBaseUrl, setCustomBaseUrl] = useState(
    initialPreset.id === "custom" ? aiBaseUrl : "",
  );

  const selectedPreset = presets.find((preset) => preset.id === presetId) ?? presets[0];
  const effectiveBaseUrl = presetId === "custom" ? customBaseUrl : selectedPreset.baseUrl;

  const apiKeyRef = useRef<HTMLInputElement>(null);
  const modelRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-4">
      <label className="block text-sm">
        <span className="font-medium text-slate-700">API key</span>
        <input
          autoComplete="off"
          className={inputClass}
          name="aiApiKey"
          placeholder={
            aiApiKeySet
              ? "•••••••••••••••• (set — leave blank to keep it)"
              : "sk-..."
          }
          ref={apiKeyRef}
          type="password"
        />
        <span className="mt-1 block text-xs leading-5 text-slate-500">
          Never shown again once saved — leave blank on future saves to keep
          it, or use <span className="font-medium">Clear key</span> below to
          remove it.
        </span>
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Provider</span>
        <select
          className={inputClass}
          onChange={(event) => setPresetId(event.target.value)}
          value={presetId}
        >
          {presets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
        </select>
      </label>

      {presetId === "custom" ? (
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Base URL</span>
          <input
            className={inputClass}
            name="aiBaseUrl"
            onChange={(event) => setCustomBaseUrl(event.target.value)}
            placeholder="https://your-provider.example.com/v1"
            type="text"
            value={customBaseUrl}
          />
        </label>
      ) : (
        <input name="aiBaseUrl" type="hidden" value={effectiveBaseUrl} />
      )}

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Model</span>
        <input
          className={inputClass}
          defaultValue={aiModel}
          name="aiModel"
          placeholder={selectedPreset.modelPlaceholder || "model name"}
          ref={modelRef}
          type="text"
        />
      </label>

      <TestProviderButton
        getApiKey={() => apiKeyRef.current?.value ?? ""}
        getBaseUrl={() => effectiveBaseUrl}
        getModel={() => modelRef.current?.value ?? ""}
      />
    </div>
  );
}
