"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Bell, CalendarDays, ChevronDown, ClipboardCheck, LayoutDashboard, Menu, Moon, Search, Sun, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";

const navigation = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/employees", label: "People", icon: Users },
  { href: "/attendance", label: "Attendance", icon: ClipboardCheck },
  { href: "/meetings", label: "Meetings", icon: CalendarDays },
];
const management = [
  { href: "/field-agents", label: "Field agents" }, { href: "/notifications", label: "Alerts" }, { href: "/settings", label: "Users & settings" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname(); const [open, setOpen] = useState(false); const [dark, setDark] = useState(false);
  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);
  const nav = <nav className="space-y-1 px-3">{navigation.map(({ href, label, icon: Icon }) => <Link onClick={() => setOpen(false)} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition", (pathname === href || (href !== "/" && pathname.startsWith(href))) ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800")} href={href} key={href}><Icon className="h-4 w-4" />{label}</Link>)}</nav>;
  return <div className="min-h-screen bg-slate-50 dark:bg-slate-950"><aside className={cn("fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform dark:border-slate-800 dark:bg-slate-900 lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}><div className="flex h-[72px] items-center justify-between px-6"><Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight"><span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-white">O</span>OpsHub</Link><button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close navigation"><X className="h-5 w-5" /></button></div>{nav}<p className="px-6 pt-7 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Manage</p><nav className="space-y-1 px-3">{management.map(({ href, label }) => <Link onClick={() => setOpen(false)} className={cn("block rounded-xl px-3 py-2 text-sm font-medium", pathname.startsWith(href) ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800")} href={href} key={href}>{label}</Link>)}</nav><div className="mt-auto m-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><p className="text-xs font-semibold">Prototype workspace</p><p className="mt-1 text-xs leading-4 text-slate-500 dark:text-slate-400">Demo data only. Integrations are intentionally disabled.</p></div></aside>{open && <button aria-label="Close overlay" onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" />}<main className="lg:pl-64"><header className="sticky top-0 z-20 flex h-[72px] items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 sm:px-7"><button onClick={() => setOpen(true)} className="lg:hidden" aria-label="Open navigation"><Menu className="h-5 w-5" /></button><label className="hidden max-w-sm flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800 sm:flex"><Search className="h-4 w-4" /><input className="w-full bg-transparent outline-none placeholder:text-slate-400" placeholder="Search people, customers, meetings…" /></label><div className="ml-auto flex items-center gap-2"><button onClick={() => setDark(!dark)} className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Toggle color theme">{dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button><Link href="/notifications" className="relative grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><Bell className="h-4 w-4" /><span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-rose-500" /></Link><button className="flex items-center gap-2 rounded-xl p-1 text-left hover:bg-slate-100 dark:hover:bg-slate-800"><Avatar name="Sofia Bennett" className="h-8 w-8" /><ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" /></button></div></header><div className="mx-auto max-w-7xl p-4 sm:p-7">{children}</div></main></div>;
}
