Capture ideas here as they come up without interrupting whatever's in progress. Ask
Claude to sweep this into the session task list periodically — items get removed from
here once they're tracked there.

## Issues:

- /lessons/new's outcome picker has the same unfiltered-list bug UnitForm.tsx had
  (task #40 fixed it there): `plannerData.outcomes.slice(0, 80)`, not scoped to the
  lesson's class/unit subject. Also its Unit dropdown lists every unit in the
  school year unfiltered, not just the selected class's units.

## Features:

