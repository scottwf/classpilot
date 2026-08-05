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

export type ClassSection = {
  id: string;
  name: string;
  subject: string;
  grade: string;
  room: string;
  meetingPattern: string;
  /** Which cycle days (1..schoolYear.cycleLength) this class meets on.
   * Empty means "every instructional day" (the pre-cycle-system default). */
  cycleDays: number[];
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

export type SchoolYear = {
  title: string;
  startDate: string;
  endDate: string;
  blockedDates: NonInstructionalDay[];
  /** Length of the school's rotating day cycle (e.g. 2 for odd/even days,
   * 5 or 6 for a multi-day rotation). */
  cycleLength: number;
};

export type PlannerData = {
  schoolYear: SchoolYear;
  classes: ClassSection[];
  outcomes: CurriculumOutcome[];
  units: UnitPlan[];
};

export type InstructionalDay = {
  date: Date;
  key: string;
  label: string;
  monthLabel: string;
};
