"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ClassSection, CurriculumOutcome } from "./types";
import type { UnitOutlineDraft } from "@/src/lib/ai/types";
import type {
  AssistantFormValues,
  AssistantState,
  assistantAction,
} from "@/app/assistant/actions";

type AssistantPageProps = {
  outcomes: CurriculumOutcome[];
  subjects: string[];
  classes: ClassSection[];
  startDate: string;
  aiConfigured: boolean;
  action: typeof assistantAction;
};

const unitColors = ["blue", "emerald", "amber", "rose", "violet"] as const;

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

const initialState: AssistantState = { status: "idle" };

export function AssistantPage({
  outcomes,
  subjects,
  classes,
  startDate,
  aiConfigured,
  action,
}: AssistantPageProps) {
  const [state, formAction] = useActionState(action, initialState);
  const values = state.status === "idle" ? undefined : state.values;

  return (
    <>
      <section>
        <p className="text-sm font-medium text-blue-700">AI assistant</p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-950">
          Draft a unit outline.
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Describe the unit and pick the outcomes to cover. The assistant drafts
          a sequence of lessons, assessment ideas, and differentiation notes.
          You stay in control — it suggests, you approve and edit. Only
          curriculum and timing details are sent; student records are never
          included.
        </p>
      </section>

      {!aiConfigured ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          The AI assistant is not configured yet. Set{" "}
          <code className="font-mono">CLASSPILOT_AI_API_KEY</code> (or{" "}
          <code className="font-mono">CLASSPILOT_AI_BASE_URL</code> for a local
          model) and restart to enable drafting.
        </p>
      ) : null}

      {state.status === "error" ? (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {state.error}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <form action={formAction} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Subject</span>
                <input
                  className={inputClass}
                  defaultValue={values?.subject ?? subjects[0] ?? ""}
                  list="assistant-subjects"
                  name="subject"
                  required
                />
                <datalist id="assistant-subjects">
                  {subjects.map((subject) => (
                    <option key={subject} value={subject} />
                  ))}
                </datalist>
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Grade</span>
                <input
                  className={inputClass}
                  defaultValue={values?.grade ?? "6"}
                  name="grade"
                />
              </label>
            </div>

            <label className="block text-sm">
              <span className="font-medium text-slate-700">Unit focus</span>
              <input
                className={inputClass}
                defaultValue={values?.unitFocus ?? ""}
                name="unitFocus"
                placeholder="e.g. Electricity, Persuasive writing"
                required
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Weeks</span>
                <input
                  className={inputClass}
                  defaultValue={values?.weeks ?? 4}
                  max={60}
                  min={1}
                  name="weeks"
                  type="number"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Lessons/wk</span>
                <input
                  className={inputClass}
                  defaultValue={values?.lessonsPerWeek ?? 3}
                  max={10}
                  min={1}
                  name="lessonsPerWeek"
                  type="number"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Minutes</span>
                <input
                  className={inputClass}
                  defaultValue={values?.lessonMinutes ?? 45}
                  max={240}
                  min={5}
                  name="lessonMinutes"
                  type="number"
                />
              </label>
            </div>

            <label className="block text-sm">
              <span className="font-medium text-slate-700">
                Teaching preferences{" "}
                <span className="font-normal text-slate-400">(optional)</span>
              </span>
              <textarea
                className={inputClass}
                defaultValue={values?.teachingNotes ?? ""}
                name="teachingNotes"
                placeholder="e.g. Hands-on, lots of small experiments, group work."
                rows={3}
              />
            </label>

            <label className="block text-sm">
              <span className="font-medium text-slate-700">
                Outcomes to cover{" "}
                <span className="font-normal text-slate-400">
                  (Cmd/Ctrl-click to select several)
                </span>
              </span>
              <select
                className={`${inputClass} h-40`}
                defaultValue={values?.outcomeIds ?? []}
                multiple
                name="outcomeIds"
              >
                {outcomes.map((outcome) => (
                  <option key={outcome.id} value={outcome.id}>
                    {outcome.code} · {outcome.subject} — {outcome.description}
                  </option>
                ))}
              </select>
            </label>

            <SubmitButton disabled={!aiConfigured} />
          </form>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          {state.status === "success" ? (
            <div className="space-y-5">
              <DraftView draft={state.draft} />
              <SaveDraftForm
                classes={classes}
                draft={state.draft}
                formAction={formAction}
                saveError={state.saveError}
                startDate={startDate}
                values={state.values}
              />
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              The drafted unit outline will appear here. Review and edit it, then
              create a unit and lessons from the ideas you like.
            </p>
          )}
        </section>
      </div>
    </>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-300"
      disabled={disabled || pending}
      type="submit"
    >
      {pending ? "Drafting…" : "Draft unit outline"}
    </button>
  );
}

function SaveDraftForm({
  classes,
  draft,
  formAction,
  saveError,
  startDate,
  values,
}: {
  classes: ClassSection[];
  draft: UnitOutlineDraft;
  formAction: (formData: FormData) => void;
  saveError?: string;
  startDate: string;
  values: AssistantFormValues;
}) {
  const lessonCount = draft.lessonSequence.length;

  return (
    <form
      action={formAction}
      className="space-y-3 border-t border-slate-200 pt-4"
    >
      <h4 className="text-sm font-semibold text-slate-950">Save to planner</h4>
      <p className="text-xs leading-5 text-slate-500">
        Creates a unit and {lessonCount}{" "}
        {lessonCount === 1 ? "lesson" : "lessons"}, scheduled from the start date
        across instructional days (weekends and non-instructional days skipped).
        You can edit everything afterward.
      </p>

      {saveError ? (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {saveError}
        </p>
      ) : null}

      <input name="intent" type="hidden" value="save" />
      <input name="draft" type="hidden" value={JSON.stringify(draft)} />
      <input name="subject" type="hidden" value={values.subject} />
      <input name="grade" type="hidden" value={values.grade} />
      <input name="unitFocus" type="hidden" value={values.unitFocus} />
      <input name="weeks" type="hidden" value={values.weeks} />
      <input name="lessonsPerWeek" type="hidden" value={values.lessonsPerWeek} />
      <input name="lessonMinutes" type="hidden" value={values.lessonMinutes} />
      <input name="teachingNotes" type="hidden" value={values.teachingNotes} />
      {values.outcomeIds.map((id) => (
        <input key={id} name="outcomeIds" type="hidden" value={id} />
      ))}

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Class</span>
          <select className={inputClass} defaultValue={classes[0]?.id} name="classId">
            {classes.map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Start date</span>
          <input
            className={inputClass}
            defaultValue={startDate}
            name="startDate"
            type="date"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Color</span>
          <select className={inputClass} defaultValue="violet" name="color">
            {unitColors.map((color) => (
              <option key={color} value={color}>
                {color}
              </option>
            ))}
          </select>
        </label>
      </div>

      <SaveButton disabled={classes.length === 0 || lessonCount === 0} />
    </form>
  );
}

function SaveButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-300"
      disabled={disabled || pending}
      type="submit"
    >
      {pending ? "Saving…" : "Save as unit + lessons"}
    </button>
  );
}

function DraftView({ draft }: { draft: UnitOutlineDraft }) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-slate-950">{draft.title}</h3>
        <p className="mt-1 text-xs text-slate-500">
          AI draft — review and edit before using.
        </p>
      </div>

      <Bullets title="Big ideas" items={draft.bigIdeas} />
      <Bullets title="Essential questions" items={draft.essentialQuestions} />

      {draft.lessonSequence.length > 0 ? (
        <div>
          <h4 className="text-sm font-semibold text-slate-950">
            Lesson sequence
          </h4>
          <ol className="mt-2 space-y-2">
            {draft.lessonSequence.map((lesson, index) => (
              <li
                className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                key={`${lesson.title}-${index}`}
              >
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold text-slate-400">
                    {index + 1}
                  </span>
                  <span className="font-medium text-slate-950">
                    {lesson.title}
                  </span>
                </div>
                {lesson.focus ? (
                  <p className="mt-1 text-slate-600">{lesson.focus}</p>
                ) : null}
                {lesson.outcomeCodes.length > 0 ? (
                  <p className="mt-1 text-xs text-blue-700">
                    {lesson.outcomeCodes.join(", ")}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <Bullets title="Assessment ideas" items={draft.assessmentIdeas} />
      <Bullets title="Differentiation notes" items={draft.differentiationNotes} />
    </div>
  );
}

function Bullets({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div>
      <h4 className="text-sm font-semibold text-slate-950">{title}</h4>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
        {items.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
