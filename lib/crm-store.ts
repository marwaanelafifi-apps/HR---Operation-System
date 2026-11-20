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

export type UnitFloor = "Typical" | "Ground" | "Roof";

/** One row of the unit table. Which extra area applies depends on `floor`. */
export interface UnitRow {
  unitType: string;
  floor: UnitFloor;
  areaFrom: string;      // required
  areaTo: string;        // optional — open-ended when blank
  gardenArea: string;    // required on Ground
  terraceArea: string;   // required on Roof
  startingPrice: string;
  /** Legacy single-value area, kept so older submissions still render. */
  area?: string;
}

export interface ProjectAssessment {
  salesName: string;
  date: string;
  projectName: string;
  companyName: string;
  previousWork: string;
  location: string;
  projectArea: string;          // Project Acres
  projectDetails: string;       // Project Details & Facilities
  unitTable: UnitRow[];
  /** Legacy free-text fields, kept so older submissions still render. */
  unitTypes?: string;
  pricesAndAcres?: string;
  paymentPlan: string;
  finishingType: string;        // dropdown
  construction: string;         // dropdown
  deliveryDate: string;
  maintenance: string;
  investorType: string;         // Engineering Consultant
  managementAndOperations: string;
  termsOfContract: string;
  sellingPoints: string;
  weaknessPoints: string;
  additionalNotes: string;
  owner: string;
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
  durationSeconds?: number; // start-to-submit duration
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
  /** "deduction" (default, omitted on legacy records) or "bonus". */
  kind?: "deduction" | "bonus";
  createdAt?: string;   // ISO — optional for backward compat with legacy records
}

/**
 * A manager-entered payroll adjustment: a deduction or a bonus, always with a note.
 * Deductions are mirrored into CRMDeduction so finance and attendance keep working.
 */
export type AdjustmentKind = "deduction" | "bonus";

export interface CRMAdjustment {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;      // YYYY-MM-DD
  kind: AdjustmentKind;
  days: number;      // in day units — 0.25 / 0.5 / 1 / 2 …
  note: string;      // required: the reason
  createdBy: string;
  createdAt: string; // ISO
}

export interface CustomTaskCompletion {
  id: string;
  taskId: string;
  employeeId: string;
  date: string;        // YYYY-MM-DD
  note: string;
  completedAt: string; // ISO
  durationSeconds?: number; // start-to-submit duration
  wasBlocked: boolean; // true if user switched tabs during assessment
}

// ── Storage keys ──────────────────────────────────────────────────────────────

const REQUESTS_KEY = "opshub-crm-requests-v1";
const TASKS_KEY = "opshub-crm-daily-tasks-v1";
const EXTRA_TASKS_KEY = "opshub-crm-extra-tasks-v1";
const DEDUCTIONS_KEY = "opshub-crm-deductions-v1";
const CUSTOM_COMPLETIONS_KEY = "opshub-crm-custom-completions-v1";
const ADJUSTMENTS_KEY = "opshub-crm-adjustments-v1";

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

export function tasksCountForEmployeeOnDate(employeeId: string, date: string, type: DailyTaskType): number {
  return loadDailyTasks().filter(t => t.employeeId === employeeId && t.date === date && t.taskType === type).length;
}

export function tasksForEmployeeOnDate(employeeId: string, date: string, type: DailyTaskType): DailyTask[] {
  return loadDailyTasks().filter(t => t.employeeId === employeeId && t.date === date && t.taskType === type);
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
      createdAt: rec.createdAt,
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

// ── Assessment locks (persisted so reopening still shows locked) ──────────────

const ASSESSMENT_LOCKS_KEY = "opshub-assessment-locks-v1";

export interface AssessmentLock {
  employeeId: string;
  employeeName: string;
  taskId: string;
  taskLabel: string;
  date: string;
  lockedAt: string; // ISO
}

export function loadAssessmentLocks(): AssessmentLock[] { return readJson<AssessmentLock>(ASSESSMENT_LOCKS_KEY); }

export function markAssessmentBlocked(employeeId: string, employeeName: string, taskId: string, taskLabel: string, date: string): void {
  const all = loadAssessmentLocks();
  const exists = all.some(l => l.employeeId === employeeId && l.taskId === taskId && l.date === date);
  if (!exists) writeJson(ASSESSMENT_LOCKS_KEY, [...all, { employeeId, employeeName, taskId, taskLabel, date, lockedAt: new Date().toISOString() }]);
}

export function isAssessmentBlocked(employeeId: string, taskId: string, date: string): boolean {
  return loadAssessmentLocks().some(l => l.employeeId === employeeId && l.taskId === taskId && l.date === date);
}

export function unlockAssessment(employeeId: string, taskId: string, date: string): void {
  writeJson(ASSESSMENT_LOCKS_KEY, loadAssessmentLocks().filter(l => !(l.employeeId === employeeId && l.taskId === taskId && l.date === date)));
}

// ── Custom Task Completions ───────────────────────────────────────────────────

export function loadCustomTaskCompletions(): CustomTaskCompletion[] { return readJson<CustomTaskCompletion>(CUSTOM_COMPLETIONS_KEY); }

export function addCustomTaskCompletion(data: Omit<CustomTaskCompletion, "id" | "completedAt">): CustomTaskCompletion {
  const rec: CustomTaskCompletion = { ...data, id: uid(), completedAt: new Date().toISOString() };
  writeJson(CUSTOM_COMPLETIONS_KEY, [...loadCustomTaskCompletions(), rec]);
  notify();
  return rec;
}

export function getCustomTaskCompletion(employeeId: string, taskId: string, date: string): CustomTaskCompletion | undefined {
  return loadCustomTaskCompletions().find(c => c.employeeId === employeeId && c.taskId === taskId && c.date === date);
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

// ── Deductions & Bonuses (manager adjustments) ────────────────────────────────

export function loadAdjustments(): CRMAdjustment[] { return readJson<CRMAdjustment>(ADJUSTMENTS_KEY); }

export function addAdjustment(data: Omit<CRMAdjustment, "id" | "createdAt">): CRMAdjustment {
  const rec: CRMAdjustment = { ...data, id: uid(), createdAt: new Date().toISOString() };
  writeJson(ADJUSTMENTS_KEY, [...loadAdjustments(), rec]);
  // Mirror both deductions and bonuses into the finance/attendance feed.
  if (rec.days > 0) {
    const entry: CRMDeduction = {
      id: rec.id,
      employeeId: rec.employeeId,
      employeeName: rec.employeeName,
      date: rec.date,
      deductionDays: rec.days,
      reason: rec.note,
      extraTaskId: rec.id,
      kind: rec.kind,
      createdAt: rec.createdAt,
    };
    writeJson<CRMDeduction>(DEDUCTIONS_KEY, [...loadCRMDeductions(), entry]);
  }
  notify();
  return rec;
}

export function deleteAdjustment(id: string) {
  writeJson(ADJUSTMENTS_KEY, loadAdjustments().filter(a => a.id !== id));
  writeJson(DEDUCTIONS_KEY, loadCRMDeductions().filter(d => d.id !== id));
  notify();
}

export function adjustmentsForEmployeeOnDate(employeeId: string, date: string): CRMAdjustment[] {
  return loadAdjustments().filter(a => a.employeeId === employeeId && a.date === date);
}

export function adjustmentsForEmployeeInMonth(employeeId: string, monthPrefix: string): CRMAdjustment[] {
  return loadAdjustments().filter(a => a.employeeId === employeeId && a.date.startsWith(monthPrefix));
}

/** Totals in day units. `net` is positive when bonuses outweigh deductions. */
export function adjustmentTotals(list: CRMAdjustment[]): { deduction: number; bonus: number; net: number } {
  const deduction = list.filter(a => a.kind === "deduction").reduce((s, a) => s + a.days, 0);
  const bonus = list.filter(a => a.kind === "bonus").reduce((s, a) => s + a.days, 0);
  return { deduction, bonus, net: bonus - deduction };
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

export const DAILY_REQUESTS_TARGET = 3; // legacy default — prefer config value
export const DAILY_MEETING_TARGET = 1;  // legacy default — prefer config value

export interface DayPerformance {
  date: string;
  requestsCount: number;
  requestsTarget: number;
  meetingsCount: number;
  meetingsDone: boolean;
  adsTaskDone: boolean;
  knowledgeCount: number;
  knowledgeTarget: number;
  knowledgeTaskDone: boolean;
  callsTaskDone: boolean;
  rotationTaskDone: boolean;
  extraTasks: ExtraTask[];
  deductions: CRMDeduction[];
}

export function getDayPerformance(
  employeeId: string,
  date: string,
  meetingCountFn: (date: string) => number,
  requestsTarget = DAILY_REQUESTS_TARGET,
  meetingsTarget = DAILY_MEETING_TARGET,
  knowledgeTarget = 1,
): DayPerformance {
  const requests = requestsForEmployeeOnDate(employeeId, date);
  const ads = taskForEmployeeOnDate(employeeId, date, "ads");
  const knowledgeCount = tasksCountForEmployeeOnDate(employeeId, date, "knowledge");
  const calls = taskForEmployeeOnDate(employeeId, date, "calls");
  const rotation = taskForEmployeeOnDate(employeeId, date, "rotation");
  const extraTasks = loadExtraTasks().filter(t => t.targetEmployeeId === employeeId && t.assignedDate === date);
  const deductions = loadCRMDeductions().filter(d => d.employeeId === employeeId && d.date === date);
  const meetingsCount = meetingCountFn(date);
  return {
    date,
    requestsCount: requests.length,
    requestsTarget,
    meetingsCount,
    meetingsDone: meetingsCount >= meetingsTarget,
    adsTaskDone: !!ads,
    knowledgeCount,
    knowledgeTarget,
    knowledgeTaskDone: knowledgeCount >= knowledgeTarget,
    callsTaskDone: !!calls,
    rotationTaskDone: !!rotation,
    extraTasks,
    deductions,
  };
}

export const LEAD_SOURCES = [
  "Fresh Lead",
  "Social Media",
  "WhatsApp Campaign",
  "Referral",
  "Walk-in",
  "Cold Call",
  "Exhibition / Event",
  "Previous Client",
  "Other",
];

export const LEAD_SOURCE_GROUPS: { label: string; options: string[] }[] = [
  { label: "Direct Outreach", options: ["Fresh Lead", "Cold Call", "Walk-in"] },
  { label: "Digital", options: ["Social Media", "WhatsApp Campaign"] },
  { label: "Relationships", options: ["Referral", "Previous Client"] },
  { label: "Other", options: ["Exhibition / Event", "Other"] },
];
