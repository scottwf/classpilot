import Link from "next/link";
import { logoutAction } from "@/app/login/actions";
import type { PlannerData } from "./types";
import { MobileBottomNav } from "./MobileBottomNav";
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
    | "settings"
    | "onboarding";
  children: React.ReactNode;
  data: PlannerData;
};

const navItems = [
  { href: "/", label: "Dashboard", page: "planbook" },
  { href: "/lessons", label: "Lessons", page: "lessons" },
  { href: "/outcomes", label: "Outcomes", page: "outcomes" },
  { href: "/units", label: "Unit Timeline", page: "units" },
  { href: "/schedule", label: "Schedule", page: "schedule" },
  { href: "/students", label: "Students", page: "students" },
  { href: "/calendar", label: "Calendar", page: "calendar" },
  { href: "/assistant", label: "Assistant", page: "assistant" },
  { href: "/settings", label: "Settings", page: "settings" },
] as const;

// Mobile bottom tab bar shows these four always; everything else (including
// Sign out) lives under its "More" tab. Assistant is the leading candidate
// to be promoted here once it becomes a real chat interface.
const primaryMobilePages = new Set(["planbook", "lessons", "students", "schedule"]);
const primaryMobileItems = navItems.filter((item) => primaryMobilePages.has(item.page));
const moreMobileItems = navItems.filter((item) => !primaryMobilePages.has(item.page));

export function AppShell({ activePage, children, data }: AppShellProps) {
  const instructionalDays = buildInstructionalDays(data.schoolYear);

  return (
    <main className="min-h-screen bg-slate-100">
      <PlannerHeader
        data={data}
        instructionalDayCount={instructionalDays.length}
      />

      <div className="hidden border-b border-slate-200 bg-white md:block">
        <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-2">
            <nav aria-label="Primary" className="flex flex-wrap gap-1">
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
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-5 px-4 pb-24 pt-4 sm:px-6 sm:pt-5 md:pb-4 lg:px-8">
        {children}
      </div>

      <MobileBottomNav
        activePage={activePage}
        moreItems={moreMobileItems}
        primaryItems={primaryMobileItems}
      />
    </main>
  );
}
