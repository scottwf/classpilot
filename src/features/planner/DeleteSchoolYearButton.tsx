"use client";

type DeleteSchoolYearButtonProps = {
  action: (formData: FormData) => void | Promise<void>;
  yearId: string;
  yearTitle: string;
};

/**
 * Wraps deleteSchoolYearAction with a native confirm() (issue #37) -- the
 * action itself has no confirmation step, so this button is the only safe
 * way to trigger it. The action always takes a full-database safety
 * backup before deleting anything (see backupBeforeSchoolYearDelete), but
 * that backup lives on disk, not somewhere a teacher can browse from the
 * app -- worth being upfront about that in the confirmation text rather
 * than implying "undo" is one click away.
 */
export function DeleteSchoolYearButton({ action, yearId, yearTitle }: DeleteSchoolYearButtonProps) {
  const confirmMessage = [
    `Delete "${yearTitle}"?`,
    "",
    "This permanently removes its classes, units, lessons, schedule, and",
    "students. A safety backup of the whole database is saved on the",
    "server first, but restoring from it isn't something you can do from",
    "this app -- it would need a manual restore.",
    "",
    "Continue?",
  ].join("\n");

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      <input name="id" type="hidden" value={yearId} />
      <button className="text-xs font-medium text-slate-400 hover:text-rose-600" type="submit">
        Delete year
      </button>
    </form>
  );
}
