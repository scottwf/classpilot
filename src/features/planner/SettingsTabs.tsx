import Link from "next/link";

type SettingsTab = "years" | "ai" | "classes" | "calendar" | "schedule" | "account";

const tabs: { key: SettingsTab; href: string; label: string }[] = [
  { key: "years", href: "/settings", label: "School Years" },
  { key: "ai", href: "/settings/ai", label: "AI Providers" },
  { key: "classes", href: "/settings/classes", label: "Classes" },
  { key: "calendar", href: "/settings/calendar", label: "Calendar" },
  { key: "schedule", href: "/settings/schedule", label: "Schedule" },
  { key: "account", href: "/settings/account", label: "Accounts" },
];

/**
 * Real routes, not client-side tab state — each settings section is its own
 * page (see app/settings/**\/page.tsx), this just renders the switcher.
 */
export function SettingsTabs({ active }: { active: SettingsTab }) {
  return (
    <nav aria-label="Settings sections" className="flex flex-wrap gap-1 border-b border-slate-200 pb-px">
      {tabs.map((tab) => (
        <Link
          className={[
            "rounded-t-md border-b-2 px-3 py-2 text-sm font-medium",
            active === tab.key
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-slate-500 hover:text-slate-800",
          ].join(" ")}
          href={tab.href}
          key={tab.key}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
