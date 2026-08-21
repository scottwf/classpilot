const birthdatePattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const millisecondsPerDay = 24 * 60 * 60 * 1000;

export type UpcomingBirthday = {
  studentId: string;
  firstName: string;
  lastName: string;
  preferredName: string;
  birthdate: string;
  /** The age the student turns on this upcoming birthday. */
  turningAge: number;
  /** 0 = today, 1 = tomorrow, etc. */
  daysUntil: number;
};

type BirthdayStudent = {
  id: string;
  firstName: string;
  lastName: string;
  preferredName: string;
  birthdate: string;
};

/**
 * Students whose next birthday falls within the next `withinDays` days
 * (inclusive of today). Works on plain date components rather than parsed
 * Dates, same reasoning as calculateAge() — sidesteps timezone pitfalls
 * entirely. A Feb 29 birthdate lands on Mar 1 in a non-leap "next
 * occurrence" year (JS Date's normal day-overflow behavior) rather than
 * being dropped.
 */
export function findUpcomingBirthdays(
  students: BirthdayStudent[],
  options: { withinDays?: number; today?: Date } = {},
): UpcomingBirthday[] {
  const withinDays = options.withinDays ?? 14;
  const today = options.today ?? new Date();
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());

  return students
    .map((student): UpcomingBirthday | undefined => {
      const match = birthdatePattern.exec(student.birthdate);
      if (!match) return undefined;

      const birthYear = Number(match[1]);
      const birthMonth = Number(match[2]);
      const birthDay = Number(match[3]);

      let occurrenceUtc = Date.UTC(today.getFullYear(), birthMonth - 1, birthDay);
      if (occurrenceUtc < todayUtc) {
        occurrenceUtc = Date.UTC(today.getFullYear() + 1, birthMonth - 1, birthDay);
      }

      const daysUntil = Math.round((occurrenceUtc - todayUtc) / millisecondsPerDay);
      const occurrenceYear = new Date(occurrenceUtc).getUTCFullYear();

      return {
        birthdate: student.birthdate,
        daysUntil,
        firstName: student.firstName,
        lastName: student.lastName,
        preferredName: student.preferredName,
        studentId: student.id,
        turningAge: occurrenceYear - birthYear,
      };
    })
    .filter((entry): entry is UpcomingBirthday => entry !== undefined && entry.daysUntil <= withinDays)
    .sort((a, b) => a.daysUntil - b.daysUntil || a.lastName.localeCompare(b.lastName));
}
