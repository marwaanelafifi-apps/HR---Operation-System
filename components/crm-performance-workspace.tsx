"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, Calendar, Check, ChevronLeft, ChevronRight,
  Plus, Trash2, Users, X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  addExtraTask, deleteExtraTask, getDayPerformance,
  getCustomTaskCompletion, loadCRMDeductions, loadExtraTasks, onCRMChanged,
  taskForEmployeeOnDate, tasksForEmployeeOnDate,
  type AdsTaskData, type KnowledgeTaskData, type CallsTaskData, type RotationTaskData, type DailyTask,
} from "@/lib/crm-store";
import { customTaskAppliesToDate, loadCRMTaskConfig } from "@/lib/crm-task-config";
import { loadRequests } from "@/lib/requests-store";
import { employees } from "@/lib/mock-data";

// ── Helpers ───────────────────────────────────────────────────────────────────
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function todayISO() { return new Date().toISOString().slice(0, 10); }

function countMeetingsForEmployee(employeeName: string, date: string): number {
  return loadRequests().visits.filter(v =>
    v.employeeName === employeeName &&
    v.date === date &&
    (v.createdDate ?? v.date) === date
  ).length;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function friendlyDate(iso: string) {
  return new Date(`${iso}T00:00`).toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" });
}

function fmtDuration(seconds?: number): string | null {
  if (!seconds || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

function isWeekend(year: number, month: number, day: number) {
  const dow = new Date(year, month, day).getDay();
  return dow === 5 || dow === 6; // Friday/Saturday for Egypt
}

const inputCls = "w-full rounded-xl border border-[#DCE9E6] bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0B4F4B] focus:outline-none focus:ring-2 focus:ring-[#0B4F4B]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";
const labelCls = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400";

// ── Sales employees list ──────────────────────────────────────────────────────
const SALES_EMPLOYEES = employees.filter(e => e.department === "Sales");

// ── Day performance card ──────────────────────────────────────────────────────
function DayPerfCard({ emp, date, onAssignTask }: { emp: typeof SALES_EMPLOYEES[0]; date: string; onAssignTask: () => void }) {
  const cfg = loadCRMTaskConfig();
  const perf = getDayPerformance(emp.id, date, (d) => countMeetingsForEmployee(emp.name, d), cfg.requestsTarget, cfg.meetingsTarget, cfg.knowledgeTarget);

  const adsTask = taskForEmployeeOnDate(emp.id, date, "ads") as (DailyTask & { durationSeconds?: number }) | undefined;
  const adsData = adsTask?.data as AdsTaskData | undefined;

  const knowledgeTasks = tasksForEmployeeOnDate(emp.id, date, "knowledge") as (DailyTask & { durationSeconds?: number })[];

  const callsTask = taskForEmployeeOnDate(emp.id, date, "calls") as (DailyTask & { durationSeconds?: number }) | undefined;
  const callsData = callsTask?.data as CallsTaskData | undefined;

  const rotationTask = taskForEmployeeOnDate(emp.id, date, "rotation") as (DailyTask & { durationSeconds?: number }) | undefined;
  const rotData = rotationTask?.data as RotationTaskData | undefined;

  // Custom task completions for this employee/date
  const customTasks = loadCRMTaskConfig().customTasks.filter(ct => customTaskAppliesToDate(ct, date));
  const customCompletions = customTasks.map(ct => ({ task: ct, completion: getCustomTaskCompletion(emp.id, ct.id, date) }));

  const extraTasks = perf.extraTasks;
  const deductions = perf.deductions;

  function TaskRow({ label, done, duration, children }: { label: string; done: boolean; duration?: number; children?: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const hasDetail = !!children;
    const durationLabel = done ? fmtDuration(duration) : null;
    return (
      <div className="border-b border-[#DCE9E6] last:border-0 dark:border-slate-700">
        <button
          onClick={() => { if (hasDetail) setOpen(o => !o); }}
          className={`flex w-full items-center gap-2.5 py-2.5 text-left ${hasDetail ? "cursor-pointer hover:bg-[#F5F8F7] dark:hover:bg-slate-800" : "cursor-default"} rounded-lg px-1`}
        >
          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${done ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-slate-100 text-slate-400 dark:bg-slate-800"}`}>
            {done ? <Check className="h-3 w-3" /> : "–"}
          </span>
          <span className={`flex-1 text-sm font-medium ${done ? "text-slate-800 dark:text-slate-100" : "text-slate-400"}`}>{label}</span>
          {durationLabel && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">{durationLabel}</span>}
          {hasDetail && done && (
            <span className="text-xs text-slate-400">{open ? "▲" : "▼"}</span>
          )}
        </button>
        {open && hasDetail && (
          <div className="mb-2 ml-7 rounded-xl border border-[#DCE9E6] bg-[#F5F8F7] p-3 text-xs dark:border-slate-700 dark:bg-slate-800">
            {children}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#DCE9E6] bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900 dark:text-white">{friendlyDate(date)}</p>
          <p className="text-xs text-slate-400">{emp.name} · {emp.role}</p>
        </div>
        <Button size="sm" variant="outline" onClick={onAssignTask}>
          <Plus className="h-3 w-3" /> Assign task
        </Button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-[#DCE9E6] bg-[#F5F8F7] p-3 dark:border-slate-700 dark:bg-slate-800">
          <p className="text-xs text-slate-400">Requests</p>
          <p className="text-xl font-semibold text-slate-900 dark:text-white">{perf.requestsCount}<span className="text-sm font-normal text-slate-400">/{perf.requestsTarget}</span></p>
          <Badge tone={perf.requestsCount >= perf.requestsTarget ? "success" : perf.requestsCount > 0 ? "warning" : "default"} className="mt-1">
            {perf.requestsCount >= perf.requestsTarget ? "On target" : perf.requestsCount > 0 ? "Partial" : "None"}
          </Badge>
        </div>
        <div className="rounded-xl border border-[#DCE9E6] bg-[#F5F8F7] p-3 dark:border-slate-700 dark:bg-slate-800">
          <p className="text-xs text-slate-400">Meetings</p>
          <p className="text-xl font-semibold text-slate-900 dark:text-white">
            {countMeetingsForEmployee(emp.name, date)}
          </p>
          <Badge tone={perf.meetingsDone ? "success" : "default"} className="mt-1">
            {perf.meetingsDone ? "Done" : "None"}
          </Badge>
        </div>
      </div>

      <div className="border-t border-[#DCE9E6] pt-3 dark:border-slate-700">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Tasks</p>
        <TaskRow label="Ads & WhatsApp Campaign" done={perf.adsTaskDone} duration={adsTask?.durationSeconds}>
          {adsData && (
            <div className="space-y-1.5">
              {adsData.urls.map((url, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 font-semibold text-[#0B4F4B] dark:text-[#8FD4C6]">{i + 1}.</span>
                  <div className="min-w-0">
                    <span className="font-medium text-slate-500">{adsData.platform[i] ?? "Link"} — </span>
                    <a href={url} target="_blank" rel="noreferrer" className="break-all text-[#0B4F4B] underline dark:text-[#8FD4C6]">{url}</a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TaskRow>
        <TaskRow label={`Projects in Market (${perf.knowledgeCount}/${perf.knowledgeTarget})`} done={perf.knowledgeTaskDone}>
          {knowledgeTasks.length > 0 && (
            <div className="space-y-3">
              {knowledgeTasks.map((kt, idx) => {
                const kd = kt.data as KnowledgeTaskData;
                return (
                  <div key={kt.id} className={knowledgeTasks.length > 1 ? "border-b border-[#DCE9E6] pb-3 last:border-0 last:pb-0 dark:border-slate-600" : ""}>
                    {knowledgeTasks.length > 1 && (
                      <p className="mb-1.5 font-semibold text-[#0B4F4B] dark:text-[#8FD4C6]">#{idx + 1}</p>
                    )}
                    {kd.voiceNoteTranscript ? (
                      <div>
                        <p className="mb-1 font-semibold text-slate-500">Voice note ({kd.voiceNoteLanguage === "ar" ? "Arabic" : "English"})</p>
                        <p className={`leading-6 text-slate-700 dark:text-slate-200`} dir={kd.voiceNoteLanguage === "ar" ? "rtl" : "ltr"}>
                          {kd.voiceNoteTranscript}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {([
                          ["Project", kd.assessment?.projectName],
                          ["Company", kd.assessment?.companyName],
                          ["Location", kd.assessment?.location],
                          ["Previous Projects", kd.assessment?.previousWork],
                          ["Area", kd.assessment?.projectArea],
                          ["Finishing", kd.assessment?.finishingType],
                          ["Construction", kd.assessment?.construction],
                          ["Delivery", kd.assessment?.deliveryDate],
                          ["Details", kd.assessment?.projectDetails],
                          ["Units, Areas & Prices", `${kd.assessment?.unitTypes ?? ""}${kd.assessment?.pricesAndAcres ? ` / ${kd.assessment.pricesAndAcres}` : ""}`],
                          ["Payment Plan", kd.assessment?.paymentPlan],
                          ["Selling Points", kd.assessment?.sellingPoints],
                          ["Weakness Points", kd.assessment?.weaknessPoints],
                          ["Maintenance", kd.assessment?.maintenance],
                          ["Consultant", kd.assessment?.investorType],
                          ["Management & Ops", kd.assessment?.managementAndOperations],
                          ["Notes", kd.assessment?.additionalNotes],
                        ] as [string, string][]).filter(([, v]) => v).map(([k, v]) => (
                          <div key={k} className="flex gap-2">
                            <span className="shrink-0 font-semibold text-slate-500">{k}:</span>
                            <span className="text-slate-700 dark:text-slate-200">{v}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TaskRow>
        <TaskRow label="Calls" done={perf.callsTaskDone} duration={callsTask?.durationSeconds}>
          {callsData && (
            <div className="flex gap-6">
              <div><span className="font-semibold text-emerald-600">{callsData.freshCalls}</span><span className="ml-1 text-slate-500">Fresh</span></div>
              <div><span className="font-semibold text-sky-600">{callsData.oldCalls}</span><span className="ml-1 text-slate-500">Old</span></div>
              <div><span className="font-semibold text-amber-600">{callsData.delayCalls}</span><span className="ml-1 text-slate-500">Delay</span></div>
              <div className="ml-auto"><span className="font-semibold text-slate-700 dark:text-slate-200">{callsData.freshCalls + callsData.oldCalls + callsData.delayCalls}</span><span className="ml-1 text-slate-500">Total</span></div>
            </div>
          )}
        </TaskRow>
        <TaskRow label="Rotation" done={perf.rotationTaskDone} duration={rotationTask?.durationSeconds}>
          {rotData && (
            <div className="space-y-1">
              {rotData.rotatedWithNames.length > 0 && (
                <p><span className="font-semibold text-slate-500">Rotated with: </span>{rotData.rotatedWithNames.join(", ")}</p>
              )}
              {rotData.notes && <p><span className="font-semibold text-slate-500">Notes: </span>{rotData.notes}</p>}
            </div>
          )}
        </TaskRow>
        {customCompletions.map(({ task: ct, completion }) => (
          <TaskRow key={ct.id} label={ct.labelEn} done={!!completion} duration={completion?.durationSeconds}>
            {completion && (
              <div className="space-y-1">
                {completion.wasBlocked && <p className="font-semibold text-rose-500">⚠ Assessment was locked</p>}
                {completion.note && <p className="text-slate-700 dark:text-slate-200">{completion.note}</p>}
              </div>
            )}
          </TaskRow>
        ))}
      </div>

      {extraTasks.length > 0 && (
        <div className="mt-3 border-t border-[#DCE9E6] pt-3 dark:border-slate-700">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-500">Extra Tasks</p>
          {extraTasks.map(et => (
            <div key={et.id} className="mb-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs dark:border-amber-900 dark:bg-amber-950">
              <p className="font-semibold text-amber-700 dark:text-amber-300">{et.note}</p>
              {et.deductionDays > 0 && <p className="text-amber-600">Deduction: {et.deductionDays} day(s)</p>}
            </div>
          ))}
        </div>
      )}

      {deductions.length > 0 && (
        <div className="mt-3 border-t border-[#DCE9E6] pt-3 dark:border-slate-700">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-rose-500">Deductions</p>
          {deductions.map(d => (
            <div key={d.id} className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs dark:border-rose-900 dark:bg-rose-950">
              <p className="font-semibold text-rose-700 dark:text-rose-300">{d.deductionDays} day(s) — {d.reason}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Month calendar grid ───────────────────────────────────────────────────────
function MonthView({ emp, year, month, onDayClick }: { emp: typeof SALES_EMPLOYEES[0]; year: number; month: number; onDayClick: (date: string) => void }) {
  const today = todayISO();
  const dim = daysInMonth(year, month);
  const firstDow = new Date(year, month, 1).getDay();
  const cfg = loadCRMTaskConfig();

  // Collect per-day performance for the whole month
  const perfByDay = useMemo(() => {
    const result: Record<number, ReturnType<typeof getDayPerformance>> = {};
    for (let d = 1; d <= dim; d++) {
      const date = isoDate(year, month, d);
      if (date > today) continue;
      if (isWeekend(year, month, d)) continue;
      result[d] = getDayPerformance(emp.id, date, (dt) => countMeetingsForEmployee(emp.name, dt), cfg.requestsTarget, cfg.meetingsTarget, cfg.knowledgeTarget);
    }
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emp, year, month, dim, today]);

  // Monthly summary
  const summary = useMemo(() => {
    const days = Object.values(perfByDay);
    const workdays = days.length;
    const reqTotal = days.reduce((s, d) => s + d.requestsCount, 0);
    const reqTarget = workdays * cfg.requestsTarget;
    const meetingsDone = days.filter(d => d.meetingsDone).length;
    const tasksDone = days.reduce((s, d) => {
      let n = 0;
      if (d.adsTaskDone) n++;
      if (d.knowledgeTaskDone) n++;
      if (d.callsTaskDone) n++;
      if (d.rotationTaskDone) n++;
      return s + n;
    }, 0);
    const tasksTotal = workdays * 4;
    const knowledgeTotal = days.reduce((s, d) => s + d.knowledgeCount, 0);
    const knowledgeTarget = workdays * cfg.knowledgeTarget;
    const deductionDays = loadCRMDeductions().filter(d => d.employeeId === emp.id && d.date.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`))
      .reduce((s, d) => s + d.deductionDays, 0);
    return { workdays, reqTotal, reqTarget, meetingsDone, tasksDone, tasksTotal, knowledgeTotal, knowledgeTarget, deductionDays };
  }, [perfByDay, emp, year, month]);

  function cellColor(d: number): string {
    if (isWeekend(year, month, d)) return "bg-slate-50 dark:bg-slate-800/40";
    const date = isoDate(year, month, d);
    if (date > today) return "bg-white dark:bg-slate-900";
    const perf = perfByDay[d];
    if (!perf) return "bg-white dark:bg-slate-900";
    const score = [perf.requestsCount >= perf.requestsTarget, perf.meetingsDone, perf.adsTaskDone, perf.knowledgeTaskDone, perf.callsTaskDone, perf.rotationTaskDone].filter(Boolean).length;
    if (score >= 5) return "bg-emerald-50 dark:bg-emerald-950/40";
    if (score >= 3) return "bg-amber-50 dark:bg-amber-950/30";
    return "bg-rose-50 dark:bg-rose-950/30";
  }

  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-6">
      {/* Monthly summary */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Requests", value: `${summary.reqTotal}/${summary.reqTarget}`, sub: `${summary.workdays} workdays` },
          { label: "Meetings done", value: `${summary.meetingsDone}/${summary.workdays}`, sub: "days with ≥1 meeting" },
          { label: "Projects in Market", value: `${summary.knowledgeTotal}/${summary.knowledgeTarget}`, sub: `${Math.round((summary.knowledgeTotal / Math.max(1, summary.knowledgeTarget)) * 100)}% of target` },
          { label: "Tasks completed", value: `${summary.tasksDone}/${summary.tasksTotal}`, sub: `${Math.round((summary.tasksDone / Math.max(1, summary.tasksTotal)) * 100)}% completion` },
          { label: "CRM deductions", value: `${summary.deductionDays}d`, sub: "deducted this month" },
        ].map(({ label, value, sub }) => (
          <div key={label} className="rounded-2xl border border-[#DCE9E6] bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-1.5 text-2xl font-semibold text-slate-950 dark:text-white">{value}</p>
            <p className="mt-0.5 text-xs text-slate-400">{sub}</p>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="overflow-hidden rounded-2xl border border-[#DCE9E6] dark:border-slate-800">
        <div className="grid grid-cols-7 border-b border-[#DCE9E6] dark:border-slate-700">
          {DOW.map(d => (
            <div key={d} className="border-r border-[#DCE9E6] bg-[#F5F8F7] py-2 text-center text-xs font-semibold text-slate-500 last:border-r-0 dark:border-slate-700 dark:bg-slate-800">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: firstDow }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[72px] border-b border-r border-[#DCE9E6] bg-slate-50 dark:border-slate-700 dark:bg-slate-800/20 last:border-r-0" />
          ))}
          {Array.from({ length: dim }).map((_, i) => {
            const d = i + 1;
            const date = isoDate(year, month, d);
            const isToday = date === today;
            const isFuture = date > today;
            const weekend = isWeekend(year, month, d);
            const perf = perfByDay[d];
            const hasDeduction = (perf?.deductions.length ?? 0) > 0;

            const isClickable = !weekend && !isFuture;
            const CellTag = isClickable ? "button" : "div";

            return (
              <CellTag
                key={d}
                {...(isClickable ? { type: "button" as const, onClick: () => onDayClick(date) } : {})}
                className={`relative min-h-[80px] w-full border-b border-r border-[#DCE9E6] p-2 text-left dark:border-slate-700 last:border-r-0 ${cellColor(d)} ${isClickable ? "cursor-pointer hover:ring-2 hover:ring-inset hover:ring-[#0B4F4B]/30 dark:hover:ring-[#2E7D76]/40" : ""}`}
              >
                <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${isToday ? "bg-[#0B4F4B] text-white" : weekend ? "text-slate-300 dark:text-slate-600" : "text-slate-700 dark:text-slate-200"}`}>{d}</span>
                {!weekend && !isFuture && perf && (
                  <>
                    <div className="mt-1 space-y-0.5">
                      <div className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span className={`text-[10px] font-semibold leading-none ${perf.requestsCount >= perf.requestsTarget ? "text-emerald-700 dark:text-emerald-400" : perf.requestsCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-400"}`}>
                          {perf.requestsCount}/{perf.requestsTarget}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                        <span className={`text-[10px] font-semibold leading-none ${perf.meetingsDone ? "text-blue-700 dark:text-blue-400" : perf.meetingsCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-400"}`}>
                          {perf.meetingsCount}/1
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span title="Projects in Market" className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        <span className={`text-[10px] font-semibold leading-none ${perf.knowledgeTaskDone ? "text-amber-700 dark:text-amber-400" : perf.knowledgeCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-400"}`}>
                          {perf.knowledgeCount}/{perf.knowledgeTarget}
                        </span>
                      </div>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-0.5">
                      {perf.adsTaskDone && <span title="Ads" className="h-1.5 w-1.5 rounded-full bg-purple-500" />}
                      {perf.callsTaskDone && <span title="Calls" className="h-1.5 w-1.5 rounded-full bg-sky-500" />}
                      {perf.rotationTaskDone && <span title="Rotation" className="h-1.5 w-1.5 rounded-full bg-teal-500" />}
                      {hasDeduction && <span title="Deduction" className="h-1.5 w-1.5 rounded-full bg-rose-500" />}
                    </div>
                  </>
                )}
              </CellTag>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
        {[
          { color: "bg-emerald-500", label: "Requests" },
          { color: "bg-blue-500", label: "Meetings" },
          { color: "bg-amber-500", label: "Projects in Market" },
          { color: "bg-purple-500", label: "Ads ✓" },
          { color: "bg-sky-500", label: "Calls ✓" },
          { color: "bg-teal-500", label: "Rotation ✓" },
          { color: "bg-rose-500", label: "Deduction" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${color}`} />
            {label}
          </div>
        ))}
      </div>

      {/* Extra tasks this month */}
      <ExtraTasksList emp={emp} monthPrefix={`${year}-${String(month + 1).padStart(2, "0")}`} />
    </div>
  );
}

// ── Extra tasks list ──────────────────────────────────────────────────────────
function ExtraTasksList({ emp, monthPrefix }: { emp: typeof SALES_EMPLOYEES[0]; monthPrefix?: string }) {
  const extras = loadExtraTasks().filter(t =>
    t.targetEmployeeId === emp.id &&
    (!monthPrefix || t.assignedDate.startsWith(monthPrefix))
  );

  if (extras.length === 0) return null;

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">Extra Tasks Assigned</h3>
      <div className="space-y-2">
        {extras.map(et => (
          <div key={et.id} className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/50">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-amber-800 dark:text-amber-200">{friendlyDate(et.assignedDate)}</span>
                {et.deductionDays > 0 && <Badge tone="danger">{et.deductionDays}d deduction</Badge>}
                {et.acknowledged && <Badge tone="success">Acknowledged</Badge>}
              </div>
              <p className="mt-0.5 text-sm text-amber-700 dark:text-amber-300">{et.note}</p>
              <p className="mt-0.5 text-xs text-amber-500">By {et.createdBy} · {new Date(et.createdAt).toLocaleDateString()}</p>
            </div>
            <button onClick={() => deleteExtraTask(et.id)} className="mt-0.5 text-amber-400 transition hover:text-rose-500">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Assign extra task modal ───────────────────────────────────────────────────
function AssignTaskModal({ emp, defaultDate, onClose }: { emp: typeof SALES_EMPLOYEES[0]; defaultDate: string; onClose: () => void }) {
  const [date, setDate] = useState(defaultDate);
  const [note, setNote] = useState("");
  const [deduction, setDeduction] = useState<0 | 0.25 | 0.5 | 1>(0);
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit() {
    if (!note.trim()) return;
    setSubmitting(true);
    addExtraTask({
      targetEmployeeId: emp.id,
      targetEmployeeName: emp.name,
      assignedDate: date,
      note: note.trim(),
      createdBy: "Manager",
      deductionDays: deduction,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-[#DCE9E6] bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-[#DCE9E6] px-6 py-4 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Assign Extra Task — {emp.name}</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-4 p-6">
          <div>
            <label className={labelCls}>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} max={todayISO()} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Task / Note for {emp.name} *</label>
            <textarea rows={3} value={note} onChange={e => setNote(e.target.value)}
              placeholder="Describe the task or explain why performance was below expectation…"
              className={`${inputCls} resize-none`} />
          </div>
          <div>
            <label className={labelCls}>Deduction</label>
            <div className="flex gap-2">
              {([0, 0.25, 0.5, 1] as const).map(d => (
                <label key={d} className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border p-3 text-sm font-semibold transition ${deduction === d ? "border-[#0B4F4B] bg-[#E8F3F1] text-[#0B4F4B] dark:border-[#2E7D76] dark:bg-[#0B2927] dark:text-[#8FD4C6]" : "border-[#DCE9E6] text-slate-500 hover:border-[#B7D9D3] dark:border-slate-700"}`}>
                  <input type="radio" name="deduction" value={d} checked={deduction === d} onChange={() => setDeduction(d)} className="sr-only" />
                  {d === 0 ? "None" : d === 0.25 ? "¼ day" : `${d} day`}
                </label>
              ))}
            </div>
            {deduction > 0 && (
              <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">
                This deduction will appear in {emp.name}&apos;s finance record and attendance calendar.
              </p>
            )}
          </div>
          <div className="flex justify-end gap-3 border-t border-[#DCE9E6] pt-4 dark:border-slate-700">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!note.trim() || submitting}>
              <Check className="h-4 w-4" /> Assign Task
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main workspace ────────────────────────────────────────────────────────────
type ViewMode = "day" | "month";

export function CRMPerformanceWorkspace() {
  const today = todayISO();
  const todayDate = new Date();

  const [ready, setReady] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState(SALES_EMPLOYEES[0]?.id ?? "");
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [selectedDate, setSelectedDate] = useState(today);
  const [viewYear, setViewYear] = useState(todayDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(todayDate.getMonth());
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setReady(true);
    const unsub = onCRMChanged(() => setTick(t => t + 1));
    return unsub;
  }, []);

  void tick;

  if (!ready) return null;

  const selectedEmp = SALES_EMPLOYEES.find(e => e.id === selectedEmpId) ?? SALES_EMPLOYEES[0];

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  return (
    <div className="pb-10">
      {/* Header */}
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0B4F4B] dark:text-[#8FD4C6]">CRM</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white sm:text-4xl">Team Performance</h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">Review daily and monthly performance for each sales agent.</p>
      </header>

      {/* Controls */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {/* Employee selector */}
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-slate-400" />
          <select
            value={selectedEmpId}
            onChange={e => setSelectedEmpId(e.target.value)}
            className="rounded-xl border border-[#DCE9E6] bg-white px-4 py-2 text-sm font-medium dark:border-slate-700 dark:bg-slate-900"
          >
            {SALES_EMPLOYEES.map(e => (
              <option key={e.id} value={e.id}>{e.name} — {e.role}</option>
            ))}
          </select>
        </div>

        {/* Day/Month tab */}
        <div className="flex gap-1 rounded-2xl border border-[#DCE9E6] bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
          {(["day", "month"] as const).map(m => (
            <button key={m} onClick={() => setViewMode(m)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${viewMode === m ? "bg-[#0B4F4B] text-white" : "text-slate-500 hover:text-[#0B4F4B] dark:text-slate-400"}`}>
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>

        {/* Date / month picker */}
        {viewMode === "day" ? (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              max={today}
              onChange={e => setSelectedDate(e.target.value)}
              className="rounded-xl border border-[#DCE9E6] bg-white px-4 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
        ) : (
          <div className="flex items-center gap-1 rounded-2xl border border-[#DCE9E6] bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
            <button onClick={prevMonth} className="rounded-xl p-2 text-slate-500 transition hover:bg-[#E8F3F1] hover:text-[#0B4F4B] dark:hover:bg-slate-800"><ChevronLeft className="h-4 w-4" /></button>
            <span className="min-w-36 text-center text-sm font-semibold text-slate-900 dark:text-white">{MONTH_NAMES[viewMonth]} {viewYear}</span>
            <button onClick={nextMonth} className="rounded-xl p-2 text-slate-500 transition hover:bg-[#E8F3F1] hover:text-[#0B4F4B] dark:hover:bg-slate-800"><ChevronRight className="h-4 w-4" /></button>
          </div>
        )}

        {/* Assign task button */}
        <Button onClick={() => setShowAssignModal(true)} className="ml-auto">
          <Plus className="h-4 w-4" /> Assign Extra Task
        </Button>
      </div>

      {/* Content */}
      {viewMode === "day" ? (
        <DayPerfCard emp={selectedEmp} date={selectedDate} onAssignTask={() => setShowAssignModal(true)} />
      ) : (
        <MonthView emp={selectedEmp} year={viewYear} month={viewMonth} onDayClick={(date) => { setSelectedDate(date); setViewMode("day"); }} />
      )}

      {showAssignModal && selectedEmp && (
        <AssignTaskModal
          emp={selectedEmp}
          defaultDate={viewMode === "day" ? selectedDate : today}
          onClose={() => setShowAssignModal(false)}
        />
      )}
    </div>
  );
}
