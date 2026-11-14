"use client";

import { useState } from "react";
import { Building2, CalendarDays, Check, ChevronDown, Clock3, LoaderCircle, MapPin, Navigation, ShieldCheck, Timer, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

type CompanyLocation = { name: string; radius: string };
const defaultLocation: CompanyLocation = { name: "Cairo HQ", radius: "150" };

function configuredLocation(): CompanyLocation {
  if (typeof window === "undefined") return defaultLocation;
  try {
    return { ...defaultLocation, ...JSON.parse(window.localStorage.getItem("opshub-demo-company-location") ?? "{}") };
  } catch {
    return defaultLocation;
  }
}

type AttendanceState = "ready" | "checking" | "checked-in" | "checked-out" | "denied" | "unavailable";

export function AttendanceWorkspace() {
  const [state, setState] = useState<AttendanceState>("ready");
  const [location] = useState(configuredLocation);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<string | null>(null);
  const isCheckedIn = state === "checked-in";
  const isComplete = state === "checked-out";
  const issue = state === "denied" || state === "unavailable";

  const statusCopy = state === "checking"
    ? "Verifying your location…"
    : isCheckedIn
      ? "You’re checked in"
      : isComplete
        ? "Your workday is complete"
        : state === "denied"
          ? "Location permission is off"
          : state === "unavailable"
            ? "Location is currently unavailable"
            : "Ready to begin your day";

  return (
    <div className="pb-8">
      <header className="mb-8 flex flex-col gap-5 border-b border-slate-200/80 pb-6 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Friday · November 13
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white sm:text-4xl">Attendance</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">Your personal check-in, check-out, and workday record.</p>
        </div>
        <button className="flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
          <Clock3 className="h-4 w-4 text-slate-400" /> Today <ChevronDown className="h-4 w-4 text-slate-400" />
        </button>
      </header>

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <Metric label="Today’s status" value={isCheckedIn ? "On site" : isComplete ? "Complete" : "Not started"} detail={isCheckedIn ? "Checked in at 09:06 AM" : "Check in when you arrive"} tone={isCheckedIn ? "emerald" : "indigo"} />
        <Metric label="Scheduled start" value="09:00" detail="Cairo HQ schedule" tone="amber" />
        <Metric label="Worked today" value={isCheckedIn ? "00:00" : isComplete ? "08:04" : "00:00"} detail={isComplete ? "Shift completed" : "Updates after check-out"} tone="indigo" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.45fr)]">
        <section className="overflow-hidden rounded-3xl bg-slate-950 p-1 shadow-[0_20px_50px_-22px_rgba(15,23,42,0.55)] dark:bg-slate-800">
          <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-700 p-6 text-white sm:p-7">
            <div className="absolute -right-10 -top-12 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-20 left-20 h-40 w-40 rounded-full bg-violet-400/30 blur-3xl" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur">
                  <span className={`h-1.5 w-1.5 rounded-full ${isCheckedIn ? "bg-emerald-300" : issue ? "bg-amber-300" : "bg-white/80"}`} /> Today
                </span>
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10 backdrop-blur"><Navigation className="h-5 w-5" /></span>
              </div>
              <p className="mt-9 text-sm font-medium text-indigo-100">{statusCopy}</p>
              <h2 className="mt-1 text-3xl font-semibold tracking-[-0.035em]">{isCheckedIn ? checkInTime : isComplete ? checkOutTime : "Check in"}</h2>
              <p className="mt-2 max-w-sm text-sm leading-6 text-indigo-100/90">{isCheckedIn ? `Verified at ${location.name}` : isComplete ? `Checked out from ${location.name}` : `Confirm you are at ${location.name} to start your day.`}</p>
              <div className="mt-7 flex flex-wrap gap-2.5">
                <Button className="bg-white text-indigo-700 shadow-lg shadow-indigo-950/20 hover:bg-indigo-50" disabled={state === "checking" || isCheckedIn || isComplete} onClick={() => { setState("checking"); setTimeout(() => { setCheckInTime(currentTime()); setState("checked-in"); }, 650); }}>
                  {state === "checking" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Check in
                </Button>
                {isCheckedIn && <Button variant="outline" className="border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={() => { setCheckOutTime(currentTime()); setState("checked-out"); }}>Check out</Button>}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between bg-slate-950 px-5 py-3.5 text-xs text-slate-400 dark:bg-slate-800">
            <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-400" /> Your location is only checked when you tap an action.</span>
            <button className="hidden underline decoration-slate-600 underline-offset-4 hover:text-white sm:block" onClick={() => setState("denied")}>Test a blocked state</button>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="px-6 pb-4 pt-6"><h2 className="text-base font-semibold text-slate-950 dark:text-white">My workday</h2><p className="mt-1 text-sm text-slate-500">Only you and authorised managers can access your records.</p></div>
          <div className="space-y-2 px-3 pb-5">
            <PersonalRow icon={CalendarDays} label="Scheduled shift" value="09:00 AM – 05:00 PM" detail="Friday · Cairo HQ" />
            <PersonalRow icon={Timer} label="Check-in" value={checkInTime ?? "Not checked in"} detail={checkInTime ? `Verified at ${location.name}` : "Available when you arrive"} active={isCheckedIn || isComplete} />
            <PersonalRow icon={Clock3} label="Check-out" value={checkOutTime ?? "Not checked out"} detail={checkOutTime ? `Recorded from ${location.name}` : "Available after check-in"} active={isComplete} />
          </div>
        </section>
      </div>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300"><Building2 className="h-5 w-5" /></span><div><h2 className="text-sm font-semibold">Your check-in site</h2><p className="text-xs text-slate-500">Set by an admin in Users & settings</p></div></div>
          <div className="mt-5 flex items-center justify-between rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70"><div><p className="font-semibold text-slate-900 dark:text-white">{location.name}</p><p className="mt-1 text-xs text-slate-500">Allowed radius: {location.radius} metres</p></div><span className="grid h-10 w-10 place-items-center rounded-full border-4 border-indigo-100 bg-white text-indigo-600 dark:border-indigo-950 dark:bg-slate-900"><MapPin className="h-4 w-4" /></span></div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300"><WifiOff className="h-5 w-5" /></span><div><h2 className="text-sm font-semibold">Need help checking in?</h2><p className="text-xs text-slate-500">Use a clear exception state—never guess attendance.</p></div></div><div className="mt-5 flex gap-2"><Button variant="outline" size="sm" onClick={() => setState("denied")}>Permission denied</Button><Button variant="outline" size="sm" onClick={() => setState("unavailable")}>Location unavailable</Button></div></div>
      </section>
    </div>
  );
}

function Metric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: "emerald" | "amber" | "indigo" }) {
  const color = { emerald: "bg-emerald-500", amber: "bg-amber-500", indigo: "bg-indigo-500" }[tone];
  return <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center gap-2 text-xs font-medium text-slate-500"><span className={`h-2 w-2 rounded-full ${color}`} />{label}</div><div className="mt-2 flex items-end justify-between"><p className="text-2xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">{value}</p><p className="text-xs text-slate-400">{detail}</p></div></div>;
}

function currentTime() {
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", hour12: true }).format(new Date());
}

function PersonalRow({ icon: Icon, label, value, detail, active = false }: { icon: typeof CalendarDays; label: string; value: string; detail: string; active?: boolean }) {
  return <div className="flex items-center gap-3 rounded-2xl px-3 py-3.5 transition hover:bg-slate-50 dark:hover:bg-slate-800/70"><span className={`grid h-10 w-10 place-items-center rounded-2xl ${active ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}><Icon className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-100">{value}</p></div><span className="hidden text-right text-xs text-slate-400 sm:block">{detail}</span></div>;
}
