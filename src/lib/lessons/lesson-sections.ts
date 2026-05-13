import type { LessonSections } from "@/src/features/planner/types";

export const lessonSectionFields: Array<{
  description: string;
  label: string;
  name: keyof LessonSections;
}> = [
  {
    description: "Student-facing goals or success criteria.",
    label: "Learning goals",
    name: "learningGoals",
  },
  {
    description: "Teacher and student materials, including links for now.",
    label: "Materials",
    name: "materials",
  },
  {
    description: "Opening prompt, review, or activation task.",
    label: "Minds On",
    name: "mindsOn",
  },
  {
    description: "Main sequence for instruction, practice, and consolidation.",
    label: "Lesson flow",
    name: "lessonFlow",
  },
  {
    description: "Evidence of learning, checks for understanding, or exit task.",
    label: "Assessment",
    name: "assessment",
  },
  {
    description: "Supports, extensions, accommodations, and small-group notes.",
    label: "Differentiation",
    name: "differentiation",
  },
  {
    description: "Images, videos, web links, and local attachment notes.",
    label: "Resources",
    name: "resources",
  },
  {
    description: "Notes after teaching.",
    label: "Reflection",
    name: "reflection",
  },
];

export function emptyLessonSections(): LessonSections {
  return {
    assessment: "",
    differentiation: "",
    learningGoals: "",
    lessonFlow: "",
    materials: "",
    mindsOn: "",
    reflection: "",
    resources: "",
  };
}

export function readLessonSections(formData: FormData): LessonSections {
  return lessonSectionFields.reduce((sections, field) => {
    sections[field.name] = String(formData.get(field.name) ?? "").trim();
    return sections;
  }, emptyLessonSections());
}

export function lessonSummaryFromSections(
  sections: LessonSections,
  fallback: string,
) {
  const summary = fallback.trim();

  if (summary) {
    return summary;
  }

  return (
    sections.learningGoals ||
    sections.lessonFlow ||
    sections.assessment ||
    "Structured lesson plan"
  );
}
