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
  // Post-meeting closure (required before end-of-day checkout)
  closed?: boolean;
  closedAt?: string;
  outcomeNotes?: string;
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
};

type Store = { visits: VisitRequest[]; excuses: ExcuseRequest[] };

const key = "opshub-demo-requests-v1";
const changed = "opshub-requests-changed";

const seed = (): Store => ({
  visits: outsideMeetingRequests.map((r) => ({ ...r })),
  excuses: excuseRequests.map((r) => ({ ...r })),
});

export function loadRequests(): Store {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as Partial<Store>;
    return { visits: parsed.visits ?? [], excuses: parsed.excuses ?? [] };
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

export function addExcuse(excuse: Omit<ExcuseRequest, "id" | "status" | "submittedAt" | "hoursUsed">) {
  const store = loadRequests();
  save({ ...store, excuses: [{ ...excuse, id: `exc-${Date.now()}`, status: "pending", submittedAt: nowLabel(), hoursUsed: 1 }, ...store.excuses] });
}

export function decide(kind: "visit" | "excuse", id: string, status: Exclude<Status, "pending">, note?: string) {
  const store = loadRequests();
  const patch = { status, decidedAt: nowLabel(), decisionNote: note?.trim() || undefined };
  save(kind === "visit"
    ? { ...store, visits: store.visits.map((r) => (r.id === id ? { ...r, ...patch } : r)) }
    : { ...store, excuses: store.excuses.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
}

/** Close an approved site visit with mandatory outcome notes. */
export function closeVisit(id: string, outcomeNotes: string) {
  const store = loadRequests();
  save({ ...store, visits: store.visits.map((r) => (r.id === id ? { ...r, closed: true, closedAt: nowLabel(), outcomeNotes: outcomeNotes.trim() } : r)) });
}

/** Approved site visits for this user that are today-or-earlier and not yet closed. */
export function openVisitsForUser(employeeName: string): VisitRequest[] {
  const today = new Date().toISOString().slice(0, 10);
  const { visits } = loadRequests();
  return visits.filter((v) => v.employeeName === employeeName && v.status === "approved" && v.date <= today && !v.closed);
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
