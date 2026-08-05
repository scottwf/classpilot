"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { logoutAction } from "@/app/login/actions";

type NavItem = { href: string; label: string; page: string };

type MobileNavProps = {
  activePage: string;
  navItems: readonly NavItem[];
};

export function MobileNav({ activePage, navItems }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <div className="flex items-center justify-between">
        <button
          aria-expanded={open}
          aria-label="Toggle navigation menu"
          className="-ml-2 rounded-md p-2 text-slate-600 hover:bg-slate-100"
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          {open ? (
            <X aria-hidden="true" className="size-5" />
          ) : (
            <Menu aria-hidden="true" className="size-5" />
          )}
        </button>
        <form action={logoutAction}>
          <button
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            type="submit"
          >
            Sign out
          </button>
        </form>
      </div>

      {open ? (
        <nav className="mt-1 space-y-1 border-t border-slate-200 pb-2 pt-2">
          {navItems.map((item) => (
            <Link
              className={[
                "block rounded-md px-3 py-2 text-sm font-medium",
                activePage === item.page
                  ? "bg-blue-600 text-white"
                  : "text-slate-600 hover:bg-slate-100",
              ].join(" ")}
              href={item.href}
              key={item.href}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
