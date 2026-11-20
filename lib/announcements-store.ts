// Announcements store — browser localStorage only (prototype).

export type AudienceKind = "all" | "department" | "specific";
export type Priority = "normal" | "urgent";

export type Announcement = {
  id: string;
  title: string;
  body: string;
  priority: Priority;
  pinned: boolean;
  postedBy: string;
  postedAt: string;        // ISO
  audience: AudienceKind;
  departmentId?: string;   // used when audience === "department"
  targetIds: string[];     // employee IDs, used when audience === "specific"
  editedAt?: string;
};

// ── Storage ───────────────────────────────────────────────────────────────────

const KEY = "opshub_announcements_v1";
const CHANGED = "opshub-announcements-changed";

function seed(): Announcement[] {
  return [
    {
      id: "ann-seed-1",
      title: "Welcome to OpsHub",
      body: "This is your central hub for HR requests, attendance, and CRM tasks. Use the sidebar to navigate between workspaces.",
      priority: "normal",
      pinned: true,
      postedBy: "Admin",
      postedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      audience: "all",
      targetIds: [],
    },
  ];
}

export function loadAnnouncements(): Announcement[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return seed();
    return JSON.parse(raw) as Announcement[];
  } catch { return seed(); }
}

function persist(list: Announcement[]) {
  try { window.localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* unavailable */ }
  window.dispatchEvent(new Event(CHANGED));
}

export function postAnnouncement(a: Omit<Announcement, "id" | "postedAt">): Announcement {
  const list = loadAnnouncements();
  const rec: Announcement = { ...a, id: `ann-${Date.now()}`, postedAt: new Date().toISOString() };
  persist([rec, ...list]);
  return rec;
}

export function deleteAnnouncement(id: string) {
  persist(loadAnnouncements().filter(a => a.id !== id));
}

export function togglePin(id: string) {
  persist(loadAnnouncements().map(a => a.id === id ? { ...a, pinned: !a.pinned } : a));
}

export function onAnnouncementsChanged(cb: () => void) {
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) cb(); };
  window.addEventListener(CHANGED, cb);
  window.addEventListener("storage", onStorage);
  return () => { window.removeEventListener(CHANGED, cb); window.removeEventListener("storage", onStorage); };
}
