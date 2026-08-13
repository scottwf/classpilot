import {
  createContact,
  createNote,
  createReminder,
  createStudent,
  createSupportPlan,
} from "@/src/lib/db/students-repository";
import type { ClassPilotDatabase } from "@/src/lib/db/sqlite";

// Fictional demo roster so the Student CMS UI is explorable before real data is
// entered. Seeded only when the students table is empty.
export function seedDemoRoster(db: ClassPilotDatabase, userId: string, schoolYearId: string) {
  const avery = createStudent(db, userId, {
    schoolYearId,
    firstName: "Avery",
    lastName: "Nguyen",
    preferredName: "Ave",
    pronouns: "she/her",
    interests: "Graphic novels, basketball, coding club",
    strengths: "Strong collaborative leader; clear written explanations.",
  });

  createContact(db, userId, {
    studentId: avery,
    name: "Linh Nguyen",
    relationship: "Parent",
    email: "linh.nguyen@example.com",
    phone: "555-0101",
    isPrimary: true,
    isEmergency: true,
  });

  createNote(db, userId, {
    studentId: avery,
    date: "2026-09-10",
    category: "academic",
    subject: "Mathematics",
    body: "Confident with ratio language; ready for a percent extension task.",
    followUpStatus: "none",
  });

  const jordan = createStudent(db, userId, {
    schoolYearId,
    firstName: "Jordan",
    lastName: "Bear",
    pronouns: "they/them",
    interests: "Hockey, drumming, building models",
    strengths: "Excellent hands-on problem solver; helps peers.",
  });

  createContact(db, userId, {
    studentId: jordan,
    name: "Pat Bear",
    relationship: "Guardian",
    phone: "555-0188",
    isPrimary: true,
    isEmergency: true,
  });

  createSupportPlan(db, userId, {
    studentId: jordan,
    planType: "accommodation",
    title: "Extended time and chunked instructions",
    details: "Provide written steps and check-ins during longer writing tasks.",
    strategies: "Chunk tasks; allow movement breaks; visual schedule.",
    startDate: "2026-09-08",
    reviewDate: "2026-11-30",
  });

  createNote(db, userId, {
    studentId: jordan,
    date: "2026-09-14",
    category: "social_emotional",
    body: "Settled well after morning routine; responds to clear transitions.",
    followUpStatus: "open",
  });

  createReminder(db, userId, {
    studentId: jordan,
    dueDate: "2026-09-21",
    category: "parent_contact",
    title: "Call home with a positive update",
  });

  const sofia = createStudent(db, userId, {
    schoolYearId,
    firstName: "Sofia",
    lastName: "Romero",
    pronouns: "she/her",
    interests: "Reading, art, choir",
    strengths: "Creative writer; thoughtful contributor in discussion.",
  });

  createNote(db, userId, {
    studentId: sofia,
    date: "2026-09-12",
    category: "attendance",
    body: "Missed two literacy blocks; provide make-up reading inventory.",
    followUpStatus: "in_progress",
  });

  createReminder(db, userId, {
    studentId: sofia,
    dueDate: "2026-09-18",
    category: "missing_work",
    title: "Follow up on reader identity inventory",
  });
}
