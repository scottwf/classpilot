export type StudentStatus = "active" | "inactive" | "transferred";

export type NoteCategory =
  | "academic"
  | "behavior"
  | "attendance"
  | "social_emotional"
  | "family"
  | "medical"
  | "other";

export type FollowUpStatus = "none" | "open" | "in_progress" | "resolved";

export type SupportPlanType =
  | "accommodation"
  | "intervention"
  | "iep"
  | "health"
  | "behavior";

export type SupportPlanStatus = "active" | "archived";

export type ReminderCategory =
  | "follow_up"
  | "missing_work"
  | "parent_contact"
  | "support"
  | "other";

export type ReminderStatus = "open" | "done" | "dismissed";

export type Student = {
  id: string;
  schoolYearId: string;
  firstName: string;
  lastName: string;
  preferredName: string;
  pronouns: string;
  birthdate: string;
  studentNumber: string;
  strengths: string;
  interests: string;
  status: StudentStatus;
  createdAt: string;
  updatedAt: string;
};

export type StudentContact = {
  id: string;
  studentId: string;
  name: string;
  relationship: string;
  email: string;
  phone: string;
  isPrimary: boolean;
  isEmergency: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type StudentNote = {
  id: string;
  studentId: string;
  date: string;
  category: NoteCategory;
  subject: string;
  body: string;
  followUpStatus: FollowUpStatus;
  unitId?: string;
  lessonId?: string;
  createdAt: string;
  updatedAt: string;
};

export type SupportPlan = {
  id: string;
  studentId: string;
  planType: SupportPlanType;
  title: string;
  details: string;
  strategies: string;
  startDate: string;
  reviewDate: string;
  status: SupportPlanStatus;
  createdAt: string;
  updatedAt: string;
};

export type Reminder = {
  id: string;
  studentId?: string;
  dueDate: string;
  category: ReminderCategory;
  title: string;
  details: string;
  status: ReminderStatus;
  sourceNoteId?: string;
  createdAt: string;
  completedAt: string;
};

export type StudentProfile = Student & {
  contacts: StudentContact[];
  notes: StudentNote[];
  supportPlans: SupportPlan[];
  reminders: Reminder[];
};

export type RosterEntry = Student & {
  openReminderCount: number;
  openFollowUpCount: number;
};
