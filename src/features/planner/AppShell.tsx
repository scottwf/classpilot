import Link from "next/link";
import { logoutAction } from "@/app/login/actions";
import type { PlannerData } from "./types";
import { MobileNav } from "./MobileNav";
import { PlannerHeader } from "./PlannerHeader";
import { buildInstructionalDays } from "./timeline";

type AppShellProps = {
  activePage:
    | "planbook"
    | "lessons"
    | "outcomes"
    | "units"
    | "classes"
    | "schedule"
    | "students"
    | "calendar"
    | "assistant"
    | "settings";
  children: React.ReactNode;
  data: PlannerData;
};

const navItems = [
  { href: "/", label: "Plan Book", page: "planbook" },
  { href: "/lessons", label: "Lessons", page: "lessons" },
  { href: "/outcomes", label: "Outcomes", page: "outcomes" },
  { href: "/units", label: "Unit Timeline", page: "units" },
  { href: "/classes", label: "Classes", page: "classes" },
  { href: "/schedule", label: "Schedule", page: "schedule" },
  { href: "/students", label: "Students", page: "students" },
  { href: "/calendar", label: "Calendar", page: "calendar" },
  { href: "/assistant", label: "Assistant", page: "assistant" },
  { href: "/settings", label: "Settings", page: "settings" },
] as const;

export function AppShell({ activePage, children, data }: AppShellProps) {
  const instructionalDays = buildInstructionalDays(data.schoolYear);

  return (
    <main className="min-h-screen bg-slate-100">
      <PlannerHeader
        data={data}
        instructionalDayCount={instructionalDays.length}
      />

      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
          <div className="hidden items-center justify-between gap-2 md:flex">
            <nav className="flex flex-wrap gap-1">
              {navItems.map((item) => (
                <Link
                  className={[
                    "whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium",
                    activePage === item.page
                      ? "bg-blue-600 text-white"
                      : "text-slate-600 hover:bg-slate-100",
                  ].join(" ")}
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <form action={logoutAction}>
              <button
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                type="submit"
              >
                Sign out
              </button>
            </form>
          </div>

          <MobileNav activePage={activePage} navItems={navItems} />
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-5 px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        {children}
      </div>
    </main>
  );
}
