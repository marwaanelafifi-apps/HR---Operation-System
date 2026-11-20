"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, Bell, CalendarDays, CheckCircle2, ChevronRight,
  CircleDashed, Clock3, FileText, ListChecks, MapPin, MapPinned,
  Megaphone, Pin, TrendingUp, Umbrella, Users, Phone, RotateCcw,
  Newspaper, Building2, Target, Flame,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { excuseRequests, meetings, outsideMeetingRequests, employees } from "@/lib/mock-data";
import { loadAnnouncements, onAnnouncementsChanged, type Announcement } from "@/lib/announcements-store";
import { loadDepartments, onDepartmentsChanged, type Department } from "@/lib/departments-store";
import { type DailyTask, type DailyTaskType, onCRMChanged, requestsForEmployeeOnDate } from "@/lib/crm-store";
import { DEFAULT_SCHEDULE, formatDayHours, isDayOff } from "@/lib/work-schedule";
import { loadCRMTaskConfig } from "@/lib/crm-task-config";

const ME_ID = "ahmed-khalil";
const ME    = "Ahmed Khalil";
const TODAY = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })();

const ME_PROFILE  = employees.find(e => e.id === ME_ID);
const IS_SALES    = ME_PROFILE?.department === "Sales";
const CAN_APPROVE = ["CEO", "Sales Manager", "Operations Admin"].includes(ME_PROFILE?.role ?? "");

// ── Helpers ────────────────────────────────────────────────────────────────────

function isForMe(a: Announcement, depts: Department[]): boolean {
  if (a.audience === "all") return true;
  if (a.audience === "department") return !!depts.find(d => d.id === a.departmentId)?.memberIds.includes(ME_ID);
  return a.targetIds.includes(ME_ID);
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" });
}

type AttendanceRecord = { checkIn?: { at: string }; checkOut?: { at: string } };

function loadTodayRecord(): AttendanceRecord {
  try {
    const raw = window.localStorage.getItem(`opshub-demo-attendance-${TODAY}`);
    return raw ? (JSON.parse(raw) as AttendanceRecord) : {};
  } catch { return {}; }
}

function loadTodayTasks(): DailyTask[] {
  try {
    const raw = window.localStorage.getItem("opshub-crm-daily-tasks-v1");
    const all = raw ? (JSON.parse(raw) as DailyTask[]) : [];
    return all.filter(t => t.employeeId === ME_ID && t.date === TODAY);
  } catch { return []; }
}

function motivationMessage(pct: number): { text: string; tone: "neutral" | "warn" | "good" | "great" } {
  const h = new Date().getHours();
  if (pct === 100) return { text: "All targets hit — outstanding work today!", tone: "great" };
  if (pct >= 75)  return { text: "Almost there — one final push to close the day strong.", tone: "good" };
  if (pct >= 50)  return { text: "Halfway done — stay focused and keep going.", tone: "good" };
  if (pct >= 25)  return { text: "Good start — keep the momentum going.", tone: "neutral" };
  if (h >= 16)    return { text: "Afternoon check — still time to hit your targets today.", tone: "warn" };
  if (h >= 12)    return { text: "Pick up the pace — targets are waiting.", tone: "warn" };
  return { text: "Fresh start — your first task today awaits.", tone: "neutral" };
}

const CRM_TASK_META: { type: DailyTaskType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { type: "ads",       label: "Ads & WhatsApp",   icon: Megaphone },
  { type: "knowledge", label: "Projects in Market", icon: Building2 },
  { type: "calls",     label: "Calls",             icon: Phone },
  { type: "rotation",  label: "Rotation",          icon: RotateCcw },
];

// ── Component ──────────────────────────────────────────────────────────────────

export function HomeDashboard() {
  const myVisits   = outsideMeetingRequests.filter(r => r.employeeName === ME);
  const myExcuses  = excuseRequests.filter(r => r.employeeName === ME);
  const usedHours  = myExcuses.filter(r => r.status === "approved").reduce((s, r) => s + r.hoursUsed, 0);
  const pendingCount = [...myVisits, ...myExcuses].filter(r => r.status === "pending").length;

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [depts,   setDepts]   = useState<Department[]>([]);
  const [attend,  setAttend]  = useState<AttendanceRecord>({});
  const [tasks,   setTasks]   = useState<DailyTask[]>([]);
  const [crmReqCount, setCrmReqCount] = useState(0);
  const [config,  setConfig]  = useState(loadCRMTaskConfig());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const refreshA  = () => setAnnouncements(loadAnnouncements());
    const refreshD  = () => setDepts(loadDepartments());
    const refreshAt = () => setAttend(loadTodayRecord());
    const refreshC  = () => {
      setTasks(loadTodayTasks());
      setCrmReqCount(requestsForEmployeeOnDate(ME_ID, TODAY).length);
      setConfig(loadCRMTaskConfig());
    };
    refreshA(); refreshD(); refreshAt(); refreshC();
    const u1 = onAnnouncementsChanged(refreshA);
    const u2 = onDepartmentsChanged(refreshD);
    const u3 = onCRMChanged(refreshC);
    const iv = setInterval(refreshAt, 30_000);
    return () => { u1(); u2(); u3(); clearInterval(iv); };
  }, []);

  // ── Announcements sorted ──
  const myAnn = announcements
    .filter(a => isForMe(a, depts))
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (a.priority !== b.priority) return a.priority === "urgent" ? -1 : 1;
      return b.postedAt.localeCompare(a.postedAt);
    })
    .slice(0, 3);
  const totalForMe = announcements.filter(a => isForMe(a, depts)).length;

  // ── Shift ──
  const schedule    = DEFAULT_SCHEDULE;
  const todayIsOff  = isDayOff(new Date(), schedule);
  const dow         = new Date().getDay();
  const shiftLabel  = todayIsOff ? "Day off" : formatDayHours(schedule.days[dow]);

  // ── CRM progress ──
  const projectsToday = tasks.filter(t => t.taskType === "knowledge").length;
  const knowledgeDone = projectsToday >= config.knowledgeTarget;

  function isTypeDone(type: DailyTaskType): boolean {
    if (type === "knowledge") return knowledgeDone;
    return tasks.some(t => t.taskType === type);
  }

  // Fractional completion: knowledge counts progress toward target (e.g. 1/2 = 0.5)
  const crmFraction =
    (tasks.some(t => t.taskType === "ads")      ? 1 : 0) +
    Math.min(projectsToday / config.knowledgeTarget, 1) +
    (tasks.some(t => t.taskType === "calls")     ? 1 : 0) +
    (tasks.some(t => t.taskType === "rotation")  ? 1 : 0);
  const crmTotal = 4;
  const crmDone  = (["ads", "knowledge", "calls", "rotation"] as DailyTaskType[]).filter(isTypeDone).length;
  const crmPct   = Math.round((crmFraction / crmTotal) * 100);
  const { text: motivText, tone: motivTone } = motivationMessage(crmPct);

  // ── Attendance status ──
  const isCheckedIn  = Boolean(attend.checkIn);
  const isCheckedOut = Boolean(attend.checkOut);
  const attendStatus = isCheckedOut ? "done" : isCheckedIn ? "in" : "out";

  const statusConfig = {
    done: { label: "Shift complete",   dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-900", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
    in:   { label: `In since ${attend.checkIn ? fmtTime(attend.checkIn.at) : "—"}`, dot: "bg-teal-500", text: "text-teal-700 dark:text-teal-400", border: "border-teal-200 dark:border-teal-900", bg: "bg-teal-50 dark:bg-teal-950/30" },
    out:  { label: "Not checked in",  dot: "bg-rose-500",    text: "text-rose-700 dark:text-rose-400",    border: "border-rose-200 dark:border-rose-900", bg: "bg-rose-50 dark:bg-rose-950/20" },
  }[attendStatus];

  const motivColors = {
    neutral: "bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-300",
    warn:    "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400",
    good:    "bg-teal-50 border-teal-200 text-teal-700 dark:bg-teal-950/30 dark:border-teal-800 dark:text-teal-400",
    great:   "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400",
  }[motivTone];

  const motivIcon = {
    neutral: Flame,
    warn:    Target,
    good:    TrendingUp,
    great:   CheckCircle2,
  }[motivTone];
  const MotivIcon = motivIcon;

  // ── Today's meetings ──
  const upcomingMeetings = meetings.slice(0, 3);

  return (
    <div className="space-y-6 pb-10">

      {/* ── Hero ── */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            {new Date().toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
          <h1 className="mt-1 text-[2rem] font-semibold leading-tight tracking-[-0.03em] text-slate-950 dark:text-white">
            {greeting()}, Ahmed
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {ME_PROFILE?.role} · {ME_PROFILE?.location}
          </p>
        </div>

        {/* Attendance pill */}
        <Link href="/attendance" className={`flex items-center gap-2.5 rounded-2xl border px-4 py-2.5 transition hover:opacity-90 ${statusConfig.bg} ${statusConfig.border}`}>
          <span className={`h-2 w-2 rounded-full ${statusConfig.dot}`} />
          <span className={`text-sm font-semibold ${statusConfig.text}`}>{statusConfig.label}</span>
          {attendStatus === "out" && <ArrowRight className={`h-3.5 w-3.5 ${statusConfig.text}`} />}
        </Link>
      </header>

      {/* ── Stats strip ── */}
      <div className={`grid grid-cols-2 gap-3 ${IS_SALES ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>

        <div className="flex items-center gap-3 rounded-2xl border border-[#DCE9E6] bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#E8F3F1] text-[#0B4F4B] dark:bg-[#133E3C] dark:text-[#8FD4C6]">
            <Clock3 className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 dark:text-slate-400">Today&apos;s shift</p>
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{shiftLabel}</p>
          </div>
        </div>

        <Link href="/requests/excuse" className="flex items-center gap-3 rounded-2xl border border-[#DCE9E6] bg-white p-4 transition hover:border-[#0B4F4B] dark:border-slate-800 dark:bg-slate-900">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">
            <Umbrella className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-500 dark:text-slate-400">Excuse hours left</p>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-slate-900 dark:text-white">{4 - usedHours}</span>
              <span className="text-xs text-slate-400">of 4 hrs</span>
            </div>
          </div>
        </Link>

        <Link
          href={CAN_APPROVE ? "/approvals" : "/requests/excuse"}
          className="flex items-center gap-3 rounded-2xl border border-[#DCE9E6] bg-white p-4 transition hover:border-[#0B4F4B] dark:border-slate-800 dark:bg-slate-900"
        >
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${pendingCount > 0 ? "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400" : "bg-[#E8F3F1] text-[#0B4F4B] dark:bg-[#133E3C] dark:text-[#8FD4C6]"}`}>
            <FileText className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {CAN_APPROVE ? "Pending approvals" : "My requests"}
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-slate-900 dark:text-white">{pendingCount}</span>
              <span className="text-xs text-slate-400">{pendingCount === 1 ? "pending" : "pending"}</span>
            </div>
          </div>
        </Link>

        {IS_SALES && (
          <Link href="/crm/tasks" className="flex items-center gap-3 rounded-2xl border border-[#DCE9E6] bg-white p-4 transition hover:border-[#0B4F4B] dark:border-slate-800 dark:bg-slate-900">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${crmPct === 100 ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400" : "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400"}`}>
              <TrendingUp className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">CRM tasks today</p>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-slate-900 dark:text-white">{crmDone}</span>
                <span className="text-xs text-slate-400">/ {crmTotal} done</span>
              </div>
            </div>
          </Link>
        )}
      </div>

      {/* ── Quick actions ── */}
      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Quick actions</p>
        <div className={`grid gap-3 ${IS_SALES ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"}`}>

          {/* Check in / out — always first, always prominent */}
          <Link href="/attendance"
            className="group relative overflow-hidden rounded-2xl border border-[#0B4F4B] bg-[#0B4F4B] p-5 text-white transition hover:bg-[#063C39]">
            <span className="absolute -right-5 -top-5 h-24 w-24 rounded-full bg-white/5" />
            <MapPin className="relative h-6 w-6" />
            <p className="relative mt-3 text-base font-semibold">
              {isCheckedIn && !isCheckedOut ? "Check out" : "Check in"}
            </p>
            <p className="relative mt-0.5 text-xs text-white/65">
              {isCheckedIn && !isCheckedOut ? `Working since ${fmtTime(attend.checkIn!.at)}` : todayIsOff ? "Today is a day off" : "Verify your location at office"}
            </p>
            <ArrowRight className="absolute bottom-5 right-5 h-4 w-4 opacity-50 transition group-hover:translate-x-0.5" />
          </Link>

          {/* Meetings */}
          <Link href="/meetings"
            className="group relative overflow-hidden rounded-2xl border border-[#DCE9E6] bg-white p-5 transition hover:border-[#0B4F4B] dark:border-slate-800 dark:bg-slate-900">
            <span className="absolute -right-5 -top-5 h-24 w-24 rounded-full bg-[#E8F3F1] dark:bg-[#133E3C]" />
            <MapPinned className="relative h-6 w-6 text-[#0B4F4B] dark:text-[#8FD4C6]" />
            <p className="relative mt-3 text-base font-semibold text-slate-900 dark:text-white">Client Meeting</p>
            <p className="relative mt-0.5 text-xs text-slate-500">Request a client meeting</p>
            <ArrowRight className="absolute bottom-5 right-5 h-4 w-4 text-slate-400 opacity-50 transition group-hover:translate-x-0.5" />
          </Link>

          {/* HR Requests */}
          <Link href="/requests/excuse"
            className="group relative overflow-hidden rounded-2xl border border-[#DCE9E6] bg-white p-5 transition hover:border-[#0B4F4B] dark:border-slate-800 dark:bg-slate-900">
            <span className="absolute -right-5 -top-5 h-24 w-24 rounded-full bg-[#E8F3F1] dark:bg-[#133E3C]" />
            <Clock3 className="relative h-6 w-6 text-[#0B4F4B] dark:text-[#8FD4C6]" />
            <p className="relative mt-3 text-base font-semibold text-slate-900 dark:text-white">HR Request</p>
            <p className="relative mt-0.5 text-xs text-slate-500">Excuse, vacation, or letter</p>
            <ArrowRight className="absolute bottom-5 right-5 h-4 w-4 text-slate-400 opacity-50 transition group-hover:translate-x-0.5" />
          </Link>

          {/* CRM (Sales only) */}
          {IS_SALES && (
            <Link href="/crm/tasks"
              className="group relative overflow-hidden rounded-2xl border border-[#DCE9E6] bg-white p-5 transition hover:border-[#0B4F4B] dark:border-slate-800 dark:bg-slate-900">
              <span className="absolute -right-5 -top-5 h-24 w-24 rounded-full bg-[#E8F3F1] dark:bg-[#133E3C]" />
              <ListChecks className="relative h-6 w-6 text-[#0B4F4B] dark:text-[#8FD4C6]" />
              <p className="relative mt-3 text-base font-semibold text-slate-900 dark:text-white">CRM Tasks</p>
              <p className="relative mt-0.5 text-xs text-slate-500">
                {crmPct === 100 ? "All done today" : `${crmPct}% complete`}
              </p>
              <ArrowRight className="absolute bottom-5 right-5 h-4 w-4 text-slate-400 opacity-50 transition group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>
      </section>

      {/* ── Announcements ── */}
      {myAnn.length > 0 && (
        <section className="rounded-2xl border border-[#DCE9E6] bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-[#DCE9E6] px-5 py-3.5 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Newspaper className="h-4 w-4 text-[#0B4F4B] dark:text-[#8FD4C6]" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Announcements</h2>
              {totalForMe > 3 && (
                <span className="rounded-full bg-[#E8F3F1] px-2 py-0.5 text-xs font-semibold text-[#0B4F4B] dark:bg-[#133E3C] dark:text-[#8FD4C6]">{totalForMe}</span>
              )}
            </div>
            <Link href="/announcements" className="flex items-center gap-1 text-xs font-semibold text-[#0B4F4B] hover:underline dark:text-[#8FD4C6]">
              See all <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <ul className="divide-y divide-[#DCE9E6] dark:divide-slate-800">
            {myAnn.map(ann => (
              <li key={ann.id} className={`flex items-start gap-3 px-5 py-3.5 ${ann.priority === "urgent" ? "bg-rose-50 dark:bg-rose-950/20" : ""}`}>
                <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg ${ann.priority === "urgent" ? "bg-rose-100 dark:bg-rose-900/50" : "bg-[#E8F3F1] dark:bg-[#133E3C]"}`}>
                  {ann.priority === "urgent"
                    ? <Bell className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                    : ann.pinned
                    ? <Pin className="h-3.5 w-3.5 text-[#0B4F4B] dark:text-[#8FD4C6]" />
                    : <Megaphone className="h-3.5 w-3.5 text-[#0B4F4B] dark:text-[#8FD4C6]" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{ann.title}</p>
                    {ann.priority === "urgent" && <Badge tone="danger">Urgent</Badge>}
                    {ann.pinned && <Badge tone="default">Pinned</Badge>}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{ann.body}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {ann.postedBy} · {new Date(ann.postedAt).toLocaleDateString("en", { month: "short", day: "numeric" })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Bottom: meetings + CRM targets (sales) or just meetings ── */}
      <div className={`grid gap-6 ${IS_SALES ? "lg:grid-cols-[1fr_320px]" : ""}`}>

        {/* Upcoming meetings */}
        <section className="rounded-2xl border border-[#DCE9E6] bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-[#DCE9E6] px-5 py-4 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-[#0B4F4B] dark:text-[#8FD4C6]" />
              <h2 className="text-base font-semibold">Upcoming meetings</h2>
            </div>
            <Link href="/meetings" className="text-sm font-semibold text-[#0B4F4B] hover:underline dark:text-[#8FD4C6]">See all</Link>
          </div>
          {upcomingMeetings.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <CalendarDays className="h-8 w-8 text-slate-200 dark:text-slate-700" />
              <p className="text-sm text-slate-400">No meetings scheduled</p>
            </div>
          ) : (
            <ul className="divide-y divide-[#DCE9E6] dark:divide-slate-800">
              {upcomingMeetings.map(m => (
                <li key={m.id}>
                  <Link href={`/meetings/${m.id}`} className="flex items-center gap-4 px-5 py-4 transition hover:bg-[#F5F8F7] dark:hover:bg-slate-800/60">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#E8F3F1] text-[#0B4F4B] dark:bg-[#133E3C] dark:text-[#8FD4C6]">
                      <CalendarDays className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-sm">{m.title}</b>
                      <span className="text-xs text-slate-500">{m.time} · {m.location}</span>
                    </span>
                    <Badge tone={m.status === "Confirmed" ? "success" : "info"}>{m.status}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* CRM daily targets — Sales only */}
        {IS_SALES && (
          <section className="flex flex-col rounded-2xl border border-[#DCE9E6] bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-[#DCE9E6] px-5 py-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-[#0B4F4B] dark:text-[#8FD4C6]" />
                <h2 className="text-base font-semibold">Today&apos;s targets</h2>
              </div>
              <Link href="/crm/tasks" className="text-sm font-semibold text-[#0B4F4B] hover:underline dark:text-[#8FD4C6]">Go →</Link>
            </div>

            {/* Motivation banner */}
            <div className={`mx-5 mt-4 flex items-start gap-2.5 rounded-xl border p-3 ${motivColors}`}>
              <MotivIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-xs font-medium leading-5">{motivText}</p>
            </div>

            {/* Overall progress */}
            <div className="px-5 pt-4">
              <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Daily tasks</span>
                <span className="font-semibold text-[#0B4F4B] dark:text-[#8FD4C6]">{crmPct}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#E8F3F1] dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-[#0B4F4B] transition-all duration-700"
                  style={{ width: `${crmPct}%` }}
                />
              </div>
            </div>

            {/* Task checklist */}
            <ul className="flex-1 divide-y divide-[#DCE9E6] px-5 pb-1 dark:divide-slate-800">
              {CRM_TASK_META.map(({ type, label, icon: Icon }) => {
                const done    = isTypeDone(type);
                const partial = type === "knowledge" && projectsToday > 0 && !done;
                return (
                  <li key={type} className="flex items-center gap-3 py-2.5">
                    {done
                      ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                      : partial
                      ? <div className="relative h-5 w-5 shrink-0">
                          <CircleDashed className="h-5 w-5 text-amber-400" />
                          <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-amber-600">{projectsToday}</span>
                        </div>
                      : <CircleDashed className="h-5 w-5 shrink-0 text-slate-300 dark:text-slate-600" />}
                    <Icon className={`h-4 w-4 shrink-0 ${done ? "text-slate-300 dark:text-slate-600" : partial ? "text-amber-500" : "text-[#0B4F4B] dark:text-[#8FD4C6]"}`} />
                    <span className={`flex-1 text-sm ${done ? "text-slate-400 line-through dark:text-slate-500" : "font-medium text-slate-700 dark:text-slate-300"}`}>
                      {label}
                    </span>
                    {/* Badge + action */}
                    {partial && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                        {projectsToday}/{config.knowledgeTarget}
                      </span>
                    )}
                    {!done && (
                      <Link href="/crm/tasks" className="text-xs font-bold text-[#0B4F4B] hover:underline dark:text-[#8FD4C6]">
                        {partial ? "Add more" : "Start"}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>

            {/* Daily numeric targets */}
            <div className="grid grid-cols-3 divide-x divide-[#DCE9E6] border-t border-[#DCE9E6] dark:divide-slate-800 dark:border-slate-800">
              {[
                { label: "Requests", done: crmReqCount, target: config.requestsTarget, href: "/crm/tasks", icon: Users },
                { label: "Projects", done: projectsToday, target: config.knowledgeTarget, href: "/crm/tasks", icon: Building2 },
                { label: "Meetings", done: myVisits.filter(r => r.status === "approved").length, target: config.meetingsTarget, href: "/meetings", icon: CalendarDays },
              ].map(({ label, done, target, href, icon: Icon }) => {
                const hit = done >= target;
                return (
                  <Link key={label} href={href} className="group flex flex-col items-center gap-1 py-3.5 transition hover:bg-[#F5F8F7] dark:hover:bg-slate-800/60">
                    <Icon className={`h-4 w-4 ${hit ? "text-emerald-500" : "text-slate-400 dark:text-slate-500"}`} />
                    <span className={`text-lg font-bold leading-none ${hit ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-white"}`}>{done}</span>
                    <span className="text-[10px] text-slate-400">of {target} {label}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
