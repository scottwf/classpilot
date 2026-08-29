"use client";

type DeleteUnitButtonProps = {
  action: (formData: FormData) => void | Promise<void>;
  lessonCount: number;
  unitId: string;
  unitTitle: string;
};

/**
 * Wraps deleteUnitAction with a native confirm() -- the action itself has
 * no confirmation step, so this button is the only safe way to trigger it.
 * Same pattern as ResetPlannerDataButton. States exactly what gets removed
 * (the unit's lessons cascade-delete too, see deleteUnit in
 * planner-repository.ts) since that wasn't obvious from the plain "Delete
 * unit" button alone (issue #47).
 */
export function DeleteUnitButton({ action, lessonCount, unitId, unitTitle }: DeleteUnitButtonProps) {
  const confirmMessage =
    lessonCount > 0
      ? `Delete "${unitTitle}"? This also permanently deletes its ${lessonCount} lesson${lessonCount === 1 ? "" : "s"}, including any that are scheduled on the plan book. This can't be undone.`
      : `Delete "${unitTitle}"? This can't be undone.`;

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      <input name="id" type="hidden" value={unitId} />
      <button
        className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-400 shadow-sm hover:border-rose-300 hover:text-rose-600"
        type="submit"
      >
        Delete unit
      </button>
    </form>
  );
}
