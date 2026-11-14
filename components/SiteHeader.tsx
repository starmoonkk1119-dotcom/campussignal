"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useApp } from "@/lib/store";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/discover", label: "Discover" },
  { href: "/planner", label: "Planner" },
  { href: "/profile", label: "Profile" },
] as const;

export default function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { resetDemo } = useApp();

  function handleReset() {
    resetDemo();
    router.refresh();
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-8">
        <div className="flex items-center justify-between gap-4 sm:justify-start">
          <Link
            href="/"
            className="text-base font-bold tracking-tight text-navy focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
          >
            CampusSignal
          </Link>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-500 hover:text-navy focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 sm:hidden"
          >
            Reset
          </button>
        </div>

        <nav aria-label="Main" className="-mx-1 overflow-x-auto">
          <ul className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`inline-block whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 ${
                      isActive
                        ? "bg-slate-100 text-navy"
                        : "text-slate-600 hover:bg-slate-50 hover:text-navy"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <button
          type="button"
          onClick={handleReset}
          className="hidden shrink-0 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-500 hover:text-navy focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 sm:inline-block"
        >
          Reset demo data
        </button>
      </div>
    </header>
  );
}
