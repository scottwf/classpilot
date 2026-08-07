const birthdatePattern = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Calculated age in whole years from a "YYYY-MM-DD" birthdate. Works on
 * plain date components (not a parsed Date) to sidestep timezone parsing
 * pitfalls entirely — `today` defaults to the real current date but can be
 * passed in for deterministic testing.
 */
export function calculateAge(birthdateKey: string, today: Date = new Date()): number | undefined {
  const match = birthdatePattern.exec(birthdateKey);

  if (!match) {
    return undefined;
  }

  const birthYear = Number(match[1]);
  const birthMonth = Number(match[2]);
  const birthDay = Number(match[3]);

  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();

  let age = todayYear - birthYear;
  const hasHadBirthdayThisYear =
    todayMonth > birthMonth || (todayMonth === birthMonth && todayDay >= birthDay);

  if (!hasHadBirthdayThisYear) {
    age -= 1;
  }

  return age;
}
