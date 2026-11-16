// CRM store — browser localStorage prototype only.
// Real backend phase moves all of this server-side with proper RBAC.

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CRMRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  clientName: string;
  clientNumber: string;
  leadSource: string;
  budget: string;
  feedback: string;
  submittedAt: string; // ISO
}

export interface AdsTaskData {
  urls: string[];              // exactly 3 validated social-media URLs
  confirmedToday: boolean;
  platform: string[];          // derived platform labels
}

export interface ProjectAssessment {
  salesName: string;
  date: string;
  companyName: string;
  projectName: string;
  managementAndOperations: string;
  owner: string;
  investorType: string;
  previousWork: string;
  location: string;
  projectArea: string;
  finishingType: string;
  projectDetails: string;
  unitTypes: string;
  maintenance: string;
  deliveryDate: string;
}

export interface KnowledgeTaskData {
  assessment: ProjectAssessment;
  voiceNoteTranscript?: string;    // transcribed text, language as spoken
  voiceNoteLanguage?: "ar" | "en";
}

export interface CallsTaskData {
  freshCalls: number;
  oldCalls: number;
  delayCalls: number;
}

export interface RotationTaskData {
  rotatedWithIds: string[];
  rotatedWithNames: string[];
  notes: string;
}

export type DailyTaskType = "ads" | "knowledge" | "calls" | "rotation";

export interface DailyTask {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  taskType: DailyTaskType;
  completedAt: string; // ISO
  data: AdsTaskData | KnowledgeTaskData | CallsTaskData | RotationTaskData;
}

export interface ExtraTask {
  id: string;
  targetEmployeeId: string;
  targetEmployeeName: string;
  assignedDate: string; // YYYY-MM-DD — which workday this applies to
  note: string;
  createdBy: string;
  createdAt: string; // ISO
  deductionDays: number; // e.g. 0.5, 1 — 0 means no deduction
  acknowledged: boolean;
}

// CRM deduction stored separately so finance-workspace can consume it
export interface CRMDeduction {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;         // YYYY-MM-DD
  deductionDays: number;
  reason: string;
  extraTaskId: string;
}

// ── Storage keys ──────────────────────────────────────────────────────────────

const REQUESTS_KEY = "opshub-crm-requests-v1";
const TASKS_KEY = "opshub-crm-daily-tasks-v1";
const EXTRA_TASKS_KEY = "opshub-crm-extra-tasks-v1";
const DEDUCTIONS_KEY = "opshub-crm-deductions-v1";

// ── Helpers ───────────────────────────────────────────────────────────────────

function readJson<T>(key: string): T[] {
  try { return JSON.parse(window.localStorage.getItem(key) ?? "[]") as T[]; } catch { return []; }
}
function writeJson<T>(key: string, data: T[]) {
  try { window.localStorage.setItem(key, JSON.stringify(data)); } catch { /* storage unavailable */ }
}
function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

// ── Listeners ─────────────────────────────────────────────────────────────────

type Listener = () => void;
const listeners = new Set<Listener>();

export function onCRMChanged(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() { listeners.forEach(fn => fn()); }

// ── Requests ──────────────────────────────────────────────────────────────────

export function loadCRMRequests(): CRMRequest[] { return readJson<CRMRequest>(REQUESTS_KEY); }

export function addCRMRequest(data: Omit<CRMRequest, "id" | "submittedAt">): CRMRequest {
  const rec: CRMRequest = { ...data, id: uid(), submittedAt: new Date().toISOString() };
  const all = loadCRMRequests();
  writeJson(REQUESTS_KEY, [...all, rec]);
  notify();
  return rec;
}

export function requestsForEmployeeOnDate(employeeId: string, date: string): CRMRequest[] {
  return loadCRMRequests().filter(r => r.employeeId === employeeId && r.date === date);
}

export function requestsForDate(date: string): CRMRequest[] {
  return loadCRMRequests().filter(r => r.date === date);
}

// ── Daily Tasks ───────────────────────────────────────────────────────────────

export function loadDailyTasks(): DailyTask[] { return readJson<DailyTask>(TASKS_KEY); }

export function addDailyTask(data: Omit<DailyTask, "id" | "completedAt">): DailyTask {
  const rec: DailyTask = { ...data, id: uid(), completedAt: new Date().toISOString() };
  const all = loadDailyTasks();
  writeJson(TASKS_KEY, [...all, rec]);
  notify();
  return rec;
}

export function taskForEmployeeOnDate(employeeId: string, date: string, type: DailyTaskType): DailyTask | undefined {
  return loadDailyTasks().find(t => t.employeeId === employeeId && t.date === date && t.taskType === type);
}

export function tasksForDate(date: string): DailyTask[] {
  return loadDailyTasks().filter(t => t.date === date);
}

// ── Extra Tasks ───────────────────────────────────────────────────────────────

export function loadExtraTasks(): ExtraTask[] { return readJson<ExtraTask>(EXTRA_TASKS_KEY); }

export function addExtraTask(data: Omit<ExtraTask, "id" | "createdAt" | "acknowledged">): ExtraTask {
  const rec: ExtraTask = { ...data, id: uid(), createdAt: new Date().toISOString(), acknowledged: false };
  const all = loadExtraTasks();
  writeJson(EXTRA_TASKS_KEY, [...all, rec]);
  if (data.deductionDays > 0) {
    const deduction: CRMDeduction = {
      id: rec.id,
      employeeId: data.targetEmployeeId,
      employeeName: data.targetEmployeeName,
      date: data.assignedDate,
      deductionDays: data.deductionDays,
      reason: data.note || "Performance deduction",
      extraTaskId: rec.id,
    };
    writeJson<CRMDeduction>(DEDUCTIONS_KEY, [...loadCRMDeductions(), deduction]);
  }
  notify();
  return rec;
}

export function acknowledgeExtraTask(id: string) {
  const all = loadExtraTasks().map(t => t.id === id ? { ...t, acknowledged: true } : t);
  writeJson(EXTRA_TASKS_KEY, all);
  notify();
}

export function deleteExtraTask(id: string) {
  writeJson(EXTRA_TASKS_KEY, loadExtraTasks().filter(t => t.id !== id));
  writeJson(DEDUCTIONS_KEY, loadCRMDeductions().filter(d => d.extraTaskId !== id));
  notify();
}

export function extraTasksForEmployee(employeeId: string): ExtraTask[] {
  return loadExtraTasks().filter(t => t.targetEmployeeId === employeeId);
}

// ── CRM Deductions ────────────────────────────────────────────────────────────

export function loadCRMDeductions(): CRMDeduction[] { return readJson<CRMDeduction>(DEDUCTIONS_KEY); }

export function deductionsForEmployee(employeeId: string): CRMDeduction[] {
  return loadCRMDeductions().filter(d => d.employeeId === employeeId);
}

export function deductionsForEmployeeInMonth(employeeId: string, year: number, month: number): CRMDeduction[] {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  return deductionsForEmployee(employeeId).filter(d => d.date.startsWith(prefix));
}

// ── URL Validation ────────────────────────────────────────────────────────────

export function detectSocialPlatform(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    if (hostname.includes("facebook") || hostname === "fb.com" || hostname === "fb.watch") return "Facebook";
    if (hostname.includes("instagram")) return "Instagram";
    if (hostname.includes("twitter") || hostname === "x.com") return "X / Twitter";
    if (hostname.includes("tiktok")) return "TikTok";
    if (hostname.includes("youtube") || hostname === "youtu.be") return "YouTube";
    if (hostname.includes("linkedin")) return "LinkedIn";
    if (hostname.includes("snapchat")) return "Snapchat";
    if (hostname.includes("threads")) return "Threads";
    if (hostname.includes("whatsapp")) return "WhatsApp";
    return null;
  } catch { return null; }
}

export function isValidSocialUrl(url: string): boolean {
  if (!url.trim()) return false;
  const platform = detectSocialPlatform(url);
  if (!platform) return false;
  try { new URL(url); return true; } catch { return false; }
}

// ── Performance helpers ───────────────────────────────────────────────────────

export const DAILY_REQUESTS_TARGET = 3;
export const DAILY_MEETING_TARGET = 1;

export interface DayPerformance {
  date: string;
  requestsCount: number;
  requestsTarget: number;
  meetingsDone: boolean;
  adsTaskDone: boolean;
  knowledgeTaskDone: boolean;
  callsTaskDone: boolean;
  rotationTaskDone: boolean;
  extraTasks: ExtraTask[];
  deductions: CRMDeduction[];
}

export function getDayPerformance(employeeId: string, date: string, meetingCountFn: (date: string) => number): DayPerformance {
  const requests = requestsForEmployeeOnDate(employeeId, date);
  const ads = taskForEmployeeOnDate(employeeId, date, "ads");
  const knowledge = taskForEmployeeOnDate(employeeId, date, "knowledge");
  const calls = taskForEmployeeOnDate(employeeId, date, "calls");
  const rotation = taskForEmployeeOnDate(employeeId, date, "rotation");
  const extraTasks = loadExtraTasks().filter(t => t.targetEmployeeId === employeeId && t.assignedDate === date);
  const deductions = loadCRMDeductions().filter(d => d.employeeId === employeeId && d.date === date);
  return {
    date,
    requestsCount: requests.length,
    requestsTarget: DAILY_REQUESTS_TARGET,
    meetingsDone: meetingCountFn(date) >= DAILY_MEETING_TARGET,
    adsTaskDone: !!ads,
    knowledgeTaskDone: !!knowledge,
    callsTaskDone: !!calls,
    rotationTaskDone: !!rotation,
    extraTasks,
    deductions,
  };
}

export const LEAD_SOURCES = [
  "Social Media",
  "WhatsApp Campaign",
  "Referral",
  "Walk-in",
  "Website",
  "Cold Call",
  "Print / Outdoor Ad",
  "Exhibition / Event",
  "Previous Client",
  "Other",
];
