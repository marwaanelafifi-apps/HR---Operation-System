"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, Check, Clock3, Lock, LoaderCircle, LogOut, MapPin, ShieldCheck, Unlock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { distanceMetres, formatDistance, getPosition, loadOffice, loadUnlocks, type GeoFailure, type OfficeLocation } from "@/lib/office-location";
import { autoDeductDelay, confirmFieldCheckIn, getTodayFieldVisits, onRequestsChanged, openVisitsForUser, type VisitRequest } from "@/lib/requests-store";

const EMPLOYEE_ID = "ahmed-khalil"; // demo user until real sign-in exists
const EMPLOYEE_NAME = "Ahmed Khalil";
const shifts = [
  { id: "11", label: "11:00 AM – 7:00 PM", startHour: 11 },
  { id: "12", label: "12:00 PM – 8:00 PM", startHour: 12 },
];

type Stamp = {
  at: string;
  distance: number | null;
  accuracy?: number | null;
  waived: boolean;
  kind?: "office" | "field";
  meetingId?: string;
  meetingZone?: string;
  projectName?: string;
};
type DayRecord = { checkIn?: Stamp; checkOut?: Stamp };
type Blocked =
  | { kind: "outside"; distance: number; radius: number; accuracy: number }
  | { kind: "imprecise"; accuracy: number; limit: number }
  | { kind: GeoFailure };

const todayKey = () => `opshub-demo-attendance-${new Date().toISOString().slice(0, 10)}`;
const clock = (iso: string) => new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso));

function readRecord(dateStr?: string): DayRecord {
  const key = dateStr ? `opshub-demo-attendance-${dateStr}` : todayKey();
  try { return JSON.parse(window.localStorage.getItem(key) ?? "{}"); } catch { return {}; }
}
function writeRecord(record: DayRecord) {
  try { window.localStorage.setItem(todayKey(), JSON.stringify(record)); } catch { /* storage unavailable */ }
}

function getMonthRecords(year: number, month: number): Record<number, DayRecord> {
  const result: Record<number, DayRecord> = {};
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    result[day] = readRecord(dateStr);
  }
  return result;
}

type Tab = "today" | "month";

export function AttendanceWorkspace() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("today");
  const [office, setOffice] = useState<OfficeLocation>({ name: "", radius: "150" });
  const [record, setRecord] = useState<DayRecord>({});
  const [unlocked, setUnlocked] = useState(false);
  const [shiftId, setShiftId] = useState("11");
  const [busy, setBusy] = useState<"in" | "out" | null>(null);
  const [blocked, setBlocked] = useState<Blocked | null>(null);
  const [dateLabel, setDateLabel] = useState("");
  const [openVisits, setOpenVisits] = useState<VisitRequest[]>([]);
  const [fieldVisits, setFieldVisits] = useState<{ checkIn: VisitRequest | null; checkOut: VisitRequest | null }>({ checkIn: null, checkOut: null });
  const [stampMode, setStampMode] = useState<"in" | "out" | null>(null);
  const [monthRecords, setMonthRecords] = useState<Record<number, DayRecord>>({});

  useEffect(() => {
    setOffice(loadOffice());
    setRecord(readRecord());
    setUnlocked(Boolean(loadUnlocks()[EMPLOYEE_ID]));
    try { setShiftId(window.localStorage.getItem("opshub-demo-shift") ?? "11"); } catch { /* storage unavailable */ }
    setDateLabel(new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date()));
    const today = new Date();
    setMonthRecords(getMonthRecords(today.getFullYear(), today.getMonth()));
    const refresh = () => {
      setOpenVisits(openVisitsForUser(EMPLOYEE_NAME));
      setFieldVisits(getTodayFieldVisits(EMPLOYEE_NAME));
      setMonthRecords(getMonthRecords(today.getFullYear(), today.getMonth()));
    };
    refresh();
    const unsubscribe = onRequestsChanged(refresh);
    setReady(true);
    return unsubscribe;
  }, []);

  const shift = shifts.find((s) => s.id === shiftId) ?? shifts[0];
  const hasOffice = office.lat !== undefined && office.lng !== undefined;
  const radius = Number(office.radius) || 150;
  const done = Boolean(record.checkOut);
  const inside = Boolean(record.checkIn) && !done;

  async function stamp(kind: "in" | "out", fromField: boolean = false) {
    if (kind === "out" && openVisits.length > 0) return; // guard: checkout blocked
    setBlocked(null);
    setBusy(kind);
    setStampMode(null);
    try {
      let distance: number | null = null;
      let accuracy: number | null = null;
      const stampKind: "office" | "field" = fromField ? "field" : "office";
      const meetingId = fromField ? (kind === "in" ? fieldVisits.checkIn?.id : fieldVisits.checkOut?.id) : undefined;
      const meetingZone = fromField ? (kind === "in" ? fieldVisits.checkIn?.zone : fieldVisits.checkOut?.zone) : undefined;
      const projectName = fromField ? (kind === "in" ? fieldVisits.checkIn?.projectName : fieldVisits.checkOut?.projectName) : undefined;

      if (!fromField && !unlocked) {
        const fix = await getPosition();
        // A reading that is less precise than the radius cannot prove presence (Wi-Fi or IP locations can be kilometres off).
        const limit = Math.max(radius, 100);
        if (fix.accuracy > limit) {
          setBlocked({ kind: "imprecise", accuracy: fix.accuracy, limit });
          return;
        }
        distance = distanceMetres(fix, { lat: office.lat!, lng: office.lng! });
        accuracy = fix.accuracy;
        if (distance > radius) {
          setBlocked({ kind: "outside", distance, radius, accuracy: fix.accuracy });
          return;
        }
      }
      const now = new Date().toISOString();

      // Auto-deduct delay from excuse balance if checking in late
      if (kind === "in" && !fromField && !unlocked) {
        const checkInTime = new Date(now);
        const shiftStart = new Date(checkInTime);
        shiftStart.setHours(shift.startHour, 0, 0, 0);
        const delayMinutes = Math.round((checkInTime.getTime() - shiftStart.getTime()) / 60000);
        if (delayMinutes > 0) {
          autoDeductDelay(EMPLOYEE_NAME, delayMinutes);
        }
      }

      const next: DayRecord = {
        ...record,
        [kind === "in" ? "checkIn" : "checkOut"]: {
          at: now,
          distance,
          accuracy,
          waived: unlocked,
          kind: stampKind,
          meetingId,
          meetingZone,
          projectName,
        }
      };
      setRecord(next);
      writeRecord(next);

      // If this is a field stamp, confirm it in the visits store
      if (fromField && meetingId) {
        confirmFieldCheckIn(meetingId);
      }
    } catch (failure) {
      setBlocked({ kind: failure as GeoFailure });
    } finally {
      setBusy(null);
    }
  }

  function resetToday() {
    try { window.localStorage.removeItem(todayKey()); } catch { /* storage unavailable */ }
    setRecord({});
    setBlocked(null);
  }

  function changeShift(id: string) {
    setShiftId(id);
    try { window.localStorage.setItem("opshub-demo-shift", id); } catch { /* storage unavailable */ }
  }

  function lateNote() {
    if (!record.checkIn) return null;
    const at = new Date(record.checkIn.at);
    const start = new Date(at); start.setHours(shift.startHour, 0, 0, 0);
    const late = Math.round((at.getTime() - start.getTime()) / 60000);
    return late > 0 ? `Late by ${late} min` : "On time";
  }

  function worked() {
    if (!record.checkIn || !record.checkOut) return "—";
    const minutes = Math.round((new Date(record.checkOut.at).getTime() - new Date(record.checkIn.at).getTime()) / 60000);
    return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
  }

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0B4F4B] dark:text-[#8FD4C6]">{tab === "today" ? dateLabel || " " : "This month"}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">Attendance</h1>
          <p className="mt-1.5 text-sm text-slate-500">{tab === "today" ? "Check in when you arrive at the office. Your location is checked once, only when you tap." : "Your attendance record for this month."}</p>
        </div>
        <div role="tablist" aria-label="View attendance" className="flex gap-1 rounded-2xl border border-[#DCE9E6] bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
          {(["today", "month"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${tab === t ? "bg-[#0B4F4B] text-white" : "text-slate-500 hover:text-[#0B4F4B] dark:text-slate-400"}`}
            >
              {t === "today" ? "Today" : "This month"}
            </button>
          ))}
        </div>
      </header>

      {tab === "today" && (
        <>
          {ready && !hasOffice && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/60 dark:bg-amber-950/30">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div className="flex-1">
                  <h2 className="text-base font-semibold text-amber-900 dark:text-amber-100">Office location is not set yet</h2>
                  <p className="mt-1 text-sm leading-6 text-amber-800 dark:text-amber-200">Check-in needs the office location. An admin sets it once in the Admin panel, under Office location.</p>
                  <Button asChild className="mt-4"><Link href="/admin"><MapPin className="h-4 w-4" />Open Admin panel</Link></Button>
                </div>
              </div>
            </section>
          )}

          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="rounded-2xl border border-[#DCE9E6] bg-white p-6 dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={done ? "default" : inside ? "success" : "info"}>{done ? "Day complete" : inside ? "Checked in" : "Not checked in"}</Badge>
            {unlocked && <Badge tone="warning"><Unlock className="mr-1 h-3 w-3" />Location check waived by admin</Badge>}
          </div>

          <h2 className="mt-5 text-4xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">
            {done ? "See you tomorrow" : inside ? `In since ${clock(record.checkIn!.at)}` : "Ready to start?"}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {done ? `Worked ${worked()} today.` : inside ? lateNote() : hasOffice ? `Your shift starts at ${shift.label.split(" – ")[0]}.` : "Waiting for the office location."}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {!inside && !done && (
              <>
                {fieldVisits.checkIn && stampMode === "in" ? (
                  <div className="flex w-full flex-col gap-2">
                    <Button size="lg" className="w-full" onClick={() => stamp("in", false)} disabled={busy !== null}>
                      {busy === "in" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      {busy === "in" ? "Checking…" : "Check in at office"}
                    </Button>
                    <Button size="lg" className="w-full bg-[#8FD4C6] text-[#0B4F4B] hover:bg-[#7CCAB8]" onClick={() => stamp("in", true)} disabled={busy !== null}>
                      {busy === "in" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                      {busy === "in" ? "Checking…" : `Check in at ${fieldVisits.checkIn.zone}`}
                    </Button>
                    <Button variant="outline" size="lg" onClick={() => setStampMode(null)}>Cancel</Button>
                  </div>
                ) : (
                  <Button size="lg" className="min-w-40" onClick={() => fieldVisits.checkIn ? setStampMode("in") : stamp("in")} disabled={!hasOffice || busy !== null}>
                    {busy === "in" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    {busy === "in" ? "Checking location…" : "Check in"}
                  </Button>
                )}
              </>
            )}
            {inside && (
              <>
                {fieldVisits.checkOut && stampMode === "out" ? (
                  <div className="flex w-full flex-col gap-2">
                    <Button size="lg" className="w-full" onClick={() => stamp("out", false)} disabled={busy !== null || openVisits.length > 0}>
                      {busy === "out" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                      {busy === "out" ? "Checking…" : "Check out at office"}
                    </Button>
                    <Button size="lg" className="w-full bg-[#8FD4C6] text-[#0B4F4B] hover:bg-[#7CCAB8]" onClick={() => stamp("out", true)} disabled={busy !== null || openVisits.length > 0}>
                      {busy === "out" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                      {busy === "out" ? "Checking…" : `Check out at ${fieldVisits.checkOut.zone}`}
                    </Button>
                    <Button variant="outline" size="lg" onClick={() => setStampMode(null)}>Cancel</Button>
                  </div>
                ) : (
                  <Button size="lg" variant="outline" className="min-w-40" onClick={() => fieldVisits.checkOut ? setStampMode("out") : stamp("out")} disabled={busy !== null || openVisits.length > 0}>
                    {openVisits.length > 0 ? <Lock className="h-4 w-4" /> : busy === "out" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                    {openVisits.length > 0 ? "Close meetings first" : busy === "out" ? "Checking location…" : "Check out"}
                  </Button>
                )}
              </>
            )}
          </div>

          {inside && openVisits.length > 0 && (
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                  {openVisits.length} meeting{openVisits.length === 1 ? "" : "s"} still need outcome notes
                </p>
                <ul className="mt-2 space-y-1 text-xs text-amber-800 dark:text-amber-200">
                  {openVisits.map(v => (
                    <li key={v.id} className="flex items-center gap-2">
                      <span className="h-1 w-1 rounded-full bg-amber-600" />
                      <strong className="font-semibold">{v.projectName}</strong>
                      <span>· {v.clientName} · {v.date}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/meetings" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-900 underline-offset-4 hover:underline dark:text-amber-200">
                  Go close them in Meetings →
                </Link>
              </div>
            </div>
          )}

          {blocked && <BlockedMessage blocked={blocked} />}

          <p className="mt-8 flex items-center gap-2 text-xs text-slate-400"><ShieldCheck className="h-4 w-4" />Only you and authorised managers see your record. Saved in this browser only (demo).</p>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-[#DCE9E6] bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-semibold">Today</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <Line label="Shift" value={shift.label} />
              <Line label="Check-in" value={record.checkIn ? clock(record.checkIn.at) : "—"} note={record.checkIn ? (record.checkIn.waived ? "Waived by admin" : record.checkIn.kind === "field" ? `At ${record.checkIn.meetingZone}${record.checkIn.projectName ? ` · ${record.checkIn.projectName}` : ""}` : record.checkIn.distance !== null ? `${formatDistance(record.checkIn.distance)} from office${record.checkIn.accuracy ? `, ±${Math.round(record.checkIn.accuracy)} m` : ""}` : undefined) : undefined} />
              <Line label="Check-out" value={record.checkOut ? clock(record.checkOut.at) : "—"} note={record.checkOut ? (record.checkOut.kind === "field" ? `At ${record.checkOut.meetingZone}${record.checkOut.projectName ? ` · ${record.checkOut.projectName}` : ""}` : undefined) : undefined} />
              <Line label="Worked" value={worked()} />
            </dl>
            {record.checkIn && <button onClick={resetToday} className="mt-4 block text-xs font-semibold text-slate-500 underline-offset-4 hover:text-[#0B4F4B] hover:underline">Reset today&apos;s record (demo only)</button>}
            <Link href="/requests/excuse" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#0B4F4B] hover:underline dark:text-[#8FD4C6]"><Clock3 className="h-4 w-4" />Running late? Request an excuse</Link>
          </section>

          <section className="rounded-2xl border border-[#DCE9E6] bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-semibold">Office</h2>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{office.name || "—"}</p>
            <p className="mt-0.5 text-xs text-slate-500">{hasOffice ? `Check in within ${radius} m` : "Location not set"}</p>
            <label className="mt-4 block text-xs font-medium text-slate-500" htmlFor="shift">Assigned shift (set by admin)</label>
            <select id="shift" value={shiftId} onChange={(e) => changeShift(e.target.value)} className="mt-1 w-full rounded-lg border border-[#DCE9E6] bg-transparent px-3 py-2 text-sm dark:border-slate-700">
              {shifts.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </section>
        </aside>
      </div>
        </>
      )}

      {tab === "month" && ready && (
        <MonthView monthRecords={monthRecords} shift={shift} />
      )}
    </div>
  );
}

function MonthView({ monthRecords, shift }: { monthRecords: Record<number, DayRecord>; shift: typeof shifts[0] }) {
  const today = new Date();
  const isCurrentMonth = true; // Only current month allowed per security rule

  if (!isCurrentMonth) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-10 text-center dark:border-rose-900/60 dark:bg-rose-950/30">
        <p className="text-sm font-semibold text-rose-900 dark:text-rose-100">Unauthorized access</p>
        <p className="mt-1 text-sm text-rose-800 dark:text-rose-200">You can only view attendance for the current month.</p>
      </div>
    );
  }

  const daysInMonth = Object.keys(monthRecords).length;
  const workdays = [1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 15, 16, 17, 18, 19, 22, 23, 24, 25, 26, 29, 30];

  const stats = Object.entries(monthRecords).reduce((acc, [dayStr, record]) => {
    const dayNum = parseInt(dayStr, 10);
    const isWorkday = workdays.includes(dayNum);

    if (record.checkIn) {
      acc.daysPresent++;

      // Check for delay
      if (isWorkday) {
        const checkInTime = new Date(record.checkIn.at);
        const shiftStart = new Date(checkInTime);
        shiftStart.setHours(shift.startHour, 0, 0, 0);
        const delayMinutes = Math.round((checkInTime.getTime() - shiftStart.getTime()) / 60000);
        if (delayMinutes > 0) {
          acc.lateDays++;
          acc.totalLateMinutes += delayMinutes;
        }
      }
    }
    if (record.checkIn && record.checkOut) {
      const minutes = Math.round((new Date(record.checkOut.at).getTime() - new Date(record.checkIn.at).getTime()) / 60000);
      acc.totalMinutes += minutes;
    }
    return acc;
  }, { daysPresent: 0, lateDays: 0, totalLateMinutes: 0, totalMinutes: 0 });

  const absenceDays = workdays.filter(d => d <= daysInMonth && !monthRecords[d]?.checkIn);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-5">
        <div className="rounded-2xl border border-[#DCE9E6] bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Days present</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-600">{stats.daysPresent}</p>
          <p className="text-xs text-slate-400">of {daysInMonth} days</p>
        </div>
        <div className="rounded-2xl border border-[#DCE9E6] bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Days late</p>
          <p className="mt-2 text-2xl font-semibold text-amber-600">{stats.lateDays}</p>
          <p className="text-xs text-slate-400">{stats.totalLateMinutes > 0 ? `${Math.floor(stats.totalLateMinutes / stats.lateDays)}` : "0"} min avg</p>
        </div>
        <div className="rounded-2xl border border-[#DCE9E6] bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Days absent</p>
          <p className="mt-2 text-2xl font-semibold text-rose-600">{absenceDays.length}</p>
          <p className="text-xs text-slate-400">without record</p>
        </div>
        <div className="rounded-2xl border border-[#DCE9E6] bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total hours</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{Math.floor(stats.totalMinutes / 60)}</p>
          <p className="text-xs text-slate-400">hours worked</p>
        </div>
        <div className="rounded-2xl border border-[#DCE9E6] bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Average</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{stats.daysPresent > 0 ? (stats.totalMinutes / stats.daysPresent / 60).toFixed(1) : "0"}</p>
          <p className="text-xs text-slate-400">hours per day</p>
        </div>
      </div>

      <div className="rounded-2xl border border-[#DCE9E6] bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-950 dark:text-white mb-4">Calendar</h2>
        <div className="grid grid-cols-7 gap-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-slate-500 py-2">{day}</div>
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const dayNum = i + 1;
            const record = monthRecords[dayNum];
            const isToday = dayNum === today.getDate();
            const isWorkday = workdays.includes(dayNum);

            // Calculate delay if checked in late
            let delayMinutes = 0;
            if (record?.checkIn && isWorkday) {
              const checkInTime = new Date(record.checkIn.at);
              const shiftStart = new Date(checkInTime);
              shiftStart.setHours(shift.startHour, 0, 0, 0);
              delayMinutes = Math.round((checkInTime.getTime() - shiftStart.getTime()) / 60000);
            }

            let bgColor = "bg-white dark:bg-slate-800";
            let borderColor = "border-[#DCE9E6] dark:border-slate-700";
            let textColor = "text-slate-900 dark:text-slate-100";

            if (!isWorkday) {
              bgColor = "bg-slate-100 dark:bg-slate-700";
              textColor = "text-slate-400";
            } else if (delayMinutes > 0) {
              bgColor = "bg-amber-50 dark:bg-amber-950/30";
              textColor = "text-amber-900 dark:text-amber-100";
            } else if (record?.checkIn && record?.checkOut) {
              bgColor = "bg-emerald-50 dark:bg-emerald-950/30";
              textColor = "text-emerald-900 dark:text-emerald-100";
            } else if (record?.checkIn) {
              bgColor = "bg-blue-50 dark:bg-blue-950/30";
              textColor = "text-blue-900 dark:text-blue-100";
            } else if (isWorkday) {
              bgColor = "bg-rose-50 dark:bg-rose-950/30";
              textColor = "text-rose-900 dark:text-rose-100";
            }

            if (isToday) {
              borderColor = "border-[#0B4F4B] dark:border-[#8FD4C6]";
            }

            return (
              <div
                key={dayNum}
                className={`rounded-lg border ${borderColor} ${bgColor} p-3 text-center min-h-[100px] flex flex-col justify-between`}
              >
                <p className={`text-sm font-semibold ${textColor} ${isToday ? "ring-2 ring-[#0B4F4B] rounded-full w-6 h-6 flex items-center justify-center mx-auto" : ""}`}>
                  {dayNum}
                </p>
                {record?.checkIn && (
                  <div className="text-xs">
                    {delayMinutes > 0 && (
                      <p className="mb-1 rounded px-1.5 py-0.5 bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-100 font-semibold text-xs">
                        {delayMinutes} min late
                      </p>
                    )}
                    <p className={textColor}>
                      {clock(record.checkIn.at)}
                      {record.checkOut && ` → ${clock(record.checkOut.at)}`}
                    </p>
                    {record.checkOut && (
                      <p className="text-xs text-slate-500">
                        {Math.floor((new Date(record.checkOut.at).getTime() - new Date(record.checkIn.at).getTime()) / 3600000)}h
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Line({ label, value, note }: { label: string; value: string; note?: string }) {
  return <div className="flex items-baseline justify-between gap-3"><dt className="text-slate-500">{label}</dt><dd className="text-right font-semibold text-slate-900 dark:text-white">{value}{note && <span className="block text-xs font-normal text-slate-400">{note}</span>}</dd></div>;
}

function BlockedMessage({ blocked }: { blocked: Blocked }) {
  const copy = blocked.kind === "outside"
    ? { title: "You are too far from the office", body: `You are about ${formatDistance(blocked.distance)} away. Check-in works within ${blocked.radius} m. If you have an excuse, ask the CEO or GM to unlock your attendance.` }
    : blocked.kind === "imprecise"
      ? { title: "Your location is not precise enough", body: `Your device located you only to within about ${formatDistance(blocked.accuracy)}, and check-in needs ${blocked.limit} m or better. Computers often locate by Wi-Fi or internet address and can be kilometres off. Try again on your phone with precise location turned on.` }
    : blocked.kind === "denied"
      ? { title: "Location is turned off", body: "Allow location for this site in your browser settings, then try again. Check-in needs your location." }
      : blocked.kind === "timeout"
        ? { title: "Location took too long", body: "Move near a window or turn on Wi-Fi, then try again." }
        : blocked.kind === "unsupported"
          ? { title: "This browser has no location support", body: "Open the app in Chrome, Safari or Edge." }
          : { title: "Location is unavailable", body: "Your device could not find its position. Try again in a moment." };
  return (
    <div role="alert" className="mt-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/60 dark:bg-rose-950/30">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
      <div><p className="text-sm font-semibold text-rose-900 dark:text-rose-100">{copy.title}</p><p className="mt-1 text-sm leading-6 text-rose-800 dark:text-rose-200">{copy.body}</p></div>
    </div>
  );
}
