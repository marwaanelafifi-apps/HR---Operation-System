"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, Check, ChevronLeft, ChevronRight,
  Minus, Plus, Scale, Trash2, Users, X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { UnitTableView } from "@/components/ui/unit-table-editor";
import {
  addAdjustment, addExtraTask, adjustmentsForEmployeeInMonth, adjustmentsForEmployeeOnDate,
  adjustmentTotals, deleteAdjustment, deleteExtraTask, getDayPerformance,
  getCustomTaskCompletion, loadExtraTasks, onCRMChanged,
  requestsForEmployeeOnDate, taskForEmployeeOnDate, tasksForEmployeeOnDate,
  type AdjustmentKind, type AdsTaskData, type CRMAdjustment, type CRMRequest,
  type KnowledgeTaskData, type CallsTaskData, type RotationTaskData, type DailyTask,
} from "@/lib/crm-store";
import { customTaskAppliesToDate, loadCRMTaskConfig } from "@/lib/crm-task-config";
import { loadRequests, type VisitRequest } from "@/lib/requests-store";
import { employees } from "@/lib/mock-data";

// ── Helpers ───────────────────────────────────────────────────────────────────
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function meetingsForEmployee(employeeName: string, date: string): VisitRequest[] {
  return loadRequests().visits.filter(v =>
    v.employeeName === employeeName && v.date === date
  );
}

function countMeetingsForEmployee(employeeName: string, date: string): number {
  return meetingsForEmployee(employeeName, date).length;
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

// ── Deduction / bonus helpers ─────────────────────────────────────────────────
const DAY_AMOUNTS = [0.25, 0.5, 1, 2] as const;

/** "¼ day" / "½ day" / "2 days" — day units, not currency. */
function fmtDays(n: number): string {
  if (n === 0.25) return "¼ day";
  if (n === 0.5) return "½ day";
  if (n === 0.75) return "¾ day";
  return `${n} ${n === 1 ? "day" : "days"}`;
}

/** Compact form for tiles and table cells: "1.5d". */
function fmtD(n: number): string {
  return `${Number(n.toFixed(2))}d`;
}

function netTone(net: number): string {
  if (net > 0) return "text-emerald-700 dark:text-emerald-400";
  if (net < 0) return "text-rose-600 dark:text-rose-400";
  return "text-slate-400";
}

function netLabel(net: number): string {
  if (net === 0) return "—";
  return `${net > 0 ? "+" : "−"}${fmtD(Math.abs(net))}`;
}

// ── Deductions & bonuses panel ────────────────────────────────────────────────
function AdjustmentsPanel({
  items, title, onAdd, emptyHint,
}: {
  items: CRMAdjustment[];
  title: string;
  onAdd?: () => void;
  emptyHint?: string;
}) {
  const totals = adjustmentTotals(items);

  return (
    <div className="rounded-2xl border border-[#DCE9E6] bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center gap-3 border-b border-[#DCE9E6] px-5 py-3.5 dark:border-slate-700">
        <Scale className="h-4 w-4 text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
        <div className="ml-auto flex items-center gap-4 text-xs">
          <span className="text-slate-400">
            Deductions <span className="font-semibold text-rose-600 dark:text-rose-400">{fmtD(totals.deduction)}</span>
          </span>
          <span className="text-slate-400">
            Bonuses <span className="font-semibold text-emerald-700 dark:text-emerald-400">{fmtD(totals.bonus)}</span>
          </span>
          <span className="rounded-lg bg-[#F5F8F7] px-2.5 py-1 dark:bg-slate-800">
            <span className="text-slate-400">Net </span>
            <span className={`font-semibold ${netTone(totals.net)}`}>{netLabel(totals.net)}</span>
          </span>
          {onAdd && (
            <Button size="sm" variant="outline" onClick={onAdd}>
              <Plus className="h-3 w-3" /> Add
            </Button>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="px-5 py-5 text-sm text-slate-400">{emptyHint ?? "No deductions or bonuses recorded."}</p>
      ) : (
        <div className="divide-y divide-[#DCE9E6] dark:divide-slate-800">
          {items.map(a => {
            const isBonus = a.kind === "bonus";
            return (
              <div key={a.id} className="flex items-start gap-3 px-5 py-3.5">
                <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ${isBonus ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400" : "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400"}`}>
                  {isBonus ? <Plus className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-sm font-semibold ${isBonus ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                      {isBonus ? "Bonus" : "Deduction"} · {fmtDays(a.days)}
                    </span>
                    <span className="text-xs text-slate-400">{friendlyDate(a.date)}</span>
                  </div>
                  <p className="mt-0.5 text-sm leading-6 text-slate-700 dark:text-slate-200" dir={/[؀-ۿ]/.test(a.note) ? "rtl" : "ltr"}>{a.note}</p>
                  <p className="mt-0.5 text-xs text-slate-400">By {a.createdBy} · {new Date(a.createdAt).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={() => deleteAdjustment(a.id)}
                  aria-label="Delete record"
                  className="mt-0.5 text-slate-300 transition hover:text-rose-500 dark:text-slate-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Add deduction / bonus modal ───────────────────────────────────────────────
function AdjustmentModal({ emp, defaultDate, onClose }: {
  emp: typeof SALES_EMPLOYEES[0];
  defaultDate: string;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<AdjustmentKind>("deduction");
  const [date, setDate] = useState(defaultDate);
  const [days, setDays] = useState<number>(0.5);
  const [note, setNote] = useState("");
  const isBonus = kind === "bonus";

  function handleSubmit() {
    if (!note.trim() || days <= 0) return;
    addAdjustment({
      employeeId: emp.id,
      employeeName: emp.name,
      date,
      kind,
      days,
      note: note.trim(),
      createdBy: "Manager",
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-[#DCE9E6] bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-[#DCE9E6] px-6 py-4 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Deduction / Bonus — {emp.name}</h2>
          <button onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-4 p-6">
          <div>
            <label className={labelCls}>Type</label>
            <div className="flex gap-2">
              {([
                { k: "deduction" as const, label: "Deduction", on: "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300" },
                { k: "bonus" as const, label: "Bonus", on: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
              ]).map(({ k, label, on }) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={`flex-1 rounded-xl border p-3 text-sm font-semibold transition ${kind === k ? on : "border-[#DCE9E6] text-slate-500 hover:border-[#B7D9D3] dark:border-slate-700"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Date</label>
            <DatePicker value={date} onChange={setDate} max={todayISO()} />
          </div>

          <div>
            <label className={labelCls}>Amount (days)</label>
            <div className="flex gap-2">
              {DAY_AMOUNTS.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  className={`flex-1 rounded-xl border p-3 text-sm font-semibold transition ${days === d ? "border-[#0B4F4B] bg-[#E8F3F1] text-[#0B4F4B] dark:border-[#2E7D76] dark:bg-[#0B2927] dark:text-[#8FD4C6]" : "border-[#DCE9E6] text-slate-500 hover:border-[#B7D9D3] dark:border-slate-700"}`}
                >
                  {fmtDays(d)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Reason / note *</label>
            <textarea
              rows={3}
              value={note}
              onChange={e => setNote(e.target.value)}
              dir={/[؀-ۿ]/.test(note) ? "rtl" : "ltr"}
              placeholder={isBonus ? "Why does this employee deserve the bonus?" : "Why is this deduction applied?"}
              className={`${inputCls} resize-none`}
            />
            <p className="mt-1.5 text-xs text-slate-400">
              {isBonus
                ? "This bonus will appear in the finance record and attendance calendar."
                : "This deduction will appear in the finance record and attendance calendar."}
            </p>
          </div>

          <div className="flex justify-end gap-3 border-t border-[#DCE9E6] pt-4 dark:border-slate-700">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!note.trim()}>
              <Check className="h-4 w-4" /> Save {isBonus ? "Bonus" : "Deduction"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Requests detail panel ─────────────────────────────────────────────────────
function RequestsDetail({ requests, target }: { requests: CRMRequest[]; target: number }) {
  const [open, setOpen] = useState(false);
  const count = requests.length;
  const tone = count >= target ? "success" : count > 0 ? "warning" : "default";
  const label = count >= target ? "On target" : count > 0 ? "Partial" : "None";
  return (
    <div className="mb-3 rounded-xl border border-[#DCE9E6] dark:border-slate-700">
      <button
        onClick={() => { if (count > 0) setOpen(o => !o); }}
        className={`flex w-full items-center gap-3 p-3 ${count > 0 ? "cursor-pointer" : "cursor-default"}`}
      >
        <div className="flex-1 text-left">
          <p className="text-xs text-slate-400">Client Requests</p>
          <p className="text-xl font-semibold text-slate-900 dark:text-white">
            {count}<span className="text-sm font-normal text-slate-400">/{target}</span>
          </p>
        </div>
        <Badge tone={tone}>{label}</Badge>
        {count > 0 && (
          <span className="text-xs text-slate-400">{open ? "▲" : "▼"}</span>
        )}
      </button>
      {open && count > 0 && (
        <div className="border-t border-[#DCE9E6] dark:border-slate-700">
          {requests.map((r, i) => (
            <div key={r.id} className={`px-3 py-2.5 text-xs ${i < requests.length - 1 ? "border-b border-[#DCE9E6] dark:border-slate-700" : ""}`}>
              <div className="mb-1 flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E8F3F1] text-[10px] font-bold text-[#0B4F4B] dark:bg-[#063C39] dark:text-[#8FD4C6]">{i + 1}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{r.clientName}</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-500">{r.clientNumber}</span>
              </div>
              <div className="ml-7 flex flex-wrap gap-x-4 gap-y-1 text-slate-500">
                <span><span className="font-medium text-slate-600 dark:text-slate-300">Source:</span> {r.leadSource}</span>
                {r.budget && <span><span className="font-medium text-slate-600 dark:text-slate-300">Budget:</span> {r.budget}</span>}
                {r.feedback && <span className="w-full"><span className="font-medium text-slate-600 dark:text-slate-300">Feedback:</span> {r.feedback}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Meetings detail panel ─────────────────────────────────────────────────────
function MeetingsDetail({ meetings, done }: { meetings: VisitRequest[]; done: boolean }) {
  const [open, setOpen] = useState(false);
  const count = meetings.length;
  return (
    <div className="mb-4 rounded-xl border border-[#DCE9E6] dark:border-slate-700">
      <button
        onClick={() => { if (count > 0) setOpen(o => !o); }}
        className={`flex w-full items-center gap-3 p-3 ${count > 0 ? "cursor-pointer" : "cursor-default"}`}
      >
        <div className="flex-1 text-left">
          <p className="text-xs text-slate-400">Client Meetings</p>
          <p className="text-xl font-semibold text-slate-900 dark:text-white">{count}</p>
        </div>
        <Badge tone={done ? "success" : "default"}>{done ? "Done" : "None"}</Badge>
        {count > 0 && (
          <span className="text-xs text-slate-400">{open ? "▲" : "▼"}</span>
        )}
      </button>
      {open && count > 0 && (
        <div className="border-t border-[#DCE9E6] dark:border-slate-700">
          {meetings.map((m, i) => (
            <div key={m.id} className={`px-3 py-2.5 text-xs ${i < meetings.length - 1 ? "border-b border-[#DCE9E6] dark:border-slate-700" : ""}`}>
              <div className="mb-1 flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E8F3F1] text-[10px] font-bold text-[#0B4F4B] dark:bg-[#063C39] dark:text-[#8FD4C6]">{i + 1}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{m.clientName}</span>
                {m.status && (
                  <Badge tone={m.status === "approved" ? "success" : m.status === "rejected" ? "danger" : "default"} className="ml-auto">
                    {m.status}
                  </Badge>
                )}
              </div>
              <div className="ml-7 flex flex-wrap gap-x-4 gap-y-1 text-slate-500">
                {m.projectName && <span><span className="font-medium text-slate-600 dark:text-slate-300">Project:</span> {m.projectName}</span>}
                {m.zone && <span><span className="font-medium text-slate-600 dark:text-slate-300">Zone:</span> {m.zone}</span>}
                {m.time && <span><span className="font-medium text-slate-600 dark:text-slate-300">Time:</span> {m.time}</span>}
                {m.meetingLocation && <span><span className="font-medium text-slate-600 dark:text-slate-300">Location:</span> {m.meetingLocation}</span>}
                {m.notes && <span className="w-full"><span className="font-medium text-slate-600 dark:text-slate-300">Notes:</span> {m.notes}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Day performance card ──────────────────────────────────────────────────────
function DayPerfCard({ emp, date, onAssignTask, onAddAdjustment }: { emp: typeof SALES_EMPLOYEES[0]; date: string; onAssignTask: () => void; onAddAdjustment: () => void }) {
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
  const adjustments = adjustmentsForEmployeeOnDate(emp.id, date);

  const requestsList = requestsForEmployeeOnDate(emp.id, date);
  const meetingsList = meetingsForEmployee(emp.name, date);

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
    <div className="space-y-4">
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

      <RequestsDetail requests={requestsList} target={perf.requestsTarget} />
      <MeetingsDetail meetings={meetingsList} done={perf.meetingsDone} />

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
                      <div className="space-y-2">
                        <UnitTableView rows={kd.assessment?.unitTable ?? []} compact />
                        {([
                          ["Project Name", kd.assessment?.projectName],
                          ["Company Name", kd.assessment?.companyName],
                          ["Previous Projects / Owner History", kd.assessment?.previousWork],
                          ["Location", kd.assessment?.location],
                          ["Project Acres", kd.assessment?.projectArea],
                          ["Project Details & Facilities", kd.assessment?.projectDetails],
                          ["Unit Types", kd.assessment?.unitTypes],
                          ["Prices & Acres", kd.assessment?.pricesAndAcres],
                          ["Payment Plan", kd.assessment?.paymentPlan],
                          ["Finishing Type", kd.assessment?.finishingType],
                          ["Construction", kd.assessment?.construction],
                          ["Delivery Date", kd.assessment?.deliveryDate],
                          ["Maintenance", kd.assessment?.maintenance],
                          ["Engineering Consultant", kd.assessment?.investorType],
                          ["Management & Operations", kd.assessment?.managementAndOperations],
                          ["Terms of Operating Contract", kd.assessment?.termsOfContract],
                          ["Selling Points", kd.assessment?.sellingPoints],
                          ["Weakness Points", kd.assessment?.weaknessPoints],
                          ["Additional Notes", kd.assessment?.additionalNotes],
                        ] as [string, string][]).filter(([, v]) => v).map(([k, v]) => (
                          <div key={k} className="rounded-lg bg-white px-2.5 py-1.5 dark:bg-slate-900">
                            <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{k}</p>
                            <p className="leading-5 text-slate-800 dark:text-slate-100" dir={/[؀-ۿ]/.test(v) ? "rtl" : "ltr"}>{v}</p>
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

    </div>

      <AdjustmentsPanel
        items={adjustments}
        title={`Deductions & Bonuses — ${friendlyDate(date)}`}
        onAdd={onAddAdjustment}
        emptyHint="Nothing recorded for this day."
      />
    </div>
  );
}

// ── Month calendar grid ───────────────────────────────────────────────────────
function MonthView({ emp, year, month, onDayClick, onAddAdjustment }: { emp: typeof SALES_EMPLOYEES[0]; year: number; month: number; onDayClick: (date: string) => void; onAddAdjustment: () => void }) {
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

  // Deductions/bonuses keyed by day, so the calendar can flag both
  const adjByDay = useMemo(() => {
    const map: Record<string, CRMAdjustment[]> = {};
    for (const a of adjustmentsForEmployeeInMonth(emp.id, `${year}-${String(month + 1).padStart(2, "0")}`)) {
      (map[a.date] ??= []).push(a);
    }
    return map;
  }, [emp, year, month]);

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
    const adj = adjustmentTotals(adjustmentsForEmployeeInMonth(emp.id, `${year}-${String(month + 1).padStart(2, "0")}`));
    return { workdays, reqTotal, reqTarget, meetingsDone, tasksDone, tasksTotal, knowledgeTotal, knowledgeTarget, adj };
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
          {
            label: "Net balance",
            value: netLabel(summary.adj.net),
            sub: `${fmtD(summary.adj.bonus)} bonus · ${fmtD(summary.adj.deduction)} deduction`,
            tone: netTone(summary.adj.net),
          },
        ].map(({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: string }) => (
          <div key={label} className="rounded-2xl border border-[#DCE9E6] bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
            <p className={`mt-1.5 text-2xl font-semibold ${tone ?? "text-slate-950 dark:text-white"}`}>{value}</p>
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
            const dayAdj = adjByDay[date] ?? [];
            const hasDeduction = (perf?.deductions.length ?? 0) > 0 || dayAdj.some(a => a.kind === "deduction");
            const hasBonus = dayAdj.some(a => a.kind === "bonus");

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
                      {hasBonus && <span title="Bonus" className="h-1.5 w-1.5 rounded-full bg-emerald-600" />}
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
          { color: "bg-emerald-600", label: "Bonus" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${color}`} />
            {label}
          </div>
        ))}
      </div>

      {/* Deductions & bonuses this month */}
      <AdjustmentsPanel
        items={adjustmentsForEmployeeInMonth(emp.id, `${year}-${String(month + 1).padStart(2, "0")}`)
          .sort((a, b) => a.date.localeCompare(b.date))}
        title={`Deductions & Bonuses — ${MONTH_NAMES[month]} ${year}`}
        onAdd={onAddAdjustment}
        emptyHint="Nothing recorded this month."
      />

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
  const [deduction, setDeduction] = useState<0 | 0.25 | 0.5 | 1 | 2 | 3>(0);
  const [bonus, setBonus] = useState<0 | 0.25 | 0.5 | 1 | 2 | 3>(0);
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
    // If a bonus was also set, save it as a separate adjustment
    if (bonus > 0) {
      addAdjustment({
        employeeId: emp.id,
        employeeName: emp.name,
        date,
        kind: "bonus",
        days: bonus,
        note: note.trim(),
        createdBy: "Manager",
      });
    }
    onClose();
  }

  const AMOUNTS = [
    { v: 0 as const, label: "None" },
    { v: 0.25 as const, label: "¼ day" },
    { v: 0.5 as const, label: "0.5 day" },
    { v: 1 as const, label: "1 day" },
    { v: 2 as const, label: "2 days" },
    { v: 3 as const, label: "3 days" },
  ];

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
            <DatePicker value={date} onChange={setDate} max={todayISO()} />
          </div>
          <div>
            <label className={labelCls}>Task / Note for {emp.name} *</label>
            <textarea rows={3} value={note} onChange={e => setNote(e.target.value)}
              placeholder="Describe the task or explain why performance was below expectation…"
              className={`${inputCls} resize-none`} />
          </div>

          {/* Deduction & Bonus side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Deduction</label>
              <div className="grid grid-cols-3 gap-1.5">
                {AMOUNTS.map(({ v, label }) => (
                  <label key={v} className={`flex cursor-pointer items-center justify-center rounded-xl border p-2.5 text-sm font-semibold transition ${deduction === v ? "border-rose-400 bg-rose-50 text-rose-600 dark:border-rose-700 dark:bg-rose-950 dark:text-rose-300" : "border-[#DCE9E6] text-slate-500 hover:border-rose-200 dark:border-slate-700"}`}>
                    <input type="radio" name="deduction" value={v} checked={deduction === v} onChange={() => setDeduction(v)} className="sr-only" />
                    {label}
                  </label>
                ))}
              </div>
              {deduction > 0 && (
                <p className="mt-1.5 text-xs text-rose-500">Appears in finance & calendar.</p>
              )}
            </div>
            <div>
              <label className={labelCls}>Bonus</label>
              <div className="grid grid-cols-3 gap-1.5">
                {AMOUNTS.map(({ v, label }) => (
                  <label key={v} className={`flex cursor-pointer items-center justify-center rounded-xl border p-2.5 text-sm font-semibold transition ${bonus === v ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "border-[#DCE9E6] text-slate-500 hover:border-emerald-200 dark:border-slate-700"}`}>
                    <input type="radio" name="bonus" value={v} checked={bonus === v} onChange={() => setBonus(v)} className="sr-only" />
                    {label}
                  </label>
                ))}
              </div>
              {bonus > 0 && (
                <p className="mt-1.5 text-xs text-emerald-600">Appears in finance & calendar.</p>
              )}
            </div>
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

// ── All-employees month summary table ─────────────────────────────────────────
function AllMonthView({ year, month, onEmpClick }: { year: number; month: number; onEmpClick: (empId: string) => void }) {
  const today = todayISO();
  const cfg = loadCRMTaskConfig();
  const dim = daysInMonth(year, month);
  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;

  const rows = useMemo(() => SALES_EMPLOYEES.map(emp => {
    let reqTotal = 0, meetingsDone = 0, knowledgeTotal = 0, tasksDone = 0, tasksTotal = 0;
    let workdays = 0;
    for (let d = 1; d <= dim; d++) {
      const date = isoDate(year, month, d);
      if (date > today || isWeekend(year, month, d)) continue;
      workdays++;
      const perf = getDayPerformance(emp.id, date, (dt) => countMeetingsForEmployee(emp.name, dt), cfg.requestsTarget, cfg.meetingsTarget, cfg.knowledgeTarget);
      reqTotal += perf.requestsCount;
      if (perf.meetingsDone) meetingsDone++;
      knowledgeTotal += perf.knowledgeCount;
      if (perf.adsTaskDone) tasksDone++;
      if (perf.knowledgeTaskDone) tasksDone++;
      if (perf.callsTaskDone) tasksDone++;
      if (perf.rotationTaskDone) tasksDone++;
      tasksTotal += 4;
    }
    const adj = adjustmentTotals(adjustmentsForEmployeeInMonth(emp.id, monthPrefix));
    const reqTarget = workdays * cfg.requestsTarget;
    const knowledgeTarget = workdays * cfg.knowledgeTarget;
    return { emp, workdays, reqTotal, reqTarget, meetingsDone, knowledgeTotal, knowledgeTarget, tasksDone, tasksTotal, adj };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [year, month, dim, today]);

  function pct(a: number, b: number) { return b === 0 ? 0 : Math.round((a / b) * 100); }
  function tone(a: number, b: number) {
    const p = pct(a, b);
    if (p >= 100) return "text-emerald-700 dark:text-emerald-400";
    if (p >= 50) return "text-amber-600 dark:text-amber-400";
    return "text-rose-600 dark:text-rose-400";
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#DCE9E6] dark:border-slate-800">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b border-[#DCE9E6] bg-[#F5F8F7] dark:border-slate-700 dark:bg-slate-800">
              {["Employee", "Requests", "Meetings", "Projects in Market", "Tasks", "Deduction", "Bonus", "Net"].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DCE9E6] dark:divide-slate-800">
            {rows.map(({ emp, reqTotal, reqTarget, meetingsDone, workdays, knowledgeTotal, knowledgeTarget, tasksDone, tasksTotal, adj }) => (
              <tr key={emp.id} onClick={() => onEmpClick(emp.id)} className="cursor-pointer transition hover:bg-[#F5F8F7] dark:hover:bg-slate-800/50">
                <td className="px-5 py-3">
                  <p className="font-semibold text-slate-900 dark:text-white">{emp.name}</p>
                  <p className="text-xs text-slate-400">{emp.role}</p>
                </td>
                <td className="px-5 py-3">
                  <span className={`font-semibold ${tone(reqTotal, reqTarget)}`}>{reqTotal}</span>
                  <span className="text-slate-400">/{reqTarget}</span>
                  <p className="text-[11px] text-slate-400">{pct(reqTotal, reqTarget)}%</p>
                </td>
                <td className="px-5 py-3">
                  <span className={`font-semibold ${tone(meetingsDone, workdays)}`}>{meetingsDone}</span>
                  <span className="text-slate-400">/{workdays} days</span>
                </td>
                <td className="px-5 py-3">
                  <span className={`font-semibold ${tone(knowledgeTotal, knowledgeTarget)}`}>{knowledgeTotal}</span>
                  <span className="text-slate-400">/{knowledgeTarget}</span>
                  <p className="text-[11px] text-slate-400">{pct(knowledgeTotal, knowledgeTarget)}%</p>
                </td>
                <td className="px-5 py-3">
                  <span className={`font-semibold ${tone(tasksDone, tasksTotal)}`}>{tasksDone}</span>
                  <span className="text-slate-400">/{tasksTotal}</span>
                  <p className="text-[11px] text-slate-400">{pct(tasksDone, tasksTotal)}%</p>
                </td>
                <td className="px-5 py-3">
                  <span className={adj.deduction > 0 ? "font-semibold text-rose-600 dark:text-rose-400" : "text-slate-400"}>
                    {adj.deduction > 0 ? fmtD(adj.deduction) : "—"}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className={adj.bonus > 0 ? "font-semibold text-emerald-700 dark:text-emerald-400" : "text-slate-400"}>
                    {adj.bonus > 0 ? fmtD(adj.bonus) : "—"}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className={`font-semibold ${netTone(adj.net)}`}>{netLabel(adj.net)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-[#DCE9E6] px-5 py-2 text-xs text-slate-400 dark:border-slate-700">Click a row to view that employee&apos;s month in detail.</p>
    </div>
  );
}

// ── All-employees day summary ──────────────────────────────────────────────────
function AllDayView({ date, onEmpClick }: { date: string; onEmpClick: (empId: string) => void }) {
  const cfg = loadCRMTaskConfig();

  return (
    <div className="overflow-hidden rounded-2xl border border-[#DCE9E6] dark:border-slate-800">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b border-[#DCE9E6] bg-[#F5F8F7] dark:border-slate-700 dark:bg-slate-800">
              {["Employee", "Requests", "Meetings", "Projects in Market", "Ads", "Calls", "Rotation", "Deduction / Bonus"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DCE9E6] dark:divide-slate-800">
            {SALES_EMPLOYEES.map(emp => {
              const perf = getDayPerformance(emp.id, date, (d) => countMeetingsForEmployee(emp.name, d), cfg.requestsTarget, cfg.meetingsTarget, cfg.knowledgeTarget);
              const adj = adjustmentTotals(adjustmentsForEmployeeOnDate(emp.id, date));
              function Cell({ done, label }: { done: boolean; label?: string }) {
                return (
                  <td className="px-4 py-3">
                    <span className={done ? "font-semibold text-emerald-700 dark:text-emerald-400" : "text-slate-400"}>
                      {label ?? (done ? "✓" : "—")}
                    </span>
                  </td>
                );
              }
              return (
                <tr key={emp.id} onClick={() => onEmpClick(emp.id)} className="cursor-pointer transition hover:bg-[#F5F8F7] dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900 dark:text-white">{emp.name}</p>
                    <p className="text-xs text-slate-400">{emp.role}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={perf.requestsCount >= perf.requestsTarget ? "font-semibold text-emerald-700 dark:text-emerald-400" : perf.requestsCount > 0 ? "font-semibold text-amber-600 dark:text-amber-400" : "text-slate-400"}>
                      {perf.requestsCount}/{perf.requestsTarget}
                    </span>
                  </td>
                  <Cell done={perf.meetingsDone} label={`${perf.meetingsCount}/${perf.requestsTarget > 0 ? cfg.meetingsTarget : 1}`} />
                  <td className="px-4 py-3">
                    <span className={perf.knowledgeTaskDone ? "font-semibold text-emerald-700 dark:text-emerald-400" : perf.knowledgeCount > 0 ? "font-semibold text-amber-600 dark:text-amber-400" : "text-slate-400"}>
                      {perf.knowledgeCount}/{perf.knowledgeTarget}
                    </span>
                  </td>
                  <Cell done={perf.adsTaskDone} />
                  <Cell done={perf.callsTaskDone} />
                  <Cell done={perf.rotationTaskDone} />
                  <td className="px-4 py-3">
                    {adj.deduction === 0 && adj.bonus === 0 ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <span className="flex items-center gap-2 text-xs font-semibold">
                        {adj.deduction > 0 && <span className="text-rose-600 dark:text-rose-400">−{fmtD(adj.deduction)}</span>}
                        {adj.bonus > 0 && <span className="text-emerald-700 dark:text-emerald-400">+{fmtD(adj.bonus)}</span>}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t border-[#DCE9E6] px-5 py-2 text-xs text-slate-400 dark:border-slate-700">Click a row to view that employee&apos;s day in detail.</p>
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
  const [showAdjustModal, setShowAdjustModal] = useState(false);
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
            <option value="all">All Employees</option>
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
            <DatePicker value={selectedDate} max={today} onChange={setSelectedDate} className="w-48" />
          </div>
        ) : (
          <div className="flex items-center gap-1 rounded-2xl border border-[#DCE9E6] bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
            <button onClick={prevMonth} className="rounded-xl p-2 text-slate-500 transition hover:bg-[#E8F3F1] hover:text-[#0B4F4B] dark:hover:bg-slate-800"><ChevronLeft className="h-4 w-4" /></button>
            <span className="min-w-36 text-center text-sm font-semibold text-slate-900 dark:text-white">{MONTH_NAMES[viewMonth]} {viewYear}</span>
            <button onClick={nextMonth} className="rounded-xl p-2 text-slate-500 transition hover:bg-[#E8F3F1] hover:text-[#0B4F4B] dark:hover:bg-slate-800"><ChevronRight className="h-4 w-4" /></button>
          </div>
        )}

        {/* Manager actions — only for a specific employee */}
        {selectedEmpId !== "all" && (
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowAssignModal(true)}>
              <Plus className="h-4 w-4" /> Assign Extra Task
            </Button>
            <Button onClick={() => setShowAdjustModal(true)}>
              <Scale className="h-4 w-4" /> Deduction / Bonus
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      {selectedEmpId === "all" ? (
        viewMode === "day" ? (
          <AllDayView date={selectedDate} onEmpClick={(id) => { setSelectedEmpId(id); }} />
        ) : (
          <AllMonthView year={viewYear} month={viewMonth} onEmpClick={(id) => { setSelectedEmpId(id); }} />
        )
      ) : viewMode === "day" ? (
        <DayPerfCard
          emp={selectedEmp}
          date={selectedDate}
          onAssignTask={() => setShowAssignModal(true)}
          onAddAdjustment={() => setShowAdjustModal(true)}
        />
      ) : (
        <MonthView
          emp={selectedEmp}
          year={viewYear}
          month={viewMonth}
          onDayClick={(date) => { setSelectedDate(date); setViewMode("day"); }}
          onAddAdjustment={() => setShowAdjustModal(true)}
        />
      )}

      {showAssignModal && selectedEmpId !== "all" && selectedEmp && (
        <AssignTaskModal
          emp={selectedEmp}
          defaultDate={viewMode === "day" ? selectedDate : today}
          onClose={() => setShowAssignModal(false)}
        />
      )}

      {showAdjustModal && selectedEmpId !== "all" && selectedEmp && (
        <AdjustmentModal
          emp={selectedEmp}
          defaultDate={viewMode === "day" ? selectedDate : today}
          onClose={() => setShowAdjustModal(false)}
        />
      )}
    </div>
  );
}
