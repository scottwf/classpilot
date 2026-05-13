type ViewSwitcherProps = {
  date: string;
  view: "day" | "week";
};

export function ViewSwitcher({ date, view }: ViewSwitcherProps) {
  return (
    <nav
      aria-label="Planner view"
      className="flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm"
    >
      <a
        className={viewLinkClass(view === "day")}
        href={`/?view=day&date=${date}`}
      >
        Day
      </a>
      <a
        className={viewLinkClass(view === "week")}
        href={`/?view=week&date=${date}`}
      >
        Week
      </a>
    </nav>
  );
}

function viewLinkClass(active: boolean) {
  return [
    "rounded-md px-4 py-2 text-sm font-medium",
    active ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100",
  ].join(" ");
}
