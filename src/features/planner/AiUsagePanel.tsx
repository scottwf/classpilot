import type {
  AiUsageEntry,
  AiUsageSummary,
  AiUsageTotals,
} from "@/src/lib/db/ai-usage-repository";
import type { AiUsagePurpose } from "@/src/lib/ai/types";
import { ClearAiUsageButton } from "./ClearAiUsageButton";

type AiUsagePanelProps = {
  summary: AiUsageSummary;
  recent: AiUsageEntry[];
  clearUsageAction: () => void | Promise<void>;
};

/** Human labels for the purposes recorded by recordAiUsage — keeps the raw
 * snake_case identifiers out of the teacher-facing table. */
const purposeLabels: Record<AiUsagePurpose, string> = {
  assistant_chat: "Assistant chat",
  dictation_draft: "Dictation drafts",
  lesson_resource: "Lesson resources",
  lesson_sections: "Lesson sections",
  unit_outline: "Unit outlines",
};

function formatTokens(count: number): string {
  return count.toLocaleString("en-CA");
}

/**
 * Cost is an estimate from a hand-maintained price table (see pricing.ts),
 * so sub-cent precision would imply accuracy that isn't there — but showing
 * "$0.00" for a real charge is worse. Small amounts get more decimals.
 */
function formatCost(totals: AiUsageTotals): string {
  if (totals.costUsd === 0) {
    return totals.unpricedCalls > 0 ? "—" : "$0.00";
  }

  return totals.costUsd < 0.01 ? `$${totals.costUsd.toFixed(4)}` : `$${totals.costUsd.toFixed(2)}`;
}

function formatTimestamp(iso: string): string {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime())
    ? iso
    : parsed.toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" });
}

function TotalsCard({ label, totals }: { label: string; totals: AiUsageTotals }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-950">
        {formatTokens(totals.totalTokens)}
        <span className="ml-1 text-xs font-normal text-slate-500">tokens</span>
      </p>
      <p className="mt-0.5 text-xs text-slate-500">
        {totals.calls} {totals.calls === 1 ? "call" : "calls"} · {formatCost(totals)}
      </p>
    </div>
  );
}

/**
 * Token usage and estimated cost for the configured AI providers (issue
 * #28). Read-only apart from the clear button. Global, not per-user, for
 * the same reason the provider settings above it are — see recordAiUsage.
 */
export function AiUsagePanel({ summary, recent, clearUsageAction }: AiUsagePanelProps) {
  const hasUsage = summary.allTime.calls > 0;

  return (
    <section className="max-w-2xl rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">Token usage</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Every drafting and assistant-chat call, counted. Costs are
            estimates from a built-in price list and only cover the hosted
            provider — local model calls are free, but still counted here so
            you can see how hard they&apos;re being worked.
          </p>
        </div>
        {hasUsage ? <ClearAiUsageButton action={clearUsageAction} /> : null}
      </div>

      {!hasUsage ? (
        <p className="mt-4 rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-500">
          No AI calls recorded yet. Draft a unit outline or open the assistant
          chat, and usage will show up here.
        </p>
      ) : (
        <>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <TotalsCard label="Last 7 days" totals={summary.last7Days} />
            <TotalsCard label="Last 30 days" totals={summary.last30Days} />
            <TotalsCard label="All time" totals={summary.allTime} />
          </div>

          {summary.allTime.unpricedCalls > 0 ? (
            <p className="mt-2 text-xs text-amber-700">
              {summary.allTime.unpricedCalls} of {summary.allTime.calls} calls
              used a model with no price in the built-in list, so the cost
              estimate above is a floor, not a total.
            </p>
          ) : null}

          <div className="mt-6">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              By model
            </h4>
            <table className="mt-2 w-full text-left text-sm">
              <thead>
                <tr className="text-xs font-medium text-slate-500">
                  <th className="py-1 pr-2 font-medium">Model</th>
                  <th className="py-1 pr-2 text-right font-medium">Calls</th>
                  <th className="py-1 pr-2 text-right font-medium">Tokens</th>
                  <th className="py-1 text-right font-medium">Est. cost</th>
                </tr>
              </thead>
              <tbody>
                {summary.byModel.map((row) => (
                  <tr className="border-t border-slate-100" key={`${row.provider}-${row.model}`}>
                    <td className="py-1.5 pr-2 text-slate-800">
                      {row.model}
                      <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                        {row.provider}
                      </span>
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums text-slate-600">
                      {row.calls}
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums text-slate-600">
                      {formatTokens(row.totalTokens)}
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-slate-600">
                      {formatCost(row)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              By feature
            </h4>
            <table className="mt-2 w-full text-left text-sm">
              <thead>
                <tr className="text-xs font-medium text-slate-500">
                  <th className="py-1 pr-2 font-medium">Feature</th>
                  <th className="py-1 pr-2 text-right font-medium">Calls</th>
                  <th className="py-1 text-right font-medium">Tokens</th>
                </tr>
              </thead>
              <tbody>
                {summary.byPurpose.map((row) => (
                  <tr className="border-t border-slate-100" key={row.purpose}>
                    <td className="py-1.5 pr-2 text-slate-800">
                      {purposeLabels[row.purpose] ?? row.purpose}
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums text-slate-600">
                      {row.calls}
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-slate-600">
                      {formatTokens(row.totalTokens)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <details className="mt-6">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-500">
              Recent calls ({recent.length})
            </summary>
            <table className="mt-2 w-full text-left text-sm">
              <thead>
                <tr className="text-xs font-medium text-slate-500">
                  <th className="py-1 pr-2 font-medium">When</th>
                  <th className="py-1 pr-2 font-medium">Feature</th>
                  <th className="py-1 pr-2 text-right font-medium">In</th>
                  <th className="py-1 text-right font-medium">Out</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((entry) => (
                  <tr className="border-t border-slate-100" key={entry.id}>
                    <td className="py-1.5 pr-2 text-slate-600">
                      {formatTimestamp(entry.occurredAt)}
                    </td>
                    <td className="py-1.5 pr-2 text-slate-800">
                      {purposeLabels[entry.purpose] ?? entry.purpose}
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums text-slate-600">
                      {formatTokens(entry.promptTokens)}
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-slate-600">
                      {formatTokens(entry.completionTokens)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </section>
  );
}
