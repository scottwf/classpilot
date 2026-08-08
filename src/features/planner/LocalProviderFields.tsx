"use client";

import { useRef } from "react";
import { TestProviderButton } from "./TestProviderButton";

type LocalProviderFieldsProps = {
  aiLocalBaseUrl: string;
  aiLocalModel: string;
};

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

export function LocalProviderFields({ aiLocalBaseUrl, aiLocalModel }: LocalProviderFieldsProps) {
  const baseUrlRef = useRef<HTMLInputElement>(null);
  const modelRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-4">
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Base URL</span>
        <input
          className={inputClass}
          defaultValue={aiLocalBaseUrl}
          name="aiLocalBaseUrl"
          placeholder="http://localhost:11434/v1 (Ollama, LM Studio, ...)"
          ref={baseUrlRef}
          type="text"
        />
        <span className="mt-1 block text-xs leading-5 text-slate-500">
          No API key needed. Without this configured, the assistant chat
          can&apos;t access student records at all.
        </span>
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Model</span>
        <input
          className={inputClass}
          defaultValue={aiLocalModel}
          name="aiLocalModel"
          placeholder="e.g. llama3.1, qwen2.5 — needs tool-calling support"
          ref={modelRef}
          type="text"
        />
      </label>

      <TestProviderButton
        getBaseUrl={() => baseUrlRef.current?.value ?? ""}
        getModel={() => modelRef.current?.value ?? ""}
      />
    </div>
  );
}
