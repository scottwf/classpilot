"use client";

type ResetPlannerDataButtonProps = {
  action: () => void | Promise<void>;
};

const confirmMessage = [
  "This permanently deletes every school year, class, schedule, unit,",
  "lesson, and student — everything except curriculum outcomes and your",
  "AI provider settings, which are kept.",
  "",
  "This can't be undone. Continue?",
].join("\n");

/**
 * Wraps resetPlannerDataAction with a native confirm() — the action itself
 * has no confirmation step, so this button is the only safe way to trigger
 * it. Deliberately not a fancier "type to confirm" flow: this is a
 * development-time tool (see Settings page copy), not a feature exposed to
 * end users day to day.
 */
export function ResetPlannerDataButton({ action }: ResetPlannerDataButtonProps) {
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
        className="rounded-md border border-rose-300 px-3 py-2 text-sm font-medium text-rose-700 shadow-sm hover:bg-rose-50"
        type="submit"
      >
        Reset all planner data
      </button>
    </form>
  );
}
