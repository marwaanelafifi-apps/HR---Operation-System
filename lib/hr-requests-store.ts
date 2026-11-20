// Vacation and HR letter requests — stored in this browser only.

export type Status = "pending" | "approved" | "rejected";

export type VacationRequest = {
  id: string;
  employeeName: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: Status;
  submittedAt: string;
  decidedAt?: string;
  decisionNote?: string;
};

export type LetterRequest = {
  id: string;
  employeeName: string;
  letterType: string;
  addressedTo: string;
  purpose: string;
  neededBy: string;
  status: Status;
  submittedAt: string;
  decidedAt?: string;
  decisionNote?: string;
};

type Store = { vacations: VacationRequest[]; letters: LetterRequest[] };

const KEY = "opshub_hr_requests_v1";
const CHANGED = "opshub-hr-requests-changed";

function load(): Store {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { vacations: [], letters: [] };
    const p = JSON.parse(raw) as Partial<Store>;
    return { vacations: p.vacations ?? [], letters: p.letters ?? [] };
  } catch { return { vacations: [], letters: [] }; }
}

function save(store: Store) {
  try { window.localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* unavailable */ }
  window.dispatchEvent(new Event(CHANGED));
}

export function loadHRRequests(): Store { return load(); }

export function addVacation(v: Omit<VacationRequest, "id" | "status" | "submittedAt">) {
  const store = load();
  save({ ...store, vacations: [{ ...v, id: `vac-${Date.now()}`, status: "pending", submittedAt: new Date().toISOString() }, ...store.vacations] });
}

export function addLetter(l: Omit<LetterRequest, "id" | "status" | "submittedAt">) {
  const store = load();
  save({ ...store, letters: [{ ...l, id: `letter-${Date.now()}`, status: "pending", submittedAt: new Date().toISOString() }, ...store.letters] });
}

export function decideHR(
  kind: "vacation" | "letter",
  id: string,
  status: Exclude<Status, "pending">,
  note?: string,
) {
  const store = load();
  const patch = { status, decidedAt: new Date().toISOString(), decisionNote: note?.trim() || undefined };
  save(kind === "vacation"
    ? { ...store, vacations: store.vacations.map(r => r.id === id ? { ...r, ...patch } : r) }
    : { ...store, letters:   store.letters.map(r => r.id === id ? { ...r, ...patch } : r) });
}

export function onHRRequestsChanged(callback: () => void) {
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) callback(); };
  window.addEventListener(CHANGED, callback);
  window.addEventListener("storage", onStorage);
  return () => { window.removeEventListener(CHANGED, callback); window.removeEventListener("storage", onStorage); };
}
