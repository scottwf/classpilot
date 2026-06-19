# Student Information CMS — Schema & Privacy Plan

Design for ClassPilot's private classroom information system. This is the most
sensitive subsystem in the app, so the data model and the privacy controls are
designed together. Nothing here is built yet; this document is the blueprint to
implement against.

Aligns with the Student Information CMS section of
[ClassPilot-summary-plan.md](../ClassPilot-summary-plan.md) and the conventions
in [CODEBASE-OVERVIEW.md](CODEBASE-OVERVIEW.md).

## 1. Goals & Scope

Keep the teacher's working knowledge about each learner organized and linked to
planning, **without** becoming a school SIS.

MVP scope:

- Roster + student profiles (strengths, interests, basics)
- Family/guardian contacts + communication log
- Categorized student notes with follow-up status
- Accommodation / intervention / support plans
- Assessment evidence linked to outcomes, units, and lessons
- Reminders (follow-ups, missing work, parent contact, support actions)
- Exportable per-student summaries (local download only)

Explicitly later: report-card drafting, longitudinal growth views, multi-class
enrollment, transition records.

## 2. Design Principles

1. **Privacy is a schema concern, not a bolt-on.** Sensitive free-text columns
   are identified up front and are candidates for field-level encryption.
2. **Reuse existing conventions.** `TEXT` primary keys (`student-${uuid}`),
   snake_case columns, ISO-8601 date strings as `TEXT`, JSON arrays in
   `*_ids_json` columns, foreign keys with explicit `ON DELETE`, all access
   behind a repository module (no SQL in components).
3. **Local-first and deletable.** Everything cascades from `students`, so a
   single delete removes a learner's full footprint ("right to be forgotten").
4. **AI sees the minimum.** Raw student records never leave the box by default.

## 3. Data Model

One homeroom per school year, so students attach to `school_years` rather than to
a subject `class_sections` row. (Multi-section enrollment is a later extension via
a join table.)

```
school_years
  └── students (roster + profile)
        ├── student_contacts ─── communication_log
        ├── student_notes ─────── reminders
        ├── support_plans
        ├── assessment_evidence ── (→ curriculum_outcomes / unit_plans / lesson_plans)
        └── student_attachments
```

### 3.1 DDL (drop into `src/lib/db/sqlite.ts` `migrate()`)

`🔒` marks columns recommended for field-level encryption (see §4.2).

```sql
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  school_year_id TEXT NOT NULL REFERENCES school_years(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  preferred_name TEXT NOT NULL DEFAULT '',
  pronouns TEXT NOT NULL DEFAULT '',
  birthdate TEXT NOT NULL DEFAULT '',        -- 🔒 ISO date
  student_number TEXT NOT NULL DEFAULT '',   -- 🔒 external SIS id
  strengths TEXT NOT NULL DEFAULT '',        -- 🔒
  interests TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',      -- active | inactive | transferred
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS student_contacts (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT NOT NULL DEFAULT '',     -- parent | guardian | other
  email TEXT NOT NULL DEFAULT '',            -- 🔒
  phone TEXT NOT NULL DEFAULT '',            -- 🔒
  is_primary INTEGER NOT NULL DEFAULT 0,
  is_emergency INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',            -- 🔒
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS communication_log (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  contact_id TEXT REFERENCES student_contacts(id) ON DELETE SET NULL,
  date TEXT NOT NULL,
  channel TEXT NOT NULL,                      -- phone | email | meeting | note_home | message
  direction TEXT NOT NULL DEFAULT 'outgoing', -- outgoing | incoming
  subject TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL,                       -- 🔒
  follow_up_required INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS student_notes (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  category TEXT NOT NULL,                      -- academic | behavior | attendance | social_emotional | family | medical | other
  subject TEXT NOT NULL DEFAULT '',           -- optional curriculum subject tag
  body TEXT NOT NULL,                          -- 🔒
  follow_up_status TEXT NOT NULL DEFAULT 'none', -- none | open | in_progress | resolved
  unit_id TEXT REFERENCES unit_plans(id) ON DELETE SET NULL,
  lesson_id TEXT REFERENCES lesson_plans(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS support_plans (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL,                     -- accommodation | intervention | iep | health | behavior
  title TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',           -- 🔒
  strategies TEXT NOT NULL DEFAULT '',        -- 🔒
  start_date TEXT NOT NULL DEFAULT '',
  review_date TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',       -- active | archived
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assessment_evidence (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  outcome_ids_json TEXT NOT NULL DEFAULT '[]',
  unit_id TEXT REFERENCES unit_plans(id) ON DELETE SET NULL,
  lesson_id TEXT REFERENCES lesson_plans(id) ON DELETE SET NULL,
  assessment_type TEXT NOT NULL DEFAULT 'formative', -- formative | summative | observation | conversation | product
  level TEXT NOT NULL DEFAULT '',             -- e.g. beginning/developing/proficient/extending or a score
  evidence TEXT NOT NULL DEFAULT '',          -- 🔒
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
  due_date TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'follow_up', -- follow_up | missing_work | parent_contact | support | other
  title TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',         -- open | done | dismissed
  source_note_id TEXT REFERENCES student_notes(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  completed_at TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS student_attachments (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  storage_path TEXT NOT NULL,                  -- under private uploads dir, NEVER statically served
  content_type TEXT NOT NULL DEFAULT '',
  size_bytes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

-- Optional but recommended for sensitive-data accountability (§4.5)
CREATE TABLE IF NOT EXISTS access_audit (
  id TEXT PRIMARY KEY,
  occurred_at TEXT NOT NULL,
  action TEXT NOT NULL,                        -- view | create | update | delete | export | ai_summary
  entity TEXT NOT NULL,                        -- student | note | contact | support_plan | ...
  entity_id TEXT NOT NULL DEFAULT '',
  detail TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_contacts_student ON student_contacts(student_id);
CREATE INDEX IF NOT EXISTS idx_comm_student ON communication_log(student_id, date);
CREATE INDEX IF NOT EXISTS idx_notes_student ON student_notes(student_id, date);
CREATE INDEX IF NOT EXISTS idx_support_student ON support_plans(student_id);
CREATE INDEX IF NOT EXISTS idx_evidence_student ON assessment_evidence(student_id, date);
CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders(status, due_date);
```

### 3.2 Domain types (sketch for `src/features/students/types.ts`)

Keep types in one module like `planner/types.ts`; the repository maps rows ↔ these.

```ts
export type StudentStatus = "active" | "inactive" | "transferred";
export type NoteCategory =
  | "academic" | "behavior" | "attendance"
  | "social_emotional" | "family" | "medical" | "other";
export type FollowUpStatus = "none" | "open" | "in_progress" | "resolved";

export type Student = {
  id: string;
  schoolYearId: string;
  firstName: string;
  lastName: string;
  preferredName: string;
  pronouns: string;
  birthdate: string;       // sensitive
  studentNumber: string;   // sensitive
  strengths: string;       // sensitive
  interests: string;
  status: StudentStatus;
  createdAt: string;
  updatedAt: string;
};

export type StudentNote = {
  id: string;
  studentId: string;
  date: string;
  category: NoteCategory;
  subject: string;
  body: string;            // sensitive
  followUpStatus: FollowUpStatus;
  unitId?: string;
  lessonId?: string;
  createdAt: string;
  updatedAt: string;
};
// ...contacts, support plans, evidence, reminders follow the same shape.
```

### 3.3 Repository layer

New `src/lib/db/students-repository.ts` mirroring `planner-repository.ts`:
- `listStudents`, `getStudentById`, `createStudent`, `updateStudent`, `deleteStudent`
- child CRUD: notes, contacts, communication, support plans, evidence, reminders
- `getStudentSummary(studentId)` for export/AI (assembles a single object)
- Encryption/decryption of 🔒 fields happens **inside** this layer so callers
  always see plaintext (§4.2).

Routes (all behind `requireAuth()` + the `proxy.ts` backstop):
`/students`, `/students/new`, `/students/[id]`, `/students/[id]/edit`,
`/students/[id]/notes`, `/students/[id]/export`.

## 4. Privacy & Security Plan

### 4.1 Threat model (single-teacher homelab)

| Threat | Primary mitigation |
| --- | --- |
| Lost/stolen device or disk | Disk/volume encryption + field-level encryption |
| Leaked or copied backup | Encrypted backups, key stored separately |
| Accidental exposure to AI provider | Default-off AI for student context; de-identify + teacher approval |
| Unauthorized network access | Existing auth (password + signed cookie + `proxy.ts`), HTTPS, secure cookies |
| Accidental commit of data | `data/`, `.env`, SQLite, uploads already gitignored |
| Insider over-collection | Minimal MVP fields; explicit "later" list; deletable cascade |

### 4.2 Encryption at rest

`node:sqlite` (`DatabaseSync`) does **not** support SQLCipher, so encrypt in two
complementary layers:

1. **Volume encryption (operational baseline).** Host the `./data` volume on an
   encrypted filesystem (LUKS / FileVault / encrypted ZFS dataset). Required
   before real data regardless of app-level work.
2. **Application-level field encryption (in-app).** Encrypt the 🔒 columns with
   AES-256-GCM via `node:crypto` in a new `src/lib/crypto/field-cipher.ts`:
   - Key from a new `CLASSPILOT_DATA_KEY` env var (32 bytes, base64), **distinct
     from** `CLASSPILOT_AUTH_SECRET`. Fail closed in production if missing (same
     pattern as `src/lib/auth/secrets.ts`).
   - Storage format per field: `v1:<iv_b64>:<authTag_b64>:<ciphertext_b64>`, so
     the scheme can version/rotate later.
   - Encrypt/decrypt only in the repository; the rest of the app is unaware.

Trade-off to accept for MVP: encrypted fields are **not searchable or sortable**.
Keep search/sort on non-sensitive fields (names, dates, category). Names are left
unencrypted so the roster is usable; revisit if that risk is unacceptable (then
move to SQLCipher via `better-sqlite3`, see §6).

### 4.3 Backups

- Scheduled backup of `./data` (DB) **and** the private uploads dir.
- Encrypt backups with `age` or `gpg`; never store the backup key inside the
  backup.
- Store `CLASSPILOT_DATA_KEY` in a password manager. **If it is lost, encrypted
  fields are unrecoverable** — document this loudly and test a restore before
  entering real data.

### 4.4 AI data minimization

A new env switch `CLASSPILOT_AI_STUDENT_CONTEXT` with three modes:
- `off` (default): student data is never sent to any AI provider.
- `deidentified`: a de-identification step strips names/contacts and substitutes
  stable tokens ("Student A") before any AI call.
- `approved`: the teacher reviews the exact outbound payload and confirms per
  request.

Every AI call touching student context writes an `ai_summary` row to
`access_audit`. AI features should prefer the `getStudentSummary` shape so the
exact payload is auditable.

### 4.5 Access control, audit, and export

- Reuse the existing auth; consider a shorter session TTL (e.g. 1–2 days) for
  deployments holding student data, and optional re-auth before `export`.
- Private attachments are stored **outside** `public/` and served only through an
  authenticated route handler that streams the file — never a static URL.
- Exports are local downloads only (no shareable links); log `export` to
  `access_audit`.
- Student deletion is a hard cascade; provide a confirmation step.

### 4.6 Container/runtime notes

- `compose.yaml` already mounts `./data:/app/data`; mount the uploads dir the same
  way (e.g. `./data/uploads`) so it persists and stays on the encrypted volume.
- Add `CLASSPILOT_DATA_KEY`, `CLASSPILOT_UPLOADS_DIR`, and
  `CLASSPILOT_AI_STUDENT_CONTEXT` to `.env.example` (documented, not committed).

## 5. Phased Rollout

1. **Schema + roster. ✅ Done (2026-05-31).** Tables/indexes added to `migrate()`;
   `students-repository.ts` (+ tests) with student/contact/note/support-plan/
   reminder CRUD, `getStudentProfile`, and `listRoster` follow-up/reminder counts;
   routes `/students`, `/students/new`, `/students/[id]`, `/students/[id]/edit`
   (all behind `requireAuth()` + the `proxy.ts` backstop); roster, profile, and
   student form UI; cascade delete; seed-only-if-empty demo roster
   (`seed-students.ts`). 35 tests / lint / build green. **Still pending before
   real data: encrypted volume + tested encrypted backups (operational), and the
   sensitive fields remain plaintext until Phase 2.**
2. **Field encryption. ✅ Done (2026-06-18).** Added
   `src/lib/crypto/field-cipher.ts` (AES-256-GCM, versioned `v1:` format,
   fail-closed `CLASSPILOT_DATA_KEY`, legacy-plaintext passthrough). The
   repository transparently encrypts/decrypts the 🔒 columns (note bodies,
   support-plan details/strategies, contact email/phone/notes, birthdate,
   student number, strengths); names/dates stay plaintext for search/sort.
   Encryption-at-rest is covered by tests, and the operational baseline
   (encrypted volume + encrypted backups + key custody) is documented in
   [backup-and-recovery.md](backup-and-recovery.md).

2b. **Attachments (deferred).** `student_attachments` table, private uploads dir
   outside `public/`, authenticated streaming download route, and delete. Not a
   data-safety gate, so it follows the AI/calendar work rather than blocking it.
3. **Assessment evidence.** Link evidence to outcomes/units/lessons; surface
   coverage on the profile and tie into outcome gap detection.
4. **AI summaries.** De-identification + teacher-approval flow + audit logging.

Each phase ships with unit tests for the new pure logic (cipher round-trip,
de-identification, summary assembly) following the existing test conventions.

## 6. Open Questions

- **Encrypt names too?** Improves at-rest privacy but breaks roster search/sort.
  If required, migrate persistence to `better-sqlite3` + SQLCipher (whole-DB
  encryption) instead of field-level — larger change, removes the searchability
  trade-off.
- **Multi-section enrollment:** introduce a `student_enrollments` join table when
  high-school mode lands.
- **Attendance:** lightweight notes now, or a structured daily attendance table
  later?
- **Report-card export format:** out of MVP scope; capture requirements before
  designing.
