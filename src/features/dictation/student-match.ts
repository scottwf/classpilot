export type MatchableStudent = {
  id: string;
  firstName: string;
  lastName: string;
  preferredName: string;
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Resolves a name the model heard in a dictation transcript to exactly one
 * roster entry, or null if it can't be resolved with confidence (unknown
 * name, or ambiguous -- e.g. two students who share a first name). An
 * unresolved match is a real outcome the review UI must surface for the
 * teacher to assign manually, never a silent guess -- see issue #36.
 *
 * Matches on preferred name, first name, last name, or "first last" full
 * name, case-insensitively. Deliberately no fuzzy/typo tolerance in v1: a
 * wrong guess (attaching a note to the wrong child) is worse than an
 * unresolved one the teacher has to pick manually.
 */
export function matchStudentName(
  nameGuess: string,
  roster: MatchableStudent[],
): string | null {
  const target = normalize(nameGuess);

  if (!target) {
    return null;
  }

  const matches = roster.filter((student) => {
    const candidates = [
      student.preferredName,
      student.firstName,
      student.lastName,
      `${student.firstName} ${student.lastName}`,
    ].map(normalize);

    return candidates.includes(target);
  });

  const uniqueIds = new Set(matches.map((student) => student.id));

  return uniqueIds.size === 1 ? matches[0].id : null;
}
