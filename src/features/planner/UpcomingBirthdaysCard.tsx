import Link from "next/link";
import { Cake } from "lucide-react";
import type { UpcomingBirthday } from "@/src/features/students/birthdays";

type UpcomingBirthdaysCardProps = {
  birthdays: UpcomingBirthday[];
};

function dayLabel(daysUntil: number): string {
  if (daysUntil === 0) return "Today";
  if (daysUntil === 1) return "Tomorrow";
  return `In ${daysUntil} days`;
}

export function UpcomingBirthdaysCard({ birthdays }: UpcomingBirthdaysCardProps) {
  if (birthdays.length === 0) {
    return null;
  }

  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Cake aria-hidden="true" className="size-4 text-amber-700" />
        <h3 className="text-sm font-semibold text-amber-900">
          Upcoming birthdays
        </h3>
      </div>
      <ul className="mt-2 space-y-1">
        {birthdays.map((birthday) => (
          <li className="flex items-center justify-between gap-3 text-sm text-amber-800" key={birthday.studentId}>
            <Link
              className="truncate underline-offset-2 hover:underline"
              href={`/students/${birthday.studentId}`}
            >
              {birthday.preferredName || birthday.firstName} {birthday.lastName}
            </Link>
            <span className="shrink-0 text-xs">
              {dayLabel(birthday.daysUntil)} · turning {birthday.turningAge}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
