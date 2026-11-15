// Work schedule configuration — stored in this browser only (prototype).
// A real backend phase moves this server-side with change history.

export type DaySchedule = {
  startHour: number;   // 0–23
  startMinute: number; // 0–59
  endHour: number;
  endMinute: number;
  isOff: boolean;      // always off (overrides Saturday rule)
};

export type SaturdayOffRule = "none" | "all" | "1st_3rd" | "2nd_4th";

export type DeductionRule = {
  minutesLate: number;    // threshold: at this many minutes of delay…
  deductFraction: number; // …deduct this fraction of a day's pay (0.25, 0.5, 1.0)
  label: string;
};

export type WorkSchedule = {
  days: Record<number, DaySchedule>; // 0=Sun … 6=Sat
  saturdayOffRule: SaturdayOffRule;
  deductionRules: DeductionRule[];
};

export const DAY_NAMES_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const DEFAULT_SCHEDULE: WorkSchedule = {
  days: {
    0: { startHour: 11, startMinute: 0, endHour: 19, endMinute: 0, isOff: false }, // Sunday
    1: { startHour: 11, startMinute: 0, endHour: 19, endMinute: 0, isOff: false }, // Monday
    2: { startHour: 11, startMinute: 0, endHour: 19, endMinute: 0, isOff: false }, // Tuesday
    3: { startHour: 11, startMinute: 0, endHour: 19, endMinute: 0, isOff: false }, // Wednesday
    4: { startHour: 11, startMinute: 0, endHour: 18, endMinute: 0, isOff: false }, // Thursday — 6 PM close
    5: { startHour: 11, startMinute: 0, endHour: 19, endMinute: 0, isOff: true  }, // Friday — always off
    6: { startHour: 11, startMinute: 0, endHour: 19, endMinute: 0, isOff: false }, // Saturday — per rule
  },
  saturdayOffRule: "2nd_4th", // 2nd and 4th Saturdays of each month are off
  deductionRules: [
    { minutesLate: 15, deductFraction: 0.25, label: "11:15 AM — ¼ day" },
    { minutesLate: 30, deductFraction: 0.50, label: "11:30 AM — ½ day" },
    { minutesLate: 60, deductFraction: 1.00, label: "12:00 PM — 1 day" },
  ],
};

const SCHEDULE_KEY = "opshub-demo-work-schedule-v1";

export function loadWorkSchedule(): WorkSchedule {
  try {
    const raw = window.localStorage.getItem(SCHEDULE_KEY);
    if (!raw) return DEFAULT_SCHEDULE;
    const parsed = JSON.parse(raw) as Partial<WorkSchedule>;
    return {
      days: parsed.days ?? DEFAULT_SCHEDULE.days,
      saturdayOffRule: parsed.saturdayOffRule ?? DEFAULT_SCHEDULE.saturdayOffRule,
      deductionRules: parsed.deductionRules ?? DEFAULT_SCHEDULE.deductionRules,
    };
  } catch {
    return DEFAULT_SCHEDULE;
  }
}

export function saveWorkSchedule(schedule: WorkSchedule) {
  try { window.localStorage.setItem(SCHEDULE_KEY, JSON.stringify(schedule)); } catch { /* storage unavailable */ }
}

/** Returns true if `date` is a non-working day according to the schedule. */
export function isDayOff(date: Date, schedule: WorkSchedule): boolean {
  const dow = date.getDay();
  const dayCfg = schedule.days[dow];
  if (dayCfg?.isOff) return true;

  // Saturday rule
  if (dow === 6) {
    const rule = schedule.saturdayOffRule;
    if (rule === "all") return true;
    if (rule === "none") return false;
    // Which occurrence of a Saturday is this in its month? (1st, 2nd, 3rd, 4th, 5th)
    const occurrence = Math.ceil(date.getDate() / 7);
    if (rule === "1st_3rd") return occurrence === 1 || occurrence === 3;
    if (rule === "2nd_4th") return occurrence === 2 || occurrence === 4;
  }
  return false;
}

/** Shift start time in minutes-from-midnight for the given date. */
export function shiftStartMinutes(date: Date, schedule: WorkSchedule): number {
  const dayCfg = schedule.days[date.getDay()];
  return (dayCfg?.startHour ?? 11) * 60 + (dayCfg?.startMinute ?? 0);
}

/** Delay in minutes (0 if on time or early). */
export function calcDelayMinutes(checkInIso: string, schedule: WorkSchedule): number {
  const ci = new Date(checkInIso);
  const start = shiftStartMinutes(ci, schedule);
  const actual = ci.getHours() * 60 + ci.getMinutes();
  return Math.max(0, actual - start);
}

/** Returns the deduction fraction for a given delay (0 = no deduction). */
export function deductionForDelay(delayMinutes: number, schedule: WorkSchedule): number {
  if (delayMinutes <= 0) return 0;
  const sorted = [...schedule.deductionRules].sort((a, b) => b.minutesLate - a.minutesLate);
  for (const rule of sorted) {
    if (delayMinutes >= rule.minutesLate) return rule.deductFraction;
  }
  return 0;
}

/** Human-readable label for a deduction fraction. */
export function deductionLabel(fraction: number): string {
  if (fraction === 0) return "";
  if (fraction <= 0.25) return "¼ day";
  if (fraction <= 0.5) return "½ day";
  return "1 day";
}

/** Format a DaySchedule start/end as "11:00 AM – 7:00 PM". */
export function formatDayHours(day: DaySchedule): string {
  const fmt = (h: number, m: number) => {
    const ampm = h < 12 ? "AM" : "PM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
  };
  return `${fmt(day.startHour, day.startMinute)} – ${fmt(day.endHour, day.endMinute)}`;
}

/** Set of day-of-month numbers that are off days for a given year/month. */
export function offDaysInMonth(year: number, month: number, schedule: WorkSchedule): Set<number> {
  const result = new Set<number>();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    if (isDayOff(new Date(year, month, d), schedule)) result.add(d);
  }
  return result;
}
