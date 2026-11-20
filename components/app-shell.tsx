"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { BarChart3, Bell, CalendarDays, CheckSquare, ClipboardCheck, Clock3, FileText, History, LayoutDashboard, ListChecks, Menu, Moon, Receipt, Settings2, Shield, Sun, UserRound, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";

const groups = [
  {
    label: "My work",
    items: [
      { href: "/", label: "Home", icon: LayoutDashboard },
      { href: "/attendance", label: "Attendance", icon: ClipboardCheck },
      { href: "/requests/excuse", label: "HR Requests", icon: Clock3 },
    ],
  },
  {
    label: "CRM",
    items: [
      { href: "/crm/tasks", label: "Daily Tasks", icon: ListChecks },
      { href: "/crm/requests", label: "Client Requests", icon: Users },
      { href: "/meetings", label: "Client Meetings", icon: CalendarDays },
      { href: "/crm/history", label: "My Tasks History", icon: History },
    ],
  },
  {
    label: "Management",
    items: [
      { href: "/crm/performance", label: "Team Performance", icon: BarChart3 },
      { href: "/management/requests", label: "All Requests", icon: Users },
      { href: "/management/meetings", label: "All Meetings", icon: CalendarDays },
      { href: "/approvals", label: "Approvals", icon: CheckSquare },
      { href: "/employees", label: "People", icon: UserRound },
      { href: "/finance", label: "Finance", icon: Receipt },
      { href: "/crm/settings", label: "CRM Tasks", icon: Settings2 },
      { href: "/admin", label: "Admin panel", icon: Shield },
    ],
  },
];

const allItems = groups.flatMap((g) => g.items);

function activeHref(pathname: string) {
  const matches = allItems.filter((i) => (i.href === "/" ? pathname === "/" : pathname === i.href || pathname.startsWith(i.href + "/")));
  return matches.sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

// ── Static demo notifications ─────────────────────────────────────────────────
const DEMO_NOTIFICATIONS = [
  { id: "1", title: "Meeting starts in 30 minutes", desc: "Growth planning with Acme Studios", time: "now", unread: true },
  { id: "2", title: "Arrival verified", desc: "Marcus Johnson checked in at Zamalek", time: "8 min ago", unread: true },
  { id: "3", title: "Form completed", desc: "Acme Studios submitted Enterprise discovery", time: "1 hr ago", unread: true },
  { id: "4", title: "Excuse approved", desc: "Your morning excuse for Nov 15 was approved", time: "2 hr ago", unread: false },
  { id: "5", title: "New announcement", desc: "Welcome to OpsHub — check the Home page", time: "3 days ago", unread: false },
];

// ── Sound: Web Audio API beep (no file needed) ────────────────────────────────
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch { /* AudioContext not available */ }
}

// ── Browser notification ──────────────────────────────────────────────────────
async function sendBrowserNotification(title: string, body: string) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
  if (Notification.permission === "granted") {
    new Notification(title, { body, icon: "/Logo.png" });
  }
}

// ── Notification dropdown ─────────────────────────────────────────────────────
function NotificationDropdown({ onClose, unreadCount, onMarkAllRead }: { onClose: () => void; unreadCount: number; onMarkAllRead: () => void }) {
  const [markedRead, setMarkedRead] = useState(false);
  const notifications = markedRead
    ? DEMO_NOTIFICATIONS.map(n => ({ ...n, unread: false }))
    : DEMO_NOTIFICATIONS;

  function handleMarkAllRead() {
    setMarkedRead(true);
    onMarkAllRead();
  }

  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-[#DCE9E6] bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#DCE9E6] px-4 py-3 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</span>
          {unreadCount > 0 && (
            <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{unreadCount}</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} className="text-xs font-semibold text-[#0B4F4B] hover:underline dark:text-[#8FD4C6]">
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <ul className="max-h-80 overflow-y-auto divide-y divide-[#DCE9E6] dark:divide-slate-800">
        {notifications.map(n => (
          <li key={n.id} className={`flex items-start gap-3 px-4 py-3 ${n.unread ? "bg-[#F5F8F7] dark:bg-[#0F1E1C]" : ""}`}>
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.unread ? "bg-[#0B4F4B]" : "bg-slate-200 dark:bg-slate-700"}`} />
            <div className="min-w-0 flex-1">
              <p className={`text-sm ${n.unread ? "font-semibold text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400"}`}>{n.title}</p>
              <p className="mt-0.5 truncate text-xs text-slate-400">{n.desc}</p>
            </div>
            <span className="shrink-0 text-[11px] text-slate-400">{n.time}</span>
          </li>
        ))}
      </ul>

      {/* Footer */}
      <div className="border-t border-[#DCE9E6] dark:border-slate-700">
        <Link
          href="/notifications"
          onClick={onClose}
          className="flex w-full items-center justify-center py-3 text-sm font-semibold text-[#0B4F4B] hover:bg-[#E8F3F1] dark:text-[#8FD4C6] dark:hover:bg-[#133E3C]"
        >
          View all notifications
        </Link>
      </div>
    </div>
  );
}

// ── App shell ─────────────────────────────────────────────────────────────────
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [ringing, setRinging] = useState(false);
  const [unreadCount, setUnreadCount] = useState(DEMO_NOTIFICATIONS.filter(n => n.unread).length);
  const notifRef = useRef<HTMLDivElement>(null);
  const prevUnread = useRef(unreadCount);

  const active = activeHref(pathname);
  const current = allItems.find((i) => i.href === active);

  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);

  // Ring animation + sound + browser notification when unread count increases
  const triggerAlert = useCallback((title: string, body: string) => {
    setRinging(true);
    setTimeout(() => setRinging(false), 2000);
    playNotificationSound();
    sendBrowserNotification(title, body);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!notifOpen) return;
    function handler(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [notifOpen]);

  // Close dropdown on route change
  useEffect(() => { setNotifOpen(false); }, [pathname]);

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

            {/* Bell with dropdown */}
            <div ref={notifRef} className="relative">
              <button
                onClick={() => { setNotifOpen(o => !o); setRinging(false); }}
                aria-label="Notifications"
                className="relative grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-[#E8F3F1] hover:text-[#0B4F4B] dark:hover:bg-[#133E3C]"
              >
                <Bell className={`h-4 w-4 origin-top transition-transform ${ringing ? "animate-[ring_0.5s_ease-in-out_infinite]" : ""}`} />
                {unreadCount > 0 && (
                  <span className={`absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-0.5 text-[10px] font-bold text-white ${ringing ? "animate-bounce" : ""}`}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && <NotificationDropdown onClose={() => setNotifOpen(false)} unreadCount={unreadCount} onMarkAllRead={() => setUnreadCount(0)} />}
            </div>

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
