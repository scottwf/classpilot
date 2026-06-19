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
};

export type NonInstructionalDay = {
  date: string;
  label: string;
};

export type SchoolYear = {
  title: string;
  startDate: string;
  endDate: string;
  blockedDates: NonInstructionalDay[];
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
