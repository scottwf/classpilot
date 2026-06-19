import {
  loadSaskatchewanGrade6Outcomes,
  outcomeIdFor,
} from "@/src/lib/curriculum/sk-outcomes";
import type { PlannerData } from "./types";

const importedOutcomes = loadSaskatchewanGrade6Outcomes();

export const plannerData: PlannerData = {
  schoolYear: {
    title: "2026-2027 Grade 6 Homeroom",
    startDate: "2026-09-01",
    endDate: "2026-12-18",
    blockedDates: [
      { date: "2026-09-07", label: "Labour Day" },
      { date: "2026-10-12", label: "Thanksgiving" },
      { date: "2026-11-11", label: "Remembrance Day" },
      { date: "2026-11-27", label: "Professional Development Day" },
      { date: "2026-12-04", label: "Parent-Teacher Conferences" },
    ],
  },
  classes: [
    {
      id: "grade-6-ela",
      name: "Grade 6 ELA",
      subject: "English Language Arts",
      grade: "6",
      room: "Homeroom",
      meetingPattern: "Daily literacy block",
    },
    {
      id: "grade-6-math",
      name: "Grade 6 Math",
      subject: "Mathematics",
      grade: "6",
      room: "Homeroom",
      meetingPattern: "Daily numeracy block",
    },
    {
      id: "grade-6-science",
      name: "Grade 6 Science",
      subject: "Science",
      grade: "6",
      room: "Homeroom",
      meetingPattern: "Mon/Wed/Fri inquiry block",
    },
    {
      id: "grade-6-social-studies",
      name: "Grade 6 Social Studies",
      subject: "Social Studies",
      grade: "6",
      room: "Homeroom",
      meetingPattern: "Tue/Thu project block",
    },
    {
      id: "grade-6-homeroom",
      name: "Homeroom Routines",
      subject: "Classroom Community",
      grade: "6",
      room: "Homeroom",
      meetingPattern: "Morning meeting and end-of-day routines",
    },
  ],
  outcomes: [
    ...importedOutcomes,
    {
      id: "homeroom-community",
      code: "HR6.C1",
      subject: "Classroom Community",
      grade: "6",
      strand: "Learning Skills",
      description:
        "Build routines for organization, collaboration, reflection, and classroom belonging.",
    },
  ],
  units: [
    {
      id: "unit-reading-identity",
      classId: "grade-6-ela",
      title: "Reading Identity and Belonging",
      startDate: "2026-09-03",
      endDate: "2026-10-02",
      color: "emerald",
      outcomeIds: [outcomeIdFor("English Language Arts", "CR6.1")],
      lessons: [
        {
          id: "lesson-reading-inventory",
          title: "Reader Identity Inventory",
          date: "2026-09-08",
          durationMinutes: 55,
          status: "taught",
          outcomeIds: [outcomeIdFor("English Language Arts", "CR6.1")],
          summary:
            "Students reflect on reading habits and set one personal reading goal.",
        },
        {
          id: "lesson-character-evidence",
          title: "Character Evidence Chart",
          date: "2026-09-15",
          durationMinutes: 55,
          status: "planned",
          outcomeIds: [outcomeIdFor("English Language Arts", "CR6.6")],
          summary:
            "Use text evidence to explain how a character's choices reveal identity.",
        },
      ],
    },
    {
      id: "unit-ratios",
      classId: "grade-6-math",
      title: "Ratios, Rates, and Percent",
      startDate: "2026-09-10",
      endDate: "2026-10-16",
      color: "amber",
      outcomeIds: [
        outcomeIdFor("Mathematics", "N6.5"),
        outcomeIdFor("Mathematics", "N6.8"),
      ],
      lessons: [
        {
          id: "lesson-ratio-language",
          title: "Ratio Language in Real Life",
          date: "2026-09-11",
          durationMinutes: 55,
          status: "planned",
          outcomeIds: [outcomeIdFor("Mathematics", "N6.8")],
          summary:
            "Connect part-to-part and part-to-whole ratios to classroom examples.",
        },
        {
          id: "lesson-percent-benchmarks",
          title: "Percent Benchmarks",
          date: "2026-09-21",
          durationMinutes: 55,
          status: "planned",
          outcomeIds: [outcomeIdFor("Mathematics", "N6.5")],
          summary:
            "Use 1%, 10%, 25%, 50%, and 100% benchmarks to estimate percent problems.",
        },
      ],
    },
    {
      id: "unit-classification",
      classId: "grade-6-science",
      title: "Diversity of Living Things",
      startDate: "2026-09-01",
      endDate: "2026-09-25",
      color: "blue",
      outcomeIds: [outcomeIdFor("Science", "DL6.2")],
      lessons: [
        {
          id: "lesson-classification-systems",
          title: "How Scientists Classify",
          date: "2026-09-02",
          durationMinutes: 50,
          status: "taught",
          outcomeIds: [outcomeIdFor("Science", "DL6.2")],
          summary:
            "Sort organisms by observable characteristics and compare classification rules.",
        },
      ],
    },
    {
      id: "unit-communities",
      classId: "grade-6-social-studies",
      title: "Community, Place, and Identity",
      startDate: "2026-09-14",
      endDate: "2026-10-23",
      color: "violet",
      outcomeIds: [outcomeIdFor("Social Studies", "IN6.1")],
      lessons: [
        {
          id: "lesson-identity-map",
          title: "Identity Map",
          date: "2026-09-17",
          durationMinutes: 50,
          status: "planned",
          outcomeIds: [outcomeIdFor("Social Studies", "IN6.1")],
          summary:
            "Create a map of personal, family, community, and place-based identity factors.",
        },
      ],
    },
    {
      id: "unit-routines",
      classId: "grade-6-homeroom",
      title: "Classroom Routines and Belonging",
      startDate: "2026-09-01",
      endDate: "2026-09-18",
      color: "rose",
      outcomeIds: ["homeroom-community"],
      lessons: [],
    },
  ],
};
