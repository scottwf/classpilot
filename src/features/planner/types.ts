export type LessonStatus = "planned" | "taught" | "delayed" | "skipped";

export type LessonSections = {
  assessment: string;
  differentiation: string;
  learningGoals: string;
  lessonFlow: string;
  materials: string;
  mindsOn: string;
  reflection: string;
  resources: string;
};

export type CurriculumOutcome = {
  id: string;
  code: string;
  description: string;
  subject: string;
  grade: string;
  strand: string;
};

export type LessonPlan = {
  id: string;
  title: string;
  date: string;
  durationMinutes: number;
  status: LessonStatus;
  outcomeIds: string[];
  sections?: LessonSections;
  summary: string;
  /** Set when this lesson was created via "extend to another day" — links a
   * continuation lesson back to the lesson it continues from. */
  continuesFromLessonId?: string;
};

export type UnitPlan = {
  id: string;
  classId: string;
  title: string;
  startDate: string;
  endDate: string;
  color: "blue" | "emerald" | "amber" | "rose" | "violet";
  outcomeIds: string[];
  lessons: LessonPlan[];
};

/** Palette for ClassSection.color — a class's identity color across the
 * schedule grid and timetable views (Chalk/Planboard-style class colors).
 * Deliberately a wider set than UnitPlan's 5 colors since a school day can
 * have 6+ classes that all need to stay visually distinct at once. */
export type ClassColor =
  | "blue"
  | "emerald"
  | "amber"
  | "rose"
  | "violet"
  | "sky"
  | "orange"
  | "teal";

export type ClassSection = {
  id: string;
  schoolYearId: string;
  name: string;
  subject: string;
  grade: string;
  room: string;
  meetingPattern: string;
  /** Which cycle days (1..schoolYear.cycleLength) this class meets on.
   * Empty means "every instructional day" (the pre-cycle-system default). */
  cycleDays: number[];
  /** Optional target total instructional minutes for the year (e.g. a
   * curriculum minimum). 0/undefined means no target set — the onboarding
   * wizard's time-confirmation step just informational in that case. */
  targetMinutesPerYear?: number;
  /** Identity color for this class, shown on the schedule grid and
   * timetable views. */
  color: ClassColor;
  /** False for non-instructional blocks on the schedule (recess,
   * supervision, one-off assemblies) — these skip the curriculum outcome
   * picker and are excluded from instructional-time tracking. Defaults to
   * true (a real class). */
  isInstructional: boolean;
};

export type NonInstructionalDay = {
  date: string;
  label: string;
  /** Whether this day still consumes a cycle-day number (the next school
   * day picks up the following number) or pauses the cycle (the next
   * school day repeats the number this day would have had). Planned
   * closures typically advance; unplanned ones (snow days) typically
   * don't — see docs/RESTART-HERE.md for the full rationale. */
  advancesCycle: boolean;
};

/** How cycle day numbers are displayed — purely cosmetic, the underlying
 * storage and every scheduling/cycle calculation always uses plain numbers
 * (1..cycleLength). See getDayLabel() in cycle.ts. */
export type DayLabelScheme = "numeric" | "letters" | "odd-even";

export type SchoolYear = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  blockedDates: NonInstructionalDay[];
  /** Length of the school's rotating day cycle (e.g. 2 for odd/even days,
   * 5 or 6 for a multi-day rotation). */
  cycleLength: number;
  dayLabelScheme: DayLabelScheme;
};

export type PlannerData = {
  schoolYear: SchoolYear;
  classes: ClassSection[];
  outcomes: CurriculumOutcome[];
  units: UnitPlan[];
};

/** One row of the school-wide bell schedule. Times are fixed across every
 * cycle day (e.g. "Period 2" is always 9:43-10:45 regardless of which cycle
 * day it is) — only which class occupies a period changes by day, via
 * ScheduleSlot. See src/lib/db/schedule-repository.ts. */
export type Period = {
  id: string;
  schoolYearId: string;
  label: string;
  /** 24-hour "HH:MM". */
  startTime: string;
  /** 24-hour "HH:MM". */
  endTime: string;
  sortOrder: number;
};

/** Assigns one class to one period on one cycle day. A class can have at
 * most one slot per cycle day (assigning a new period for a day it's
 * already scheduled replaces the old one); two different classes CAN share
 * a (cycleDay, periodId) — that's flagged as a conflict warning at
 * assignment time, not blocked (a teacher may have a legitimate reason). */
export type ScheduleSlot = {
  id: string;
  classId: string;
  periodId: string;
  cycleDay: number;
};

export type InstructionalDay = {
  date: Date;
  key: string;
  label: string;
  monthLabel: string;
};
