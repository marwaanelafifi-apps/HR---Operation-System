import Link from "next/link";
import { ArrowRight, CalendarDays, Clock3, MapPin, MapPinned } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { excuseRequests, meetings, outsideMeetingRequests } from "@/lib/mock-data";

const me = "Ahmed Khalil";

const actions = [
  { href: "/attendance", title: "Check in", hint: "Verify your location at the office", icon: MapPin },
  { href: "/meetings", title: "Request a site visit", hint: "Submit a day before the meeting", icon: MapPinned },
  { href: "/requests/excuse", title: "Request an excuse", hint: "Late arrival or early leave, 1 hour", icon: Clock3 },
];

export function HomeDashboard() {
  const myVisits = outsideMeetingRequests.filter((r) => r.employeeName === me);
  const myExcuses = excuseRequests.filter((r) => r.employeeName === me);
  const used = myExcuses.filter((r) => r.status === "approved").reduce((s, r) => s + r.hoursUsed, 0);
  const waiting = [...myVisits, ...myExcuses].filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-8 pb-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">Good morning, Ahmed</h1>
        <p className="mt-1.5 text-sm text-slate-500">Your shift today is 11:00 AM – 7:00 PM.</p>
      </header>

      <section aria-label="Quick actions" className="grid gap-3 sm:grid-cols-3">
        {actions.map(({ href, title, hint, icon: Icon }, i) => (
          <Link key={href} href={href} className={`group flex items-center gap-4 rounded-2xl border p-5 transition ${i === 0 ? "border-[#0B4F4B] bg-[#0B4F4B] text-white hover:bg-[#063C39]" : "border-[#DCE9E6] bg-white hover:border-[#0B4F4B] dark:border-slate-800 dark:bg-slate-900"}`}>
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${i === 0 ? "bg-white/15" : "bg-[#E8F3F1] text-[#0B4F4B] dark:bg-[#133E3C] dark:text-[#8FD4C6]"}`}><Icon className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1"><b className="block text-base">{title}</b><span className={`block text-xs ${i === 0 ? "text-white/75" : "text-slate-500"}`}>{hint}</span></span>
            <ArrowRight className="h-4 w-4 opacity-60 transition group-hover:translate-x-0.5" />
          </Link>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="rounded-2xl border border-[#DCE9E6] bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-[#DCE9E6] px-5 py-4 dark:border-slate-800">
            <h2 className="text-base font-semibold">Upcoming meetings</h2>
            <Link href="/meetings" className="text-sm font-semibold text-[#0B4F4B] hover:underline dark:text-[#8FD4C6]">See all</Link>
          </div>
          <ul className="divide-y divide-[#DCE9E6] dark:divide-slate-800">
            {meetings.map((m) => (
              <li key={m.id}>
                <Link href={`/meetings/${m.id}`} className="flex items-center gap-4 px-5 py-4 transition hover:bg-[#F5F8F7] dark:hover:bg-slate-800/60">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#E8F3F1] text-[#0B4F4B] dark:bg-[#133E3C] dark:text-[#8FD4C6]"><CalendarDays className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1"><b className="block truncate text-sm">{m.title}</b><span className="text-xs text-slate-500">{m.time} · {m.location}</span></span>
                  <Badge tone={m.status === "Confirmed" ? "success" : "info"}>{m.status}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-[#DCE9E6] bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-semibold">Excuse hours</h2>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{4 - used}<span className="text-base font-medium text-slate-400"> of 4 left</span></p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E8F3F1] dark:bg-slate-800"><div className="h-full rounded-full bg-[#0B4F4B]" style={{ width: `${((4 - used) / 4) * 100}%` }} /></div>
            <p className="mt-2 text-xs text-slate-500">Resets on the 1st of each month.</p>
          </section>
          <section className="rounded-2xl border border-[#DCE9E6] bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-semibold">Waiting for approval</h2>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{waiting}<span className="text-base font-medium text-slate-400"> request{waiting === 1 ? "" : "s"}</span></p>
            <p className="mt-2 text-xs text-slate-500">Approved by the CEO or GM.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
