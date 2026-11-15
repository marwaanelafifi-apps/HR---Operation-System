"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Download, Receipt, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { loadRequests, onRequestsChanged, type VisitRequest } from "@/lib/requests-store";
import { employees } from "@/lib/mock-data";
import { calcDelayMinutes, deductionForDelay, deductionLabel, isDayOff, loadWorkSchedule, offDaysInMonth, type WorkSchedule } from "@/lib/work-schedule";

type FinanceTab = "expenses" | "attendance";

// ── Attendance helpers (mirrors attendance-workspace key scheme) ──────────────
type Stamp = { at: string; distance: number | null; accuracy?: number | null; waived: boolean; kind?: "office" | "field"; meetingZone?: string; projectName?: string };
type DayRecord = { checkIn?: Stamp; checkOut?: Stamp };

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const clockFmt = (iso: string) => new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso));

function readDayRecord(dateStr: string): DayRecord {
  try { return JSON.parse(window.localStorage.getItem(`opshub-demo-attendance-${dateStr}`) ?? "{}"); } catch { return {}; }
}
function getMonthRecords(year: number, month: number): Record<number, DayRecord> {
  const result: Record<number, DayRecord> = {};
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    result[day] = readDayRecord(ds);
  }
  return result;
}
function delayMinsForRecord(record: DayRecord, schedule: WorkSchedule): number {
  if (!record.checkIn) return 0;
  return calcDelayMinutes(record.checkIn.at, schedule);
}
function hoursWorked(record: DayRecord): number {
  if (!record.checkIn || !record.checkOut) return 0;
  return (new Date(record.checkOut.at).getTime() - new Date(record.checkIn.at).getTime()) / 3600000;
}
function dayStatus(record: DayRecord, isWorkday: boolean, isFuture: boolean, schedule: WorkSchedule): "present" | "late" | "absent" | "weekend" | "future" {
  if (!isWorkday) return "weekend";
  if (isFuture) return "future";
  if (!record.checkIn) return "absent";
  if (delayMinsForRecord(record, schedule) > 0) return "late";
  return "present";
}

// ── CSV helpers ───────────────────────────────────────────────────────────────
function buildCsvRows(employeeName: string, year: number, month: number, schedule: WorkSchedule): string[][] {
  const records = getMonthRecords(year, month);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const rows: string[][] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const r = records[d] ?? {};
    const isWorkday = !isDayOff(new Date(ds), schedule);
    const isFuture = new Date(ds) > today;
    const delay = delayMinsForRecord(r, schedule);
    const hrs = hoursWorked(r);
    const status = dayStatus(r, isWorkday, isFuture, schedule);
    const deduct = delay > 0 ? deductionForDelay(delay, schedule) : 0;
    rows.push([
      employeeName,
      ds,
      DAY_NAMES[new Date(ds).getDay()],
      r.checkIn ? clockFmt(r.checkIn.at) : "",
      r.checkOut ? clockFmt(r.checkOut.at) : "",
      hrs > 0 ? hrs.toFixed(2) : "",
      delay > 0 ? String(delay) : "",
      deduct > 0 ? deductionLabel(deduct) : "",
      status === "weekend" ? "Weekend" : status === "future" ? "" : status.charAt(0).toUpperCase() + status.slice(1),
    ]);
  }
  return rows;
}

function downloadCsv(filename: string, header: string[], rows: string[][]) {
  const lines = [header, ...rows].map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([lines], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const CSV_HEADER = ["Employee", "Date", "Day", "Check-In", "Check-Out", "Hours Worked", "Delay (min)", "Deduction", "Status"];

// ── Expense section ───────────────────────────────────────────────────────────
function parseDateTime(date: string, time: string) { return new Date(`${date}T${time || "00:00"}`); }
type FilterBy = "all" | "employee";

function ExpensesSection() {
  const [visits, setVisits] = useState<VisitRequest[]>([]);
  const [filter, setFilter] = useState<FilterBy>("all");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const refresh = () => {
      const all = loadRequests().visits.filter(v => v.closed && v.transportationCost !== undefined);
      setVisits(all.sort((a, b) => parseDateTime(b.date, b.time).getTime() - parseDateTime(a.date, a.time).getTime()));
    };
    refresh(); setReady(true);
    return onRequestsChanged(refresh);
  }, []);

  const { expenses, empNames, totals } = useMemo(() => {
    const empNames = [...new Set(visits.map(v => v.employeeName))].sort();
    const filtered = filter === "employee" && selectedEmployee ? visits.filter(v => v.employeeName === selectedEmployee) : visits;
    return {
      expenses: filtered,
      empNames,
      totals: {
        count: filtered.length,
        cost: filtered.reduce((s, v) => s + (v.transportationCost ?? 0), 0),
        receipts: filtered.reduce((s, v) => s + (v.receipts?.length ?? 0), 0),
      },
    };
  }, [visits, filter, selectedEmployee]);

  return (
    <div className="space-y-6">
      {ready && (
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Total Expenses", value: `EGP ${totals.cost.toFixed(2)}`, sub: `${totals.count} meeting${totals.count !== 1 ? "s" : ""}` },
            { label: "Total Receipts", value: String(totals.receipts), sub: `file${totals.receipts !== 1 ? "s" : ""} uploaded` },
            { label: "Average Cost", value: `EGP ${totals.count > 0 ? (totals.cost / totals.count).toFixed(2) : "0.00"}`, sub: "per meeting" },
          ].map(({ label, value, sub }) => (
            <div key={label} className="rounded-2xl border border-[#DCE9E6] bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{value}</p>
              <p className="text-xs text-slate-400">{sub}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Filter by:</span>
        <div role="tablist" className="flex gap-1 rounded-2xl border border-[#DCE9E6] bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
          {(["all", "employee"] as const).map(f => (
            <button key={f} role="tab" aria-selected={filter === f} onClick={() => { setFilter(f); if (f !== "employee") setSelectedEmployee(""); }}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${filter === f ? "bg-[#0B4F4B] text-white" : "text-slate-500 hover:text-[#0B4F4B] dark:text-slate-400"}`}>
              {f === "all" ? "All expenses" : "By employee"}
            </button>
          ))}
        </div>
        {filter === "employee" && (
          <select value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)}
            className="rounded-xl border border-[#DCE9E6] bg-white px-4 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
            <option value="">Select employee</option>
            {empNames.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        )}
      </div>

      {ready && expenses.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#DCE9E6] bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No closed meetings yet</p>
          <p className="mt-1 text-sm text-slate-500">Meeting expenses appear here once closed with receipts.</p>
        </div>
      )}

      <ul className="grid gap-4 lg:grid-cols-2">
        {expenses.map(visit => (
          <li key={visit.id} className="rounded-2xl border border-[#DCE9E6] bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Site visit <span className="text-slate-500 font-normal">#{visit.id.replace("omr-", "")}</span></p>
                <h3 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{visit.projectName}</h3>
                <p className="text-sm text-slate-500">{visit.employeeName}</p>
              </div>
              <Badge tone="success">Closed</Badge>
            </div>
            <dl className="mt-4 space-y-2 border-t border-[#DCE9E6] pt-4 text-sm dark:border-slate-800">
              <div className="grid grid-cols-[88px_1fr] gap-3"><dt className="text-slate-500">Client</dt><dd className="font-medium text-slate-900 dark:text-slate-100">{visit.clientName}</dd></div>
              <div className="grid grid-cols-[88px_1fr] gap-3"><dt className="text-slate-500">Date</dt><dd className="font-medium text-slate-900 dark:text-slate-100">{visit.date}</dd></div>
              <div className="grid grid-cols-[88px_1fr] gap-3"><dt className="text-slate-500">Cost</dt><dd className="font-semibold text-[#0B4F4B] dark:text-[#8FD4C6]">EGP {(visit.transportationCost ?? 0).toFixed(2)}</dd></div>
            </dl>
            {visit.receipts && visit.receipts.length > 0 && (
              <div className="mt-4 border-t border-[#DCE9E6] pt-4 dark:border-slate-800">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Receipts ({visit.receipts.length})</p>
                <ul className="flex flex-wrap gap-2">
                  {visit.receipts.map((receipt, idx) => (
                    <li key={idx}>
                      <a href={receipt} download={`receipt-${visit.id}-${idx + 1}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#E8F3F1] px-3 py-1.5 text-xs font-medium text-[#0B4F4B] transition hover:bg-[#DCE9E6] dark:bg-slate-800 dark:text-[#8FD4C6]">
                        <Receipt className="h-3.5 w-3.5" />Receipt {idx + 1}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Attendance section ────────────────────────────────────────────────────────
function AttendanceSection() {
  const today = new Date();
  const [selectedEmp, setSelectedEmp] = useState(employees[0].name);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [monthRecords, setMonthRecords] = useState<Record<number, DayRecord>>({});
  const [schedule, setSchedule] = useState<WorkSchedule | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSchedule(loadWorkSchedule());
    setMonthRecords(getMonthRecords(viewYear, viewMonth));
    setReady(true);
  }, [viewYear, viewMonth]);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }
  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const offDays = useMemo(() => schedule ? offDaysInMonth(viewYear, viewMonth, schedule) : new Set<number>(), [schedule, viewYear, viewMonth]);

  const stats = useMemo(() => {
    if (!schedule) return { present: 0, late: 0, absent: 0, lateMinTotal: 0, hoursTotal: 0 };
    return Object.entries(monthRecords).reduce((acc, [dayStr, r]) => {
      const d = parseInt(dayStr, 10);
      const isWorkday = !offDays.has(d);
      const ds = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const isFuture = new Date(ds) > today;
      if (isFuture) return acc;
      if (r.checkIn) {
        acc.present++;
        const dm = delayMinsForRecord(r, schedule);
        if (dm > 0 && isWorkday) { acc.late++; acc.lateMinTotal += dm; }
      } else if (isWorkday) {
        acc.absent++;
      }
      acc.hoursTotal += hoursWorked(r);
      return acc;
    }, { present: 0, late: 0, absent: 0, lateMinTotal: 0, hoursTotal: 0 });
  }, [monthRecords, viewYear, viewMonth, today, offDays, schedule]);

  function handleExportSingle() {
    if (!schedule) return;
    const rows = buildCsvRows(selectedEmp, viewYear, viewMonth, schedule);
    downloadCsv(`attendance-${selectedEmp.replace(/ /g, "-")}-${viewYear}-${String(viewMonth + 1).padStart(2, "0")}.csv`, CSV_HEADER, rows);
  }
  function handleExportAll() {
    if (!schedule) return;
    const allRows: string[][] = [];
    employees.forEach(emp => { allRows.push(...buildCsvRows(emp.name, viewYear, viewMonth, schedule)); });
    downloadCsv(`attendance-all-${viewYear}-${String(viewMonth + 1).padStart(2, "0")}.csv`, CSV_HEADER, allRows);
  }

  return (
    <div className="space-y-6">
      {/* Demo notice */}
      <div className="flex items-start gap-3 rounded-2xl border border-[#DCE9E6] bg-[#F5F8F7] px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
        <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
          <b className="text-slate-700 dark:text-slate-300">Prototype mode.</b> Attendance records are stored per-browser. Demo data exists for Ahmed Khalil. All other employees will show empty records until real check-ins are recorded.
        </p>
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-500" />
            <select
              value={selectedEmp}
              onChange={e => setSelectedEmp(e.target.value)}
              className="rounded-xl border border-[#DCE9E6] bg-white px-4 py-2 text-sm font-medium dark:border-slate-700 dark:bg-slate-900"
            >
              {employees.map(emp => (
                <option key={emp.id} value={emp.name}>{emp.name} — {emp.role}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1 rounded-2xl border border-[#DCE9E6] bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
            <button onClick={prevMonth} className="rounded-xl p-2 text-slate-500 transition hover:bg-[#E8F3F1] hover:text-[#0B4F4B] dark:hover:bg-slate-800" aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-36 text-center text-sm font-semibold text-slate-900 dark:text-white">{MONTH_NAMES[viewMonth]} {viewYear}</span>
            <button onClick={nextMonth} disabled={isCurrentMonth} className="rounded-xl p-2 text-slate-500 transition hover:bg-[#E8F3F1] hover:text-[#0B4F4B] disabled:opacity-30 dark:hover:bg-slate-800" aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportSingle}
            className="inline-flex items-center gap-2 rounded-xl border border-[#DCE9E6] bg-white px-4 py-2 text-sm font-semibold text-[#0B4F4B] transition hover:bg-[#E8F3F1] dark:border-slate-700 dark:bg-slate-900 dark:text-[#8FD4C6]">
            <Download className="h-4 w-4" />Export this employee
          </button>
          <button onClick={handleExportAll}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0B4F4B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#063C39]">
            <Download className="h-4 w-4" />Export all employees
          </button>
        </div>
      </div>

      {/* Stats */}
      {ready && (
        <div className="grid gap-3 sm:grid-cols-5">
          {[
            { label: "Days Present", value: stats.present, color: "text-emerald-600", sub: "checked in" },
            { label: "Days Late", value: stats.late, color: "text-amber-600", sub: stats.late > 0 ? `${Math.round(stats.lateMinTotal / stats.late)} min avg` : "no delays" },
            { label: "Days Absent", value: stats.absent, color: "text-rose-600", sub: "no record" },
            { label: "Total Hours", value: stats.hoursTotal.toFixed(1), color: "text-slate-950 dark:text-white", sub: "hours worked" },
            { label: "Avg Hours/Day", value: stats.present > 0 ? (stats.hoursTotal / stats.present).toFixed(1) : "0.0", color: "text-slate-950 dark:text-white", sub: "per present day" },
          ].map(({ label, value, color, sub }) => (
            <div key={label} className="rounded-2xl border border-[#DCE9E6] bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
              <p className={`mt-2 text-2xl font-semibold ${color}`}>{value}</p>
              <p className="text-xs text-slate-400">{sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Calendar */}
      {ready && (
        <div className="rounded-2xl border border-[#DCE9E6] bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">{selectedEmp}</h2>
            <div className="flex gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm bg-emerald-100 dark:bg-emerald-950" />Present</span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm bg-amber-100 dark:bg-amber-950" />Late</span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm bg-rose-100 dark:bg-rose-950" />Absent</span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm bg-slate-100 dark:bg-slate-700" />Weekend</span>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1.5 mb-1.5">
            {DAY_NAMES.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-slate-500 py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {/* Empty cells before first day */}
            {Array.from({ length: firstDayOfWeek }, (_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const dayNum = i + 1;
              const r = monthRecords[dayNum] ?? {};
              const ds = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
              const isFuture = new Date(ds) > today;
              const isWorkday = !offDays.has(dayNum);
              const isToday = isCurrentMonth && dayNum === today.getDate();
              const delay = schedule ? delayMinsForRecord(r, schedule) : 0;
              const deduct = delay > 0 && schedule ? deductionForDelay(delay, schedule) : 0;
              const status = schedule ? dayStatus(r, isWorkday, isFuture, schedule) : "future";
              const hrs = hoursWorked(r);

              const bg =
                status === "weekend" ? "bg-slate-50 dark:bg-slate-800/60" :
                status === "future" ? "bg-white dark:bg-slate-900" :
                status === "late" ? "bg-amber-50 dark:bg-amber-950/30" :
                status === "present" ? "bg-emerald-50 dark:bg-emerald-950/30" :
                "bg-rose-50 dark:bg-rose-950/30";

              const numColor =
                status === "weekend" ? "text-slate-400" :
                status === "late" ? "text-amber-800 dark:text-amber-200" :
                status === "present" ? "text-emerald-800 dark:text-emerald-200" :
                status === "absent" ? "text-rose-800 dark:text-rose-200" :
                "text-slate-700 dark:text-slate-300";

              return (
                <div key={dayNum}
                  className={`${bg} rounded-xl border ${isToday ? "border-[#0B4F4B] dark:border-[#8FD4C6]" : "border-[#DCE9E6] dark:border-slate-700"} p-2 min-h-[90px] flex flex-col gap-0.5`}>
                  <span className={`text-xs font-semibold ${numColor} ${isToday ? "flex h-5 w-5 items-center justify-center rounded-full bg-[#0B4F4B] text-white dark:bg-[#8FD4C6] dark:text-slate-900" : ""}`}>
                    {dayNum}
                  </span>
                  {delay > 0 && (
                    <span className="mt-0.5 inline-block rounded px-1 py-0.5 text-[10px] font-semibold bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-100 leading-tight">
                      +{delay}m{deduct > 0 ? ` · ${deductionLabel(deduct)}` : ""}
                    </span>
                  )}
                  {r.checkIn && (
                    <span className={`text-[10px] leading-tight ${numColor}`}>
                      {clockFmt(r.checkIn.at)}{r.checkOut ? ` → ${clockFmt(r.checkOut.at)}` : ""}
                    </span>
                  )}
                  {hrs > 0 && (
                    <span className="text-[10px] leading-tight text-slate-500">{hrs.toFixed(1)}h</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary table of all employees */}
      <div className="rounded-2xl border border-[#DCE9E6] bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-[#DCE9E6] px-6 py-4 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-950 dark:text-white">All employees — {MONTH_NAMES[viewMonth]} {viewYear}</h2>
          <p className="text-xs text-slate-500 mt-0.5">Summary per employee for the selected month.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#DCE9E6] dark:border-slate-800">
                {["Employee", "Role", "Present", "Late", "Absent", "Hours"].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE9E6] dark:divide-slate-800">
              {employees.map(emp => {
                const empRecords = getMonthRecords(viewYear, viewMonth);
                const s = Object.entries(empRecords).reduce((acc, [dayStr, r]) => {
                  const d = parseInt(dayStr, 10);
                  const ds = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                  if (new Date(ds) > today) return acc;
                  const isWorkday = !offDays.has(d);
                  const dm = schedule ? delayMinsForRecord(r, schedule) : 0;
                  if (r.checkIn) { acc.present++; if (dm > 0 && isWorkday) acc.late++; acc.hours += hoursWorked(r); }
                  else if (isWorkday) acc.absent++;
                  return acc;
                }, { present: 0, late: 0, absent: 0, hours: 0 });
                const isSelected = emp.name === selectedEmp;
                return (
                  <tr key={emp.id}
                    className={`cursor-pointer transition hover:bg-[#F5F8F7] dark:hover:bg-slate-800/60 ${isSelected ? "bg-[#E8F3F1] dark:bg-[#133E3C]/30" : ""}`}
                    onClick={() => setSelectedEmp(emp.name)}>
                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">{emp.name}</td>
                    <td className="px-5 py-3 text-slate-500">{emp.role}</td>
                    <td className="px-5 py-3"><span className={`font-semibold ${s.present > 0 ? "text-emerald-600" : "text-slate-400"}`}>{s.present}</span></td>
                    <td className="px-5 py-3"><span className={`font-semibold ${s.late > 0 ? "text-amber-600" : "text-slate-400"}`}>{s.late}</span></td>
                    <td className="px-5 py-3"><span className={`font-semibold ${s.absent > 0 ? "text-rose-600" : "text-slate-400"}`}>{s.absent}</span></td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{s.hours > 0 ? `${s.hours.toFixed(1)}h` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Root component ────────────────────────────────────────────────────────────
export function FinanceWorkspace() {
  const [tab, setTab] = useState<FinanceTab>("expenses");

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0B4F4B] dark:text-[#8FD4C6]">Finance</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">Finance Dashboard</h1>
          <p className="mt-1.5 text-sm text-slate-500">Track meeting expenses and employee attendance records for salary calculation.</p>
        </div>
        <div role="tablist" className="flex gap-1 rounded-2xl border border-[#DCE9E6] bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
          {([
            { id: "expenses" as const, label: "Meeting Expenses", Icon: Receipt },
            { id: "attendance" as const, label: "Attendance", Icon: CalendarDays },
          ]).map(({ id, label, Icon }) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${tab === id ? "bg-[#0B4F4B] text-white" : "text-slate-500 hover:text-[#0B4F4B] dark:text-slate-400"}`}>
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </div>
      </header>

      {tab === "expenses" && <ExpensesSection />}
      {tab === "attendance" && <AttendanceSection />}
    </div>
  );
}
