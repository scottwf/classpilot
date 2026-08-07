import Link from "next/link";
import { calculateAge } from "./age";
import type {
  NoteCategory,
  ReminderCategory,
  StudentProfile as StudentProfileData,
  SupportPlanType,
} from "./types";

type ServerAction = (formData: FormData) => void | Promise<void>;

type StudentProfileProps = {
  profile: StudentProfileData;
  error?: string;
  actions: {
    addContact: ServerAction;
    deleteContact: ServerAction;
    addNote: ServerAction;
    setNoteFollowUp: ServerAction;
    deleteNote: ServerAction;
    addSupportPlan: ServerAction;
    deleteSupportPlan: ServerAction;
    addReminder: ServerAction;
    setReminderStatus: ServerAction;
    deleteReminder: ServerAction;
  };
};

const noteCategories: NoteCategory[] = [
  "academic",
  "behavior",
  "attendance",
  "social_emotional",
  "family",
  "medical",
  "other",
];

const supportPlanTypes: SupportPlanType[] = [
  "accommodation",
  "intervention",
  "iep",
  "health",
  "behavior",
];

const reminderCategories: ReminderCategory[] = [
  "follow_up",
  "missing_work",
  "parent_contact",
  "support",
  "other",
];

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

function labelText(value: string): string {
  return value.replace(/_/g, " ");
}

export function StudentProfile({ profile, error, actions }: StudentProfileProps) {
  const studentId = profile.id;

  return (
    <>
      <section className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-700">
            <Link className="hover:underline" href="/students">
              Students
            </Link>{" "}
            / Profile
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">
            {profile.preferredName || profile.firstName} {profile.lastName}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {[profile.pronouns, labelText(profile.status)]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <Link
          className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          href={`/students/${studentId}/edit`}
        >
          Edit profile
        </Link>
      </section>

      {error ? (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          Something in that form needs another look. Please try again.
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="About">
          <dl className="space-y-2 text-sm">
            <Detail label="Legal name">
              {profile.firstName} {profile.lastName}
            </Detail>
            <Detail label="Interests">{profile.interests || "—"}</Detail>
            <Detail label="Strengths">{profile.strengths || "—"}</Detail>
            <Detail label="Birthdate">
              {profile.birthdate
                ? `${profile.birthdate} (age ${calculateAge(profile.birthdate) ?? "—"})`
                : "—"}
            </Detail>
            <Detail label="Student number">
              {profile.studentNumber || "—"}
            </Detail>
          </dl>
        </Card>

        <Card title="Contacts">
          {profile.contacts.length === 0 ? (
            <Empty>No contacts yet.</Empty>
          ) : (
            <ul className="space-y-2">
              {profile.contacts.map((contact) => (
                <li
                  className="rounded-md border border-slate-200 p-3 text-sm"
                  key={contact.id}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-950">
                      {contact.name}
                      {contact.relationship ? (
                        <span className="font-normal text-slate-500">
                          {" "}
                          · {contact.relationship}
                        </span>
                      ) : null}
                    </span>
                    <DeleteButton
                      action={actions.deleteContact}
                      id={contact.id}
                      studentId={studentId}
                    />
                  </div>
                  <p className="mt-1 text-slate-600">
                    {[contact.email, contact.phone].filter(Boolean).join(" · ") ||
                      "No contact details"}
                  </p>
                  <p className="mt-1 flex gap-2 text-xs">
                    {contact.isPrimary ? <Tag tone="blue">Primary</Tag> : null}
                    {contact.isEmergency ? (
                      <Tag tone="rose">Emergency</Tag>
                    ) : null}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <Details summary="Add contact">
            <form action={actions.addContact} className="mt-3 space-y-3">
              <input name="studentId" type="hidden" value={studentId} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Labeled label="Name">
                  <input className={inputClass} name="name" required />
                </Labeled>
                <Labeled label="Relationship">
                  <input className={inputClass} name="relationship" />
                </Labeled>
                <Labeled label="Email">
                  <input className={inputClass} name="email" type="email" />
                </Labeled>
                <Labeled label="Phone">
                  <input className={inputClass} name="phone" />
                </Labeled>
              </div>
              <div className="flex gap-4 text-sm text-slate-700">
                <label className="flex items-center gap-2">
                  <input name="isPrimary" type="checkbox" /> Primary
                </label>
                <label className="flex items-center gap-2">
                  <input name="isEmergency" type="checkbox" /> Emergency
                </label>
              </div>
              <SaveButton>Save contact</SaveButton>
            </form>
          </Details>
        </Card>

        <Card title="Support plans">
          {profile.supportPlans.length === 0 ? (
            <Empty>No accommodations or intervention plans yet.</Empty>
          ) : (
            <ul className="space-y-2">
              {profile.supportPlans.map((plan) => (
                <li
                  className="rounded-md border border-slate-200 p-3 text-sm"
                  key={plan.id}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-950">
                      {plan.title}{" "}
                      <Tag tone="violet">{labelText(plan.planType)}</Tag>
                    </span>
                    <DeleteButton
                      action={actions.deleteSupportPlan}
                      id={plan.id}
                      studentId={studentId}
                    />
                  </div>
                  {plan.details ? (
                    <p className="mt-1 text-slate-600">{plan.details}</p>
                  ) : null}
                  {plan.strategies ? (
                    <p className="mt-1 text-slate-600">
                      <span className="font-medium text-slate-700">
                        Strategies:
                      </span>{" "}
                      {plan.strategies}
                    </p>
                  ) : null}
                  {plan.reviewDate ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Review by {plan.reviewDate}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          <Details summary="Add support plan">
            <form action={actions.addSupportPlan} className="mt-3 space-y-3">
              <input name="studentId" type="hidden" value={studentId} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Labeled label="Title">
                  <input className={inputClass} name="title" required />
                </Labeled>
                <Labeled label="Type">
                  <select className={inputClass} name="planType">
                    {supportPlanTypes.map((type) => (
                      <option key={type} value={type}>
                        {labelText(type)}
                      </option>
                    ))}
                  </select>
                </Labeled>
                <Labeled label="Start date">
                  <input className={inputClass} name="startDate" type="date" />
                </Labeled>
                <Labeled label="Review date">
                  <input className={inputClass} name="reviewDate" type="date" />
                </Labeled>
              </div>
              <Labeled label="Details">
                <textarea className={inputClass} name="details" rows={2} />
              </Labeled>
              <Labeled label="Strategies">
                <textarea className={inputClass} name="strategies" rows={2} />
              </Labeled>
              <SaveButton>Save plan</SaveButton>
            </form>
          </Details>
        </Card>

        <Card title="Reminders">
          {profile.reminders.length === 0 ? (
            <Empty>No reminders.</Empty>
          ) : (
            <ul className="space-y-2">
              {profile.reminders.map((reminder) => (
                <li
                  className="rounded-md border border-slate-200 p-3 text-sm"
                  key={reminder.id}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-950">
                      {reminder.title}{" "}
                      <Tag tone="blue">{labelText(reminder.category)}</Tag>
                    </span>
                    <DeleteButton
                      action={actions.deleteReminder}
                      id={reminder.id}
                      studentId={studentId}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Due {reminder.dueDate} · {labelText(reminder.status)}
                  </p>
                  {reminder.status === "open" ? (
                    <div className="mt-2 flex gap-2">
                      <StatusButton
                        action={actions.setReminderStatus}
                        id={reminder.id}
                        status="done"
                        studentId={studentId}
                      >
                        Mark done
                      </StatusButton>
                      <StatusButton
                        action={actions.setReminderStatus}
                        id={reminder.id}
                        status="dismissed"
                        studentId={studentId}
                      >
                        Dismiss
                      </StatusButton>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          <Details summary="Add reminder">
            <form action={actions.addReminder} className="mt-3 space-y-3">
              <input name="studentId" type="hidden" value={studentId} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Labeled label="Title">
                  <input className={inputClass} name="title" required />
                </Labeled>
                <Labeled label="Due date">
                  <input
                    className={inputClass}
                    name="dueDate"
                    required
                    type="date"
                  />
                </Labeled>
                <Labeled label="Category">
                  <select className={inputClass} name="category">
                    {reminderCategories.map((category) => (
                      <option key={category} value={category}>
                        {labelText(category)}
                      </option>
                    ))}
                  </select>
                </Labeled>
              </div>
              <SaveButton>Save reminder</SaveButton>
            </form>
          </Details>
        </Card>
      </div>

      <Card title="Notes">
        {profile.notes.length === 0 ? (
          <Empty>No notes yet.</Empty>
        ) : (
          <ul className="space-y-2">
            {profile.notes.map((note) => (
              <li
                className="rounded-md border border-slate-200 p-3 text-sm"
                key={note.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-slate-950">
                    <Tag tone="slate">{labelText(note.category)}</Tag>{" "}
                    <span className="text-xs font-normal text-slate-500">
                      {note.date}
                      {note.subject ? ` · ${note.subject}` : ""}
                    </span>
                  </span>
                  <DeleteButton
                    action={actions.deleteNote}
                    id={note.id}
                    studentId={studentId}
                  />
                </div>
                <p className="mt-1 whitespace-pre-line text-slate-700">
                  {note.body}
                </p>
                <form
                  action={actions.setNoteFollowUp}
                  className="mt-2 flex items-center gap-2"
                >
                  <input name="studentId" type="hidden" value={studentId} />
                  <input name="id" type="hidden" value={note.id} />
                  <span className="text-xs text-slate-500">Follow-up:</span>
                  <select
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-950"
                    defaultValue={note.followUpStatus}
                    name="followUpStatus"
                  >
                    <option value="none">none</option>
                    <option value="open">open</option>
                    <option value="in_progress">in progress</option>
                    <option value="resolved">resolved</option>
                  </select>
                  <button
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    type="submit"
                  >
                    Update
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <Details summary="Add note">
          <form action={actions.addNote} className="mt-3 space-y-3">
            <input name="studentId" type="hidden" value={studentId} />
            <div className="grid gap-3 sm:grid-cols-3">
              <Labeled label="Date">
                <input className={inputClass} name="date" type="date" />
              </Labeled>
              <Labeled label="Category">
                <select className={inputClass} name="category">
                  {noteCategories.map((category) => (
                    <option key={category} value={category}>
                      {labelText(category)}
                    </option>
                  ))}
                </select>
              </Labeled>
              <Labeled label="Subject (optional)">
                <input className={inputClass} name="subject" />
              </Labeled>
            </div>
            <Labeled label="Note">
              <textarea className={inputClass} name="body" required rows={3} />
            </Labeled>
            <Labeled label="Follow-up">
              <select className={inputClass} name="followUpStatus">
                <option value="none">none</option>
                <option value="open">open</option>
                <option value="in_progress">in progress</option>
                <option value="resolved">resolved</option>
              </select>
            </Labeled>
            <SaveButton>Save note</SaveButton>
          </form>
        </Details>
      </Card>
    </>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-2">
      <dt className="w-32 shrink-0 text-slate-500">{label}</dt>
      <dd className="text-slate-800">{children}</dd>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-500">{children}</p>;
}

function Labeled({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function Details({
  summary,
  children,
}: {
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <details className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <summary className="cursor-pointer text-sm font-medium text-blue-700">
        {summary}
      </summary>
      {children}
    </details>
  );
}

function SaveButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm"
      type="submit"
    >
      {children}
    </button>
  );
}

function DeleteButton({
  action,
  id,
  studentId,
}: {
  action: ServerAction;
  id: string;
  studentId: string;
}) {
  return (
    <form action={action}>
      <input name="studentId" type="hidden" value={studentId} />
      <input name="id" type="hidden" value={id} />
      <button
        className="text-xs font-medium text-slate-400 hover:text-rose-600"
        type="submit"
      >
        Remove
      </button>
    </form>
  );
}

function StatusButton({
  action,
  id,
  status,
  studentId,
  children,
}: {
  action: ServerAction;
  id: string;
  status: string;
  studentId: string;
  children: React.ReactNode;
}) {
  return (
    <form action={action}>
      <input name="studentId" type="hidden" value={studentId} />
      <input name="id" type="hidden" value={id} />
      <input name="status" type="hidden" value={status} />
      <button
        className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
        type="submit"
      >
        {children}
      </button>
    </form>
  );
}

function Tag({
  tone,
  children,
}: {
  tone: "blue" | "rose" | "violet" | "slate" | "amber";
  children: React.ReactNode;
}) {
  const tones: Record<string, string> = {
    blue: "bg-blue-100 text-blue-800",
    rose: "bg-rose-100 text-rose-800",
    violet: "bg-violet-100 text-violet-800",
    slate: "bg-slate-100 text-slate-700",
    amber: "bg-amber-100 text-amber-800",
  };

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
