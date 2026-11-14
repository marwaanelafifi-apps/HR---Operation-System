import Link from "next/link";
import { ArrowUpRight, CalendarDays, ChevronRight, MapPin, Plus, Sparkles, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const myMeetings = [
  { id: "m-1042", title: "Growth planning session", organisation: "Acme Studios", date: "Today", time: "2:30 PM", duration: "60 min", location: "Zamalek, Cairo", status: "Confirmed", tone: "success" as const },
  { id: "m-1046", title: "Weekly operations review", organisation: "Internal", date: "Today", time: "4:30 PM", duration: "45 min", location: "Cairo HQ", status: "Scheduled", tone: "info" as const },
  { id: "m-1047", title: "Quarterly planning", organisation: "Leadership team", date: "Tomorrow", time: "10:00 AM", duration: "60 min", location: "Cairo HQ", status: "Scheduled", tone: "info" as const },
  { id: "m-1048", title: "Project handover", organisation: "Product team", date: "Nov 18", time: "11:30 AM", duration: "30 min", location: "Remote", status: "Scheduled", tone: "info" as const },
];

export function MeetingsWorkspace() {
  const nextMeeting = myMeetings[0];
  return <div className="pb-8">
    <header className="mb-8 flex flex-col gap-5 border-b border-slate-200/80 pb-6 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-400"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Friday · November 13</div>
        <h1 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white sm:text-4xl">My meetings</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">Your schedule, preparation, and next steps—without exposing other employees’ meetings.</p>
      </div>
      <Button asChild><Link href="/bookings"><Plus className="h-4 w-4" />New meeting</Link></Button>
    </header>

    <section className="mb-6 grid gap-3 sm:grid-cols-3">
      <MeetingMetric label="Meetings today" value="2" detail="One starts in 2 hours" tone="indigo" />
      <MeetingMetric label="This week" value="6" detail="3 require preparation" tone="emerald" />
      <MeetingMetric label="Time in meetings" value="4h 15m" detail="Scheduled this week" tone="amber" />
    </section>

    <section className="relative overflow-hidden rounded-3xl bg-slate-950 p-1 shadow-[0_20px_50px_-22px_rgba(15,23,42,0.55)] dark:bg-slate-800">
      <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-slate-900 via-indigo-950 to-indigo-800 px-6 py-7 text-white sm:px-8 sm:py-8">
        <div className="absolute -right-10 -top-20 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="absolute -bottom-32 right-52 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="relative grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="mb-6 flex items-center gap-2"><span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur"><Sparkles className="h-3.5 w-3.5 text-amber-300" /> Up next</span><span className="text-xs text-indigo-200">Starts in 2 hours</span></div>
            <p className="text-sm font-medium text-indigo-200">{nextMeeting.time} · {nextMeeting.duration}</p>
            <h2 className="mt-1 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{nextMeeting.title}</h2>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-indigo-100"><span className="inline-flex items-center gap-2"><Users className="h-4 w-4" />{nextMeeting.organisation}</span><span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" />{nextMeeting.location}</span></div>
          </div>
          <Button asChild className="bg-white text-indigo-800 shadow-lg shadow-black/20 hover:bg-indigo-50"><Link href={`/meetings/${nextMeeting.id}`}>Open meeting <ArrowUpRight className="h-4 w-4" /></Link></Button>
        </div>
      </div>
      <div className="flex items-center justify-between bg-slate-950 px-5 py-3.5 text-xs text-slate-400 dark:bg-slate-800"><span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-indigo-300" /> Your meeting data is visible only to you and authorised managers.</span><Link className="hidden text-indigo-300 hover:text-white sm:block" href="/bookings">Schedule another meeting →</Link></div>
    </section>

    <section className="mt-6 rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-base font-semibold text-slate-950 dark:text-white">My agenda</h2><p className="mt-1 text-sm text-slate-500">Your upcoming meetings for this week</p></div><button className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">This week <ChevronRight className="h-4 w-4" /></button></div>
      <div className="divide-y divide-slate-100 px-3 py-1 dark:divide-slate-800">{myMeetings.map((meeting) => <Link href={`/meetings/${meeting.id}`} key={meeting.id} className="group grid gap-3 rounded-2xl px-3 py-4 transition hover:bg-slate-50 sm:grid-cols-[130px_1fr_auto] sm:items-center dark:hover:bg-slate-800/70"><div><p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{meeting.date} · {meeting.time}</p><p className="mt-1 text-xs text-slate-400">{meeting.duration}</p></div><div><p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{meeting.title}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" />{meeting.organisation} · {meeting.location}</p></div><div className="flex items-center gap-3"><Badge tone={meeting.tone}>{meeting.status}</Badge><ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-500" /></div></Link>)}</div>
    </section>
  </div>;
}

function MeetingMetric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: "emerald" | "amber" | "indigo" }) {
  const color = { emerald: "bg-emerald-500", amber: "bg-amber-500", indigo: "bg-indigo-500" }[tone];
  return <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center gap-2 text-xs font-medium text-slate-500"><span className={`h-2 w-2 rounded-full ${color}`} />{label}</div><div className="mt-2 flex items-end justify-between"><p className="text-2xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">{value}</p><p className="text-xs text-slate-400">{detail}</p></div></div>;
}
