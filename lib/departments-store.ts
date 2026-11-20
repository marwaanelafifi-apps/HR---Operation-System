// Department / group store — admin-managed, browser localStorage only.

import { employees } from "@/lib/mock-data";

export type Department = {
  id: string;
  name: string;
  memberIds: string[];
};

const KEY = "opshub_departments_v1";
const CHANGED = "opshub-departments-changed";

function seed(): Department[] {
  const sales = employees.filter(e => e.department === "Sales").map(e => e.id);
  const ops   = employees.filter(e => e.department === "Operations").map(e => e.id);
  return [
    { id: "dept-sales",      name: "Sales Team",       memberIds: sales },
    { id: "dept-operations", name: "Operations Team",  memberIds: ops   },
  ];
}

export function loadDepartments(): Department[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as Department[];
    return parsed.length ? parsed : seed();
  } catch { return seed(); }
}

function persist(list: Department[]) {
  try { window.localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* unavailable */ }
  window.dispatchEvent(new Event(CHANGED));
}

export function saveDepartment(dept: Department) {
  const list = loadDepartments();
  const idx = list.findIndex(d => d.id === dept.id);
  if (idx === -1) persist([...list, dept]);
  else persist(list.map(d => d.id === dept.id ? dept : d));
}

export function addDepartment(name: string): Department {
  const dept: Department = { id: `dept-${Date.now()}`, name: name.trim(), memberIds: [] };
  persist([...loadDepartments(), dept]);
  return dept;
}

export function deleteDepartment(id: string) {
  persist(loadDepartments().filter(d => d.id !== id));
}

export function onDepartmentsChanged(cb: () => void) {
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) cb(); };
  window.addEventListener(CHANGED, cb);
  window.addEventListener("storage", onStorage);
  return () => { window.removeEventListener(CHANGED, cb); window.removeEventListener("storage", onStorage); };
}
