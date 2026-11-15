// Demo request store (site visits and excuses), kept in this browser only.
// A real backend phase replaces this with server records and role-checked approvals.

import { excuseRequests, outsideMeetingRequests } from "@/lib/mock-data";

export type Status = "pending" | "approved" | "rejected";

export type VisitRequest = {
  id: string;
  employeeName: string;
  employeeRole: string;
  clientName: string;
  clientNumber: string;
  date: string;
  time: string;
  zone: string;
  projectName: string;
  meetingLocation: string;
  notes: string;
  status: Status;
  submittedAt: string;
  decidedAt?: string;
  decisionNote?: string;
  // Set by approver: which attendance action uses the meeting zone instead of the office
  // Default: checkIn=false (always office), checkOut=true (site checkout)
  attendanceOverride?: { checkIn: boolean; checkOut: boolean };
  // Broker's field confirmation stamp (check-in or check-out from meeting zone)
  fieldCheckIn?: { at: string; confirmed: boolean };
  // Post-meeting closure (required before end-of-day checkout)
  closed?: boolean;
  closedAt?: string;
  outcomeNotes?: string;
  transportationCost?: number;
  receipts?: string[]; // array of base64-encoded file data
};

export type ExcuseRequest = {
  id: string;
  employeeName: string;
  date: string;
  slot: "Morning" | "Evening";
  reason: string;
  status: Status;
  submittedAt: string;
  hoursUsed: number;
  decidedAt?: string;
  decisionNote?: string;
  isAutoDeducted?: boolean; // auto-deducted from delay, not user-requested
};

export type ExcuseBalance = {
  employeeName: string;
  month: string; // YYYY-MM
  totalHours: number; // 4 hours per month
  usedHours: number;
  autoDeductedHours: number;
};

type Store = { visits: VisitRequest[]; excuses: ExcuseRequest[]; excuseBalances: ExcuseBalance[] };

const key = "opshub-demo-requests-v1";
const changed = "opshub-requests-changed";

const seed = (): Store => {
  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  return {
    visits: outsideMeetingRequests.map((r) => ({ ...r })),
    excuses: excuseRequests.map((r) => ({ ...r })),
    excuseBalances: [
      { employeeName: "Ahmed Khalil", month: currentMonth, totalHours: 4, usedHours: 2, autoDeductedHours: 0 },
    ],
  };
};

export function loadRequests(): Store {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as Partial<Store>;
    return { visits: parsed.visits ?? [], excuses: parsed.excuses ?? [], excuseBalances: parsed.excuseBalances ?? [] };
  } catch {
    return seed();
  }
}

function save(store: Store) {
  try { window.localStorage.setItem(key, JSON.stringify(store)); } catch { /* storage unavailable */ }
  window.dispatchEvent(new Event(changed));
}

export const nowLabel = () => new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date());

export function addVisit(visit: Omit<VisitRequest, "id" | "status" | "submittedAt">) {
  const store = loadRequests();
  save({ ...store, visits: [{ ...visit, id: `omr-${Date.now()}`, status: "pending", submittedAt: nowLabel() }, ...store.visits] });
}

export function addExcuse(excuse: Omit<ExcuseRequest, "id" | "status" | "submittedAt"> & { hoursUsed?: number }) {
  const store = loadRequests();
  save({ ...store, excuses: [{ ...excuse, id: `exc-${Date.now()}`, status: "pending", submittedAt: nowLabel(), hoursUsed: excuse.hoursUsed ?? 1 }, ...store.excuses] });
}

export function decide(
  kind: "visit" | "excuse",
  id: string,
  status: Exclude<Status, "pending">,
  note?: string,
  attendanceOverride?: { checkIn: boolean; checkOut: boolean }
) {
  const store = loadRequests();
  const patch = {
    status,
    decidedAt: nowLabel(),
    decisionNote: note?.trim() || undefined,
    ...(kind === "visit" && attendanceOverride !== undefined ? { attendanceOverride } : {}),
  };
  save(kind === "visit"
    ? { ...store, visits: store.visits.map((r) => (r.id === id ? { ...r, ...patch } : r)) }
    : { ...store, excuses: store.excuses.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
}

/** Close an approved site visit with mandatory outcome notes, transportation cost, and receipts. */
export function closeVisit(id: string, outcomeNotes: string, transportationCost: number, receipts: string[]) {
  const store = loadRequests();
  save({ ...store, visits: store.visits.map((r) => (r.id === id ? { ...r, closed: true, closedAt: nowLabel(), outcomeNotes: outcomeNotes.trim(), transportationCost, receipts } : r)) });
}

/** Approved site visits for this user that are today-or-earlier and not yet closed. */
export function openVisitsForUser(employeeName: string): VisitRequest[] {
  const today = new Date().toISOString().slice(0, 10);
  const { visits } = loadRequests();
  return visits.filter((v) => v.employeeName === employeeName && v.status === "approved" && v.date <= today && !v.closed);
}

/**
 * Returns today's approved field visits that override attendance location.
 * Default (no override set by admin): checkOut=true, checkIn=false.
 * Admin can flip either flag when approving the request.
 *   checkIn visit  → broker checks IN from the meeting zone (not the office)
 *   checkOut visit → broker checks OUT from the meeting zone (not the office)
 */
export function getTodayFieldVisits(employeeName: string): {
  checkIn: VisitRequest | null;
  checkOut: VisitRequest | null;
} {
  const today = new Date().toISOString().slice(0, 10);
  const { visits } = loadRequests();
  const todayApproved = visits.filter(
    (v) => v.employeeName === employeeName && v.status === "approved" && v.date === today
  );
  return {
    checkIn:  todayApproved.find((v) => v.attendanceOverride?.checkIn === true) ?? null,
    checkOut: todayApproved.find((v) => v.attendanceOverride === undefined || v.attendanceOverride.checkOut) ?? null,
  };
}

/** Mark a site visit's field check-in confirmed (either the check-in or check-out action). */
export function confirmFieldCheckIn(visitId: string) {
  const store = loadRequests();
  save({
    ...store,
    visits: store.visits.map((v) =>
      v.id === visitId ? { ...v, fieldCheckIn: { at: new Date().toISOString(), confirmed: true } } : v
    ),
  });
}

/** Get excuse balance for current month. Creates one if missing. */
export function getExcuseBalance(employeeName: string): ExcuseBalance {
  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const store = loadRequests();

  let balance = store.excuseBalances.find((b) => b.employeeName === employeeName && b.month === currentMonth);
  if (!balance) {
    balance = { employeeName, month: currentMonth, totalHours: 4, usedHours: 0, autoDeductedHours: 0 };
    save({ ...store, excuseBalances: [...store.excuseBalances, balance] });
  }
  return balance;
}

/** Remaining hours available (not used + not auto-deducted). */
export function getRemainingExcuseHours(employeeName: string): number {
  const balance = getExcuseBalance(employeeName);
  return balance.totalHours - balance.usedHours - balance.autoDeductedHours;
}

/** Auto-deduct delay minutes from excuse balance. */
export function autoDeductDelay(employeeName: string, delayMinutes: number): number {
  const store = loadRequests();
  const balance = getExcuseBalance(employeeName);
  const delayHours = delayMinutes / 60;
  const remaining = getRemainingExcuseHours(employeeName);
  const deductHours = Math.min(delayHours, remaining);

  if (deductHours > 0) {
    const updated = store.excuseBalances.map((b) =>
      b.employeeName === employeeName && b.month === balance.month
        ? { ...b, autoDeductedHours: b.autoDeductedHours + deductHours }
        : b
    );
    save({ ...store, excuseBalances: updated });
    return deductHours;
  }
  return 0;
}

export function pendingCount() {
  const { visits, excuses } = loadRequests();
  return visits.filter((r) => r.status === "pending").length + excuses.filter((r) => r.status === "pending").length;
}

/** Runs the callback when requests change in this tab or another tab. Returns an unsubscribe function. */
export function onRequestsChanged(callback: () => void) {
  const onStorage = (event: StorageEvent) => { if (event.key === key) callback(); };
  window.addEventListener(changed, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(changed, callback);
    window.removeEventListener("storage", onStorage);
  };
}
