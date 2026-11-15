"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Bell, Building2, CalendarDays, CheckSquare, ClipboardCheck, Clock3, LayoutDashboard, Menu, Moon, Shield, Sun, UserRound, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";

const groups = [
  {
    label: "My work",
    items: [
      { href: "/", label: "Home", icon: LayoutDashboard },
      { href: "/attendance", label: "Attendance", icon: ClipboardCheck },
      { href: "/requests/excuse", label: "Excuse request", icon: Clock3 },
    ],
  },
  {
    label: "Sales",
    items: [
      { href: "/meetings", label: "Meetings", icon: CalendarDays },
      { href: "/field-agents", label: "Field activity", icon: Building2 },
    ],
  },
  {
    label: "Management",
    items: [
      { href: "/approvals", label: "Approvals", icon: CheckSquare },
      { href: "/employees", label: "People", icon: UserRound },
      { href: "/admin", label: "Admin panel", icon: Shield },
    ],
  },
];

const allItems = groups.flatMap((g) => g.items);

// The most specific matching route wins, so only one item is ever highlighted.
function activeHref(pathname: string) {
  const matches = allItems.filter((i) => (i.href === "/" ? pathname === "/" : pathname === i.href || pathname.startsWith(i.href + "/")));
  return matches.sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const active = activeHref(pathname);
  const current = allItems.find((i) => i.href === active);
  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);

  const sidebar = (
    <aside className={cn("fixed inset-y-0 left-0 z-40 flex w-[256px] flex-col border-r border-[#DCE9E6] bg-white transition-transform dark:border-slate-800 dark:bg-[#0B1514] lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
      <div className="flex h-[88px] items-center justify-between px-5">
        <Link href="/" onClick={() => setOpen(false)} aria-label="B Investment home" className="rounded-lg bg-white px-1">
          <Image src="/logo-full.png" alt="B Investment for Real Estate" width={3101} height={1589} priority className="h-auto w-[148px]" />
        </Link>
        <button className="text-slate-400 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {groups.map((group) => (
          <div key={group.label} className="mt-5 first:mt-2">
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#82928F]">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  aria-current={active === href ? "page" : undefined}
                  className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition", active === href ? "bg-[#0B4F4B] text-white" : "text-slate-600 hover:bg-[#E8F3F1] hover:text-[#0B4F4B] dark:text-slate-300 dark:hover:bg-[#133E3C]")}
                >
                  <Icon className="h-4 w-4" />{label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <p className="border-t border-[#DCE9E6] px-5 py-3 text-[11px] leading-4 text-slate-400 dark:border-slate-800">Demo data only. Nothing is saved or sent.</p>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[#F5F8F7] text-slate-900 dark:bg-[#07100F] dark:text-slate-100">
      {sidebar}
      {open && <button aria-label="Close menu" onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" />}
      <main className="lg:pl-[256px]">
        <header className="flex h-16 items-center gap-3 border-b border-[#DCE9E6] bg-white px-4 dark:border-slate-800 dark:bg-[#0B1514] sm:px-8">
          <button onClick={() => setOpen(true)} className="text-slate-600 lg:hidden" aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{current?.label ?? "B Investment"}</p>
          <div className="ml-auto flex items-center gap-1">
            <button onClick={() => setDark(!dark)} className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-[#E8F3F1] hover:text-[#0B4F4B] dark:hover:bg-[#133E3C]" aria-label="Toggle dark mode">{dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
            <Link href="/notifications" aria-label="Notifications" className="relative grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-[#E8F3F1] hover:text-[#0B4F4B] dark:hover:bg-[#133E3C]"><Bell className="h-4 w-4" /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-500" /></Link>
            <div className="ml-2 flex items-center gap-2.5 border-l border-[#DCE9E6] pl-4 dark:border-slate-800">
              <Avatar name="Ahmed Khalil" className="h-8 w-8 bg-[#0B4F4B]" />
              <div className="hidden leading-tight sm:block"><p className="text-sm font-semibold">Ahmed Khalil</p><p className="text-xs text-slate-500">Broker</p></div>
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-[1200px] p-4 sm:p-8">{children}</div>
      </main>
    </div>
  );
}
