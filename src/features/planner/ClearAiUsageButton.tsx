"use client";

type ClearAiUsageButtonProps = {
  action: () => void | Promise<void>;
};

const confirmMessage = [
  "This clears the AI token usage history — call counts, token totals, and",
  "cost estimates. Nothing else is affected: your provider settings, plans,",
  "and student data are untouched.",
  "",
  "This can't be undone. Continue?",
].join("\n");

/**
 * Wraps clearAiUsageAction with a native confirm(), matching
 * ResetPlannerDataButton — the action has no confirmation of its own.
 * Low-stakes compared to that one (it only deletes counters), but still
 * irreversible, so it asks.
 */
export function ClearAiUsageButton({ action }: ClearAiUsageButtonProps) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      <button
        className="text-xs font-medium text-slate-400 hover:text-rose-600"
        type="submit"
      >
        Clear usage history
      </button>
    </form>
  );
}
