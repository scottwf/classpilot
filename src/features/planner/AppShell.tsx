import Link from "next/link";
import {
  BookOpen,
  Bot,
  GanttChart,
  LayoutDashboard,
  Settings,
  Target,
  Users,
} from "lucide-react";
import type { PlannerData } from "./types";
import { MobileBottomNav } from "./MobileBottomNav";
import { PlannerHeader } from "./PlannerHeader";
import { getBuildInfo } from "@/src/lib/build-info";

type AppShellProps = {
  activePage:
    | "planbook"
    | "lessons"
    | "outcomes"
    | "units"
    | "classes"
    | "students"
    | "assistant"
    | "settings"
    | "onboarding";
  children: React.ReactNode;
  data: PlannerData;
};

// Calendar and Schedule moved under Settings (see SettingsTabs.tsx) — not
// top-level nav items anymore.
const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard", page: "planbook" },
  { href: "/lessons", icon: BookOpen, label: "Lessons", page: "lessons" },
  { href: "/outcomes", icon: Target, label: "Outcomes", page: "outcomes" },
  { href: "/units", icon: GanttChart, label: "Unit Timeline", page: "units" },
  { href: "/students", icon: Users, label: "Students", page: "students" },
  { href: "/assistant", icon: Bot, label: "Assistant", page: "assistant" },
  { href: "/settings", icon: Settings, label: "Settings", page: "settings" },
] as const;

// Mobile bottom tab bar shows these four always; everything else (including
// Sign out) lives under its "More" tab. Assistant is the leading candidate
// to be promoted here once it becomes a real chat interface.
const primaryMobilePages = new Set(["planbook", "lessons", "students", "units"]);
// MobileBottomNav is a client component — strip the `icon` component
// reference before crossing that boundary (React serializes the whole
// object, not just the fields the client-side type declares, so leaving it
// in still throws "Functions cannot be passed directly to Client
// Components" even though MobileBottomNav's own type never reads it).
const mobileNavItems = navItems.map(({ href, label, page }) => ({ href, label, page }));
const primaryMobileItems = mobileNavItems.filter((item) => primaryMobilePages.has(item.page));
const moreMobileItems = mobileNavItems.filter((item) => !primaryMobilePages.has(item.page));

function formatBuiltAt(builtAt: string | null): string | null {
  if (!builtAt) {
    return null;
  }

  return `${new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(builtAt))} UTC`;
}

export function AppShell({ activePage, children, data }: AppShellProps) {
  const buildInfo = getBuildInfo();
  const builtAtLabel = formatBuiltAt(buildInfo.builtAt);

  return (
    <main className="min-h-screen bg-slate-100">
      <PlannerHeader data={data} />

      <div className="hidden border-b border-slate-200 bg-white md:block">
        <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-2">
            <nav aria-label="Primary" className="flex flex-wrap gap-1">
              {navItems.map((item) => (
                <Link
                  className={[
                    "flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium",
                    activePage === item.page
                      ? "bg-blue-600 text-white"
                      : "text-slate-600 hover:bg-slate-100",
                  ].join(" ")}
                  href={item.href}
                  key={item.href}
                >
                  <item.icon aria-hidden="true" className="size-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
            {/* Plain POST navigation, not a Server Action -- see
                app/logout/route.ts for why. */}
            <form action="/logout" method="post">
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

        <footer className="pt-4 text-center text-xs text-slate-400">
          {buildInfo.commitShort === "dev"
            ? "Local dev build"
            : `Build ${buildInfo.commitShort} (${buildInfo.branch})${builtAtLabel ? ` — built ${builtAtLabel}` : ""}`}
        </footer>
      </div>

      <MobileBottomNav
        activePage={activePage}
        moreItems={moreMobileItems}
        primaryItems={primaryMobileItems}
      />
    </main>
  );
}
