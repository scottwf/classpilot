"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Bot,
  Calendar,
  Clock,
  GanttChart,
  LayoutDashboard,
  LayoutGrid,
  Settings,
  Target,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { logoutAction } from "@/app/login/actions";

type NavItem = { href: string; label: string; page: string };

// Icon components can't cross the server/client boundary as props (React
// can't serialize a function reference), so this client component keeps its
// own copy of the page->icon mapping instead of receiving it from AppShell.
const iconsByPage: Record<string, LucideIcon> = {
  planbook: LayoutDashboard,
  lessons: BookOpen,
  outcomes: Target,
  units: GanttChart,
  schedule: Clock,
  students: Users,
  calendar: Calendar,
  assistant: Bot,
  settings: Settings,
};

type MobileBottomNavProps = {
  activePage: string;
  primaryItems: readonly NavItem[];
  moreItems: readonly NavItem[];
};

/**
 * App-like bottom tab bar for mobile: a handful of daily-use pages always
 * visible, with a "More" tab revealing everything else (including Sign
 * out) in a sheet anchored just above the bar. Replaces the old
 * hamburger-only mobile nav — see AppShell.tsx for the primary/more split.
 */
export function MobileBottomNav({ activePage, primaryItems, moreItems }: MobileBottomNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const isMoreActive = moreItems.some((item) => item.page === activePage);

  return (
    <div className="md:hidden">
      {moreOpen ? (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-slate-950/20"
          onClick={() => setMoreOpen(false)}
        />
      ) : null}

      {moreOpen ? (
        <nav aria-label="More" className="fixed inset-x-0 bottom-16 z-50 mx-3 space-y-1 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
          {moreItems.map((item) => {
            const Icon = iconsByPage[item.page];
            return (
              <Link
                className={[
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
                  activePage === item.page
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-100",
                ].join(" ")}
                href={item.href}
                key={item.href}
                onClick={() => setMoreOpen(false)}
              >
                {Icon ? <Icon aria-hidden="true" className="size-4" /> : null}
                {item.label}
              </Link>
            );
          })}
          <form action={logoutAction}>
            <button
              className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-100"
              type="submit"
            >
              Sign out
            </button>
          </form>
        </nav>
      ) : null}

      <nav aria-label="Mobile" className="fixed inset-x-0 bottom-0 z-50 flex border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
        {primaryItems.map((item) => {
          const Icon = iconsByPage[item.page];
          return (
            <Link
              className={[
                "flex flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[0.65rem] font-medium",
                activePage === item.page ? "text-blue-700" : "text-slate-500",
              ].join(" ")}
              href={item.href}
              key={item.href}
              onClick={() => setMoreOpen(false)}
            >
              {Icon ? <Icon aria-hidden="true" className="size-4" /> : null}
              {item.label}
            </Link>
          );
        })}
        <button
          aria-expanded={moreOpen}
          className={[
            "flex flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[0.65rem] font-medium",
            moreOpen || isMoreActive ? "text-blue-700" : "text-slate-500",
          ].join(" ")}
          onClick={() => setMoreOpen((value) => !value)}
          type="button"
        >
          {moreOpen ? (
            <X aria-hidden="true" className="size-4" />
          ) : (
            <LayoutGrid aria-hidden="true" className="size-4" />
          )}
          More
        </button>
      </nav>
    </div>
  );
}
