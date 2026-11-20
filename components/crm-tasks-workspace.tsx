"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, Building2, Check, ChevronRight, ClipboardList, ExternalLink, Flame, Lock,
  Megaphone, Mic, MicOff, Paperclip, Phone, Plus, RotateCcw, Target,
  CheckCircle2, TrendingUp, X,
} from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { UnitTableEditor, emptyUnitRow } from "@/components/ui/unit-table-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { addVisit, loadRequests, onRequestsChanged, type VisitRequest } from "@/lib/requests-store";
import {
  addDailyTask, addCRMRequest, addCustomTaskCompletion, adjustmentsForEmployeeOnDate,
  detectSocialPlatform, getCustomTaskCompletion, isAssessmentBlocked, isValidSocialUrl,
  markAssessmentBlocked, onCRMChanged, requestsForEmployeeOnDate,
  taskForEmployeeOnDate, tasksCountForEmployeeOnDate,
  extraTasksForEmployee, acknowledgeExtraTask,
  LEAD_SOURCE_GROUPS,
  type AdsTaskData, type CallsTaskData, type CRMAdjustment, type CRMRequest, type DailyTask,
  type ExtraTask, type KnowledgeTaskData, type ProjectAssessment, type RotationTaskData,
  type UnitRow,
} from "@/lib/crm-store";
import {
  loadCRMTaskConfig, onCRMTaskConfigChanged, customTaskAppliesToDate,
  type CRMTasksConfig, type CustomTask,
} from "@/lib/crm-task-config";
import { loadWorkSchedule } from "@/lib/work-schedule";
import { employees } from "@/lib/mock-data";

// ── Demo identity ─────────────────────────────────────────────────────────────
const ME_ID = "ahmed-khalil";
const ME_NAME = "Ahmed Khalil";

// ── Helpers ───────────────────────────────────────────────────────────────────
function todayISO() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }

function friendlyDate(iso: string) {
  return new Date(`${iso}T00:00`).toLocaleDateString("en", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function completedAt(iso: string) {
  return new Date(iso).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit", hour12: true });
}

function countMeetingsToday(date: string): number {
  const visits = loadRequests().visits;
  return visits.filter(v => v.employeeName === ME_NAME && v.date === date).length;
}

// ── Shared input style ────────────────────────────────────────────────────────
const inputCls = "w-full rounded-xl border border-[#DCE9E6] bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0B4F4B] focus:outline-none focus:ring-2 focus:ring-[#0B4F4B]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";
const labelCls = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400";

// ── Modal shell ───────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 pt-12">
      <div className="w-full max-w-2xl rounded-2xl border border-[#DCE9E6] bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-[#DCE9E6] px-6 py-4 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ── Task 1: Ads ───────────────────────────────────────────────────────────────
function AdsTaskForm({ date, onDone, linkCount = 3 }: { date: string; onDone: () => void; linkCount?: number }) {
  const [urls, setUrls] = useState(() => Array(linkCount).fill(""));
  const startedAt = useRef(Date.now());

  const platforms = urls.map(u => detectSocialPlatform(u));
  const valids = urls.map(u => isValidSocialUrl(u));

  // Reject duplicate URLs across slots
  const isDuplicate = urls.map((u, i) =>
    valids[i] && urls.some((other, j) => j !== i && other === u && valids[j])
  );

  const linkOk = urls.map((_, i) => valids[i] && !isDuplicate[i]);
  const canSubmit = linkOk.every(Boolean);

  function setUrl(i: number, v: string) {
    setUrls(prev => prev.map((u, idx) => idx === i ? v : u));
  }

  function handleSubmit() {
    if (!canSubmit) return;
    const data: AdsTaskData = {
      urls,
      confirmedToday: true,
      platform: platforms.filter(Boolean) as string[],
    };
    addDailyTask({ employeeId: ME_ID, employeeName: ME_NAME, date, taskType: "ads", data, durationSeconds: Math.round((Date.now() - startedAt.current) / 1000) });
    onDone();
  }

  const todayFormatted = new Date(`${date}T00:00`).toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Submit {linkCount} social media posts from <b>today ({todayFormatted})</b>. Each link must be unique. Post date will be verified automatically by the server.
      </p>
      {Array.from({ length: linkCount }, (_, i) => i).map(i => {
        const ok = linkOk[i];
        const hasError = !!urls[i] && (!valids[i] || isDuplicate[i]);
        return (
          <div key={i} className={`rounded-2xl border p-4 transition ${ok ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40" : hasError ? "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40" : "border-[#DCE9E6] bg-[#F5F8F7] dark:border-slate-700 dark:bg-slate-800"}`}>
            <div className="mb-3 flex items-center justify-between">
              <p className={labelCls + " mb-0"}>Link {i + 1}</p>
              {ok && (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <Check className="h-3 w-3" /> {platforms[i]}
                </span>
              )}
            </div>
            <input
              type="url"
              placeholder="https://instagram.com/p/... or tiktok.com/..."
              value={urls[i]}
              onChange={e => setUrl(i, e.target.value)}
              className={inputCls}
            />
            {urls[i] && !valids[i] && (
              <p className="mt-1.5 text-xs text-rose-500">Not a recognised social media URL (Facebook, Instagram, TikTok, Snapchat, WhatsApp, etc.)</p>
            )}
            {valids[i] && isDuplicate[i] && (
              <p className="mt-1.5 text-xs text-rose-500">This link is already used in another slot — each link must be unique.</p>
            )}
          </div>
        );
      })}
      <div className="flex justify-end gap-3 border-t border-[#DCE9E6] pt-4 dark:border-slate-700">
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!canSubmit}>
          <Check className="h-4 w-4" /> Mark Complete
        </Button>
      </div>
    </div>
  );
}

// ── Task 2: Knowledge (Project Assessment + Voice Note) ───────────────────────
// Web Speech API types (not in all TypeScript DOM libs)
interface SpeechRecognitionResult { readonly isFinal: boolean; 0: { readonly transcript: string } }
interface SpeechRecognitionResultList { readonly length: number; [index: number]: SpeechRecognitionResult; }
interface SpeechRecognitionEvent extends Event { readonly resultIndex: number; readonly results: SpeechRecognitionResultList; }
interface ISpeechRecognition extends EventTarget {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void;
}
declare global {
  interface Window {
    SpeechRecognition: { new(): ISpeechRecognition };
    webkitSpeechRecognition: { new(): ISpeechRecognition };
  }
}

const EMPTY_ASSESSMENT: ProjectAssessment = {
  salesName: ME_NAME, date: todayISO(),
  projectName: "", companyName: "", previousWork: "", location: "",
  projectArea: "", projectDetails: "",
  unitTable: [emptyUnitRow()],
  paymentPlan: "", finishingType: "", construction: "", deliveryDate: "",
  maintenance: "", investorType: "", managementAndOperations: "",
  termsOfContract: "", sellingPoints: "", weaknessPoints: "", additionalNotes: "",
  owner: "",
};

// Defined outside KnowledgeTaskForm to prevent remount on every keystroke
function KnowledgeField({ label, k, placeholder, fieldType, options, required: isRequired, stretch,
  value, unitRows, voiceSupported, isRecording,
  onChangeText, onChangeDate, onVoiceToggle,
  onUnitRow, onUnitAdd, onUnitRemove,
}: {
  label: string; k: keyof ProjectAssessment;
  placeholder?: string; fieldType?: "text" | "date" | "dropdown" | "textarea" | "unitTable";
  options?: string[]; required?: boolean; stretch?: boolean;
  value: string; unitRows: UnitRow[]; voiceSupported: boolean; isRecording: boolean;
  onChangeText: (k: keyof ProjectAssessment, v: string) => void;
  onChangeDate: (k: keyof ProjectAssessment, v: string) => void;
  onVoiceToggle: (k: keyof ProjectAssessment) => void;
  onUnitRow: (idx: number, patch: Partial<UnitRow>) => void;
  onUnitAdd: () => void;
  onUnitRemove: (idx: number) => void;
}) {
  const isVoiceField = fieldType === "textarea" && voiceSupported;
  return (
    <div className={stretch ? "flex h-full flex-col" : ""}>
      <div className="mb-1.5 flex items-center justify-between">
        <span className={labelCls}>
          {label}{isRequired && <span className="ml-0.5 text-rose-400">*</span>}
        </span>
        {isVoiceField && (
          <button
            type="button"
            onClick={() => onVoiceToggle(k)}
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold transition ${
              isRecording
                ? "animate-pulse bg-rose-100 text-rose-600 hover:bg-rose-200 dark:bg-rose-950 dark:text-rose-300"
                : "bg-[#E8F3F1] text-[#0B4F4B] hover:bg-[#D0EDE9] dark:bg-[#0B2927] dark:text-[#8FD4C6]"
            }`}
          >
            {isRecording
              ? <><MicOff className="h-3 w-3" /> Stop</>
              : <Mic className="h-3 w-3" />
            }
          </button>
        )}
      </div>
      {fieldType === "unitTable" ? (
        <UnitTableEditor rows={unitRows} onRow={onUnitRow} onAdd={onUnitAdd} onRemove={onUnitRemove} />
      ) : fieldType === "dropdown" && options ? (
        <select value={value} onChange={e => onChangeText(k, e.target.value)}
          className={`${inputCls} bg-white dark:bg-slate-900`}>
          <option value="">— Select —</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : fieldType === "textarea" ? (
        <textarea rows={3} value={value} onChange={e => onChangeText(k, e.target.value)} placeholder={placeholder}
          className={`${inputCls} resize-none${stretch ? " flex-1" : ""}${isRecording ? " ring-2 ring-rose-300 dark:ring-rose-700" : ""}`} />
      ) : fieldType === "date" ? (
        <DatePicker value={value} onChange={v => onChangeDate(k, v)} />
      ) : (
        <input type="text" value={value} onChange={e => onChangeText(k, e.target.value)} placeholder={placeholder} className={inputCls} />
      )}
    </div>
  );
}

function KnowledgeTaskForm({ date, onDone, fieldCfg }: { date: string; onDone: () => void; fieldCfg?: import("@/lib/crm-task-config").KnowledgeFieldConfig[] }) {
  const startedAt = useRef(Date.now());
  const [form, setForm] = useState<ProjectAssessment>({ ...EMPTY_ASSESSMENT, salesName: ME_NAME, date });
  const [voiceLang, setVoiceLang] = useState<"ar" | "en">("ar");
  const [recordingField, setRecordingField] = useState<keyof ProjectAssessment | null>(null);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);

  useEffect(() => {
    setVoiceSupported(!!(window.SpeechRecognition || window.webkitSpeechRecognition));
  }, []);

  function setField(key: keyof ProjectAssessment, val: string) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  function setUnitRow(idx: number, patch: Partial<UnitRow>) {
    setForm(prev => {
      const rows = [...(prev.unitTable ?? [])];
      rows[idx] = { ...rows[idx], ...patch };
      return { ...prev, unitTable: rows };
    });
  }

  function addUnitRow() {
    setForm(prev => ({ ...prev, unitTable: [...(prev.unitTable ?? []), emptyUnitRow()] }));
  }

  function removeUnitRow(idx: number) {
    setForm(prev => {
      const rows = (prev.unitTable ?? []).filter((_, i) => i !== idx);
      return { ...prev, unitTable: rows.length ? rows : [emptyUnitRow()] };
    });
  }

  function startVoice(key: keyof ProjectAssessment) {
    if (recordingField) { recognitionRef.current?.stop(); }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec: ISpeechRecognition = new SR();
    rec.lang = voiceLang === "ar" ? "ar-EG" : "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    const prefix = (typeof form[key] === "string" ? (form[key] as string) : "").trim();
    let final = "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t + " "; else interim = t;
      }
      const appended = (prefix ? prefix + " " : "") + (final + interim).trimStart();
      setForm(prev => ({ ...prev, [key]: appended.trimEnd() }));
    };
    rec.onerror = () => setRecordingField(null);
    rec.onend = () => setRecordingField(null);
    rec.start();
    recognitionRef.current = rec;
    setRecordingField(key);
  }

  function stopVoice() {
    recognitionRef.current?.stop();
    setRecordingField(null);
  }

  function handleSubmit() {
    const data: KnowledgeTaskData = { assessment: form };
    addDailyTask({ employeeId: ME_ID, employeeName: ME_NAME, date, taskType: "knowledge", data, durationSeconds: Math.round((Date.now() - startedAt.current) / 1000) });
    onDone();
  }

  function fieldProps(f: { key: keyof ProjectAssessment; labelEn: string; fieldType?: "text" | "date" | "dropdown" | "textarea" | "unitTable"; options?: string[]; required?: boolean }) {
    return {
      k: f.key,
      label: f.labelEn,
      fieldType: f.fieldType,
      options: f.options,
      required: f.required,
      value: typeof form[f.key] === "string" ? (form[f.key] as string) : "",
      unitRows: form.unitTable ?? [],
      voiceSupported,
      isRecording: recordingField === f.key,
      onChangeText: setField,
      onChangeDate: setField,
      onVoiceToggle: (k: keyof ProjectAssessment) => recordingField === k ? stopVoice() : startVoice(k),
      onUnitRow: setUnitRow,
      onUnitAdd: addUnitRow,
      onUnitRemove: removeUnitRow,
    };
  }

  function renderGrid() {
    const fields = (fieldCfg ?? []).filter(f => f.enabled);
    const cells: React.ReactNode[] = [];
    let i = 0;
    while (i < fields.length) {
      const f = fields[i];
      if (f.layout === "full") {
        cells.push(
          <div key={f.key} className="sm:col-span-2">
            <KnowledgeField {...fieldProps(f)} />
          </div>
        );
      } else if (f.layout !== "right" && fields[i + 1]?.layout === "right") {
        i++;
        const rightGroup = [fields[i]];
        while (i + 1 < fields.length && fields[i + 1].layout === "right") { i++; rightGroup.push(fields[i]); }
        cells.push(
          <div key={f.key + "-flex-pair"} className="flex gap-3 sm:col-span-2">
            <div className="flex flex-1 flex-col">
              <KnowledgeField {...fieldProps(f)} stretch />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              {rightGroup.map(g => (
                <KnowledgeField key={g.key} {...fieldProps(g)} />
              ))}
            </div>
          </div>
        );
      } else {
        cells.push(
          <div key={f.key}>
            <KnowledgeField {...fieldProps(f)} />
          </div>
        );
      }
      i++;
    }
    return cells;
  }

  return (
    <div className="space-y-5">
      {/* Voice language toggle — shown only when speech recognition is available */}
      {voiceSupported && (
        <div className="flex items-center gap-4 rounded-xl border border-[#DCE9E6] bg-[#F5F8F7] px-4 py-2.5 dark:border-slate-700 dark:bg-slate-800">
          <Mic className="h-3.5 w-3.5 shrink-0 text-[#0B4F4B] dark:text-[#8FD4C6]" />
          <span className="text-xs text-slate-500 dark:text-slate-400">Voice language</span>
          {(["ar", "en"] as const).map(l => (
            <label key={l} className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
              <input type="radio" name="voiceLang" value={l} checked={voiceLang === l}
                onChange={() => { if (!recordingField) setVoiceLang(l); }}
                className="accent-[#0B4F4B]" />
              {l === "ar" ? "العربية" : "English"}
            </label>
          ))}
          {recordingField && (
            <span className="ml-auto flex items-center gap-1.5 text-xs font-medium text-rose-500">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" /> Recording…
            </span>
          )}
        </div>
      )}

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#0B4F4B] dark:text-[#8FD4C6]">Project Assessment</p>
        <div className="grid items-start gap-3 sm:grid-cols-2">
          {renderGrid()}
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-[#DCE9E6] pt-4 dark:border-slate-700">
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <Button onClick={handleSubmit}>
          <Check className="h-4 w-4" /> Mark Complete
        </Button>
      </div>
    </div>
  );
}

// ── Task 3: Calls ─────────────────────────────────────────────────────────────
function CallsTaskForm({ date, onDone }: { date: string; onDone: () => void }) {
  const [fresh, setFresh] = useState("");
  const [old, setOld] = useState("");
  const startedAt = useRef(Date.now());
  const [delay, setDelay] = useState("");

  const freshN = parseInt(fresh) || 0;
  const oldN = parseInt(old) || 0;
  const delayN = parseInt(delay) || 0;
  const total = freshN + oldN + delayN;
  const canSubmit = fresh !== "" && old !== "" && delay !== "";

  function handleSubmit() {
    if (!canSubmit) return;
    const data: CallsTaskData = { freshCalls: freshN, oldCalls: oldN, delayCalls: delayN };
    addDailyTask({ employeeId: ME_ID, employeeName: ME_NAME, date, taskType: "calls", data, durationSeconds: Math.round((Date.now() - startedAt.current) / 1000) });
    onDone();
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500 dark:text-slate-400">Log your call activity for today by category.</p>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Fresh Calls", val: fresh, setter: setFresh, desc: "New leads called today" },
          { label: "Old Calls", val: old, setter: setOld, desc: "Previous leads followed up" },
          { label: "Delay Calls", val: delay, setter: setDelay, desc: "Clients with pending follow-up" },
        ].map(({ label, val, setter, desc }) => (
          <div key={label} className="rounded-2xl border border-[#DCE9E6] bg-[#F5F8F7] p-4 dark:border-slate-700 dark:bg-slate-800">
            <label className={labelCls}>{label} *</label>
            <input type="number" min="0" value={val} onChange={e => setter(e.target.value)} placeholder="0" className={inputCls} />
            <p className="mt-1.5 text-xs text-slate-400">{desc}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 rounded-xl border border-[#DCE9E6] bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
        <Phone className="h-4 w-4 text-[#0B4F4B]" />
        <span className="text-sm text-slate-600 dark:text-slate-300">Total calls today:</span>
        <span className="ml-auto text-lg font-semibold text-slate-900 dark:text-white">{total}</span>
      </div>
      <div className="flex justify-end gap-3 border-t border-[#DCE9E6] pt-4 dark:border-slate-700">
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!canSubmit}>
          <Check className="h-4 w-4" /> Mark Complete
        </Button>
      </div>
    </div>
  );
}

// ── Task 4: Rotation ──────────────────────────────────────────────────────────
const SALES_TEAM = employees.filter(e => e.department === "Sales" && e.id !== ME_ID);

function RotationTaskForm({ date, onDone }: { date: string; onDone: () => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const startedAt = useRef(Date.now());

  function toggle(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  const canSubmit = selected.length > 0;

  function handleSubmit() {
    if (!canSubmit) return;
    const names = SALES_TEAM.filter(e => selected.includes(e.id)).map(e => e.name);
    const data: RotationTaskData = { rotatedWithIds: selected, rotatedWithNames: names, notes };
    addDailyTask({ employeeId: ME_ID, employeeName: ME_NAME, date, taskType: "rotation", data, durationSeconds: Math.round((Date.now() - startedAt.current) / 1000) });
    onDone();
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500 dark:text-slate-400">Select team members who rotated with you today, and add any relevant notes.</p>
      <div>
        <p className={labelCls}>Rotated with</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {SALES_TEAM.map(emp => (
            <label key={emp.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${selected.includes(emp.id) ? "border-[#0B4F4B] bg-[#E8F3F1] dark:border-[#2E7D76] dark:bg-[#0B2927]" : "border-[#DCE9E6] bg-white hover:border-[#B7D9D3] dark:border-slate-700 dark:bg-slate-900"}`}>
              <input type="checkbox" checked={selected.includes(emp.id)} onChange={() => toggle(emp.id)} className="h-4 w-4 rounded accent-[#0B4F4B]" />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{emp.name}</p>
                <p className="text-xs text-slate-400">{emp.role}</p>
              </div>
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className={labelCls}>Notes</label>
        <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Any notes about today's rotation…"
          className={`${inputCls} resize-none`} />
      </div>
      <div className="flex justify-end gap-3 border-t border-[#DCE9E6] pt-4 dark:border-slate-700">
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!canSubmit}>
          <Check className="h-4 w-4" /> Mark Complete
        </Button>
      </div>
      {!canSubmit && (
        <p className="text-center text-xs text-rose-500">Select at least one team member to complete rotation</p>
      )}
    </div>
  );
}

// ── Request form (inline on this page) ───────────────────────────────────────
function RequestForm({ date, onDone, onCancel }: { date: string; onDone: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({ clientName: "", clientNumber: "", leadSource: "", budget: "", feedback: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function set(k: keyof typeof form, v: string) { setForm(prev => ({ ...prev, [k]: v })); }
  const canSubmit = Object.values(form).every(v => v.trim());

  function handleSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    addCRMRequest({ employeeId: ME_ID, employeeName: ME_NAME, date, ...form });
    setSubmitted(true);
    setSubmitting(false);
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-900 dark:bg-emerald-950">
        <Check className="mx-auto mb-3 h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        <p className="font-semibold text-emerald-800 dark:text-emerald-300">Request submitted!</p>
        <div className="mt-4 flex justify-center gap-3">
          <Button size="sm" onClick={() => { setForm({ clientName: "", clientNumber: "", leadSource: "", budget: "", feedback: "" }); setSubmitted(false); }}>
            <Plus className="h-3 w-3" /> Add Another
          </Button>
          <Button size="sm" variant="outline" onClick={onDone}>Done</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Client Name *</label>
          <input type="text" value={form.clientName} onChange={e => set("clientName", e.target.value)} placeholder="Full name" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Client Number *</label>
          <input type="tel" value={form.clientNumber} onChange={e => set("clientNumber", e.target.value)} placeholder="+20 1XX XXX XXXX" className={inputCls} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Lead Source *</label>
          <select value={form.leadSource} onChange={e => set("leadSource", e.target.value)} className={inputCls}>
            <option value="">Select source…</option>
            {LEAD_SOURCE_GROUPS.map(g => (
              <optgroup key={g.label} label={g.label}>
                {g.options.map(s => <option key={s} value={s}>{s}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Budget *</label>
          <input type="text" value={form.budget} onChange={e => set("budget", e.target.value)} placeholder="e.g. EGP 2,500,000" className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Feedback *</label>
        <textarea rows={3} value={form.feedback} onChange={e => set("feedback", e.target.value)} placeholder="Client interest, notes, outcome…" className={`${inputCls} resize-none`} />
      </div>
      <div className="flex justify-end gap-3 border-t border-[#DCE9E6] pt-4 dark:border-slate-700">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
          <Check className="h-4 w-4" /> Submit Request
        </Button>
      </div>
    </div>
  );
}

// ── Quick meeting form ────────────────────────────────────────────────────────
function MeetingForm({ date, onDone, onCancel }: { date: string; onDone: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({ clientName: "", clientNumber: "", projectName: "", meetingLocation: "", notes: "" });
  const [submitted, setSubmitted] = useState(false);
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  // After-hours check — temporarily disabled for testing
  const isAfterHours = false;

  function set(k: keyof typeof form, v: string) { setForm(prev => ({ ...prev, [k]: v })); }
  const canSubmit = form.clientName.trim() && form.projectName.trim();

  function handleSubmit() {
    if (!canSubmit) return;
    addVisit({
      employeeName: ME_NAME,
      employeeRole: "Sales",
      clientName: form.clientName.trim(),
      clientNumber: form.clientNumber.trim(),
      date,
      time: timeStr,
      zone: "Office",
      projectName: form.projectName.trim(),
      meetingLocation: form.meetingLocation.trim() || "Office",
      notes: form.notes.trim(),
    });
    setSubmitted(true);
  }

  if (isAfterHours) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-900 dark:bg-amber-950">
        <Lock className="mx-auto mb-3 h-8 w-8 text-amber-500 dark:text-amber-400" />
        <p className="font-semibold text-amber-800 dark:text-amber-300">Working hours have ended</p>
        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">New meetings can no longer be logged for today.</p>
        <div className="mt-4 flex justify-center">
          <Button size="sm" variant="outline" onClick={onCancel}>Close</Button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-900 dark:bg-emerald-950">
        <Check className="mx-auto mb-3 h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        <p className="font-semibold text-emerald-800 dark:text-emerald-300">Meeting logged!</p>
        <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">Pending approval from manager.</p>
        <div className="mt-4 flex justify-center gap-3">
          <Button size="sm" onClick={() => { setForm({ clientName: "", clientNumber: "", projectName: "", meetingLocation: "", notes: "" }); setSubmitted(false); }}>
            <Plus className="h-3 w-3" /> Add Another
          </Button>
          <Button size="sm" variant="outline" onClick={onDone}>Done</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Client Name *</label>
          <input type="text" value={form.clientName} onChange={e => set("clientName", e.target.value)} placeholder="Full name" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Client Number</label>
          <input type="tel" value={form.clientNumber} onChange={e => set("clientNumber", e.target.value)} placeholder="+20 1XX XXX XXXX" className={inputCls} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Project Name *</label>
          <input type="text" value={form.projectName} onChange={e => set("projectName", e.target.value)} placeholder="e.g. Marassi North Coast" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Location</label>
          <input type="text" value={form.meetingLocation} onChange={e => set("meetingLocation", e.target.value)} placeholder="Office / site / client office…" className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Notes</label>
        <textarea rows={3} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Client interest, outcome, follow-up…" className={`${inputCls} resize-none`} />
      </div>
      <p className="text-xs text-slate-400">Time logged automatically as {timeStr}. Requires manager approval.</p>
      <div className="flex justify-end gap-3 border-t border-[#DCE9E6] pt-4 dark:border-slate-700">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!canSubmit}>
          <Check className="h-4 w-4" /> Log Meeting
        </Button>
      </div>
    </div>
  );
}

// ── Shared voice recorder for custom tasks ────────────────────────────────────
type CustomTaskMode = "text" | "voice";
type CustomVoiceStep = "record" | "review";

function VoiceRecorderPanel({
  onTranscript,
  onCancel,
  canSave = true,
}: {
  onTranscript: (text: string, lang: "ar" | "en") => void;
  onCancel: () => void;
  canSave?: boolean;
}) {
  const [voiceLang, setVoiceLang] = useState<"ar" | "en">("ar");
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [voiceStep, setVoiceStep] = useState<CustomVoiceStep>("record");
  const [supported, setSupported] = useState(true);
  const recRef = useRef<ISpeechRecognition | null>(null);

  useEffect(() => {
    setSupported(!!(window.SpeechRecognition || window.webkitSpeechRecognition));
  }, []);

  function startRecording() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec: ISpeechRecognition = new SR();
    rec.lang = voiceLang === "ar" ? "ar-EG" : "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    let final = "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t + " "; else interim = t;
      }
      setTranscript(final + interim);
    };
    rec.onerror = () => setIsRecording(false);
    rec.onend = () => setIsRecording(false);
    rec.start();
    recRef.current = rec;
    setIsRecording(true);
  }

  function stopRecording() {
    recRef.current?.stop();
    setIsRecording(false);
  }

  const isAr = voiceLang === "ar";

  if (!supported) {
    return (
      <div className="rounded-2xl border border-[#DCE9E6] bg-[#F5F8F7] p-6 text-center dark:border-slate-700 dark:bg-slate-800">
        <p className="text-sm text-slate-500">Voice recording requires Chrome or Edge.</p>
        <button onClick={onCancel} className="mt-3 text-xs font-semibold text-[#0B4F4B] hover:underline dark:text-[#8FD4C6]">← Use text instead</button>
      </div>
    );
  }

  if (voiceStep === "review") {
    return (
      <div className="space-y-4">
        <button onClick={() => setVoiceStep("record")} className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-[#0B4F4B] dark:hover:text-[#8FD4C6]">← Re-record</button>
        <div className="rounded-2xl border border-[#DCE9E6] bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <p className={`mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 ${isAr ? "text-right" : ""}`}>
            {isAr ? "النص المسجل — يمكنك التعديل قبل الحفظ" : "Your transcript — edit before saving"}
          </p>
          <textarea
            rows={6}
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
            dir={isAr ? "rtl" : "ltr"}
            className={`w-full resize-none rounded-xl border border-[#DCE9E6] bg-[#F5F8F7] px-3 py-2.5 text-sm leading-7 text-slate-800 focus:border-[#0B4F4B] focus:outline-none focus:ring-2 focus:ring-[#0B4F4B]/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 ${isAr ? "text-right" : ""}`}
          />
          <button onClick={() => { setTranscript(""); setVoiceStep("record"); }} className="mt-2 text-xs text-slate-400 hover:text-rose-500">
            {isAr ? "إعادة التسجيل" : "Clear & re-record"}
          </button>
        </div>
        <div className="flex justify-end gap-3 border-t border-[#DCE9E6] pt-4 dark:border-slate-700">
          <Button variant="outline" onClick={onCancel}>← Text mode</Button>
          <Button onClick={() => { stopRecording(); onTranscript(transcript.trim(), voiceLang); }} disabled={!transcript.trim() || !canSave}>
            <Check className="h-4 w-4" /> {isAr ? "حفظ وإتمام" : "Save & Submit"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={onCancel} className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-[#0B4F4B] dark:hover:text-[#8FD4C6]">← Text mode</button>
      <div className="rounded-2xl border border-[#DCE9E6] bg-[#F5F8F7] p-5 dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-4 flex items-center gap-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Language</span>
          {(["ar", "en"] as const).map(l => (
            <label key={l} className="flex cursor-pointer items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300">
              <input type="radio" name="vcLang" value={l} checked={voiceLang === l} onChange={() => { if (!isRecording) setVoiceLang(l); }} className="accent-[#0B4F4B]" />
              {l === "ar" ? "العربية" : "English"}
            </label>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition ${isRecording ? "bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-950 dark:text-rose-300" : "bg-[#0B4F4B] text-white hover:bg-[#063C39]"}`}
          >
            {isRecording ? <><MicOff className="h-4 w-4" /> Stop</> : <><Mic className="h-4 w-4" /> Start Recording</>}
          </button>
          {isRecording && <span className="flex items-center gap-1.5 text-sm font-medium text-rose-600 dark:text-rose-400"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500" /> Recording…</span>}
          {!isRecording && transcript && <button onClick={() => setTranscript("")} className="text-xs text-slate-400 hover:text-rose-500">Clear</button>}
        </div>
      </div>
      {transcript ? (
        <div className="rounded-2xl border border-[#DCE9E6] bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Transcript</p>
          <p className={`text-sm leading-7 text-slate-800 dark:text-slate-100 ${isAr ? "text-right" : ""}`} dir={isAr ? "rtl" : "ltr"}>{transcript}</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#DCE9E6] bg-white p-6 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-900">
          {isAr ? "النص سيظهر هنا أثناء الكلام" : "Transcript will appear here as you speak"}
        </div>
      )}
      <div className="flex justify-end gap-3 border-t border-[#DCE9E6] pt-4 dark:border-slate-700">
        <Button variant="outline" onClick={onCancel}>← Text mode</Button>
        <Button onClick={() => setVoiceStep("review")} disabled={!transcript.trim() || isRecording}>
          {isAr ? "مراجعة قبل الحفظ" : "Review & Save"} →
        </Button>
      </div>
    </div>
  );
}

// ── Task resources panel (links + attachments) ───────────────────────────────
function TaskResources({ task, onItemOpened }: { task: CustomTask; onItemOpened?: (id: string) => void }) {
  const links = task.links ?? [];
  const attachments = task.attachments ?? [];
  const [opened, setOpened] = useState<Set<string>>(new Set());

  if (links.length === 0 && attachments.length === 0) return null;

  function markOpened(id: string) {
    setOpened(prev => { const s = new Set(prev); s.add(id); return s; });
    onItemOpened?.(id);
  }

  const total = links.length + attachments.length;
  const allOpened = opened.size >= total;

  return (
    <div className="rounded-2xl border border-[#DCE9E6] bg-[#F5F8F7] p-4 dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Reference material</p>
        {!allOpened && (
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
            Open all to continue ({opened.size}/{total})
          </span>
        )}
        {allOpened && (
          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <Check className="h-3 w-3" /> All opened
          </span>
        )}
      </div>
      <div className="space-y-2">
        {links.map(lnk => {
          const done = opened.has(lnk.id);
          return (
            <a
              key={lnk.id}
              href={lnk.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => markOpened(lnk.id)}
              className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition ${done ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300" : "border-[#DCE9E6] bg-white text-[#0B4F4B] hover:border-[#0B4F4B] hover:bg-[#E8F3F1] dark:border-slate-700 dark:bg-slate-900 dark:text-[#8FD4C6] dark:hover:border-[#2E7D76] dark:hover:bg-[#0B2927]"}`}
            >
              {done ? <Check className="h-4 w-4 shrink-0 text-emerald-500" /> : <ExternalLink className="h-4 w-4 shrink-0" />}
              <span className="flex-1 truncate font-medium">{lnk.label || lnk.url}</span>
            </a>
          );
        })}
        {attachments.map(att => {
          const done = opened.has(att.id);
          return (
            <a
              key={att.id}
              href={att.dataUrl}
              download={att.name}
              onClick={() => markOpened(att.id)}
              className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition ${done ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40" : "border-[#DCE9E6] bg-white hover:border-[#0B4F4B] dark:border-slate-700 dark:bg-slate-900"}`}
            >
              {done ? <Check className="h-4 w-4 shrink-0 text-emerald-500" /> : <Paperclip className="h-4 w-4 shrink-0 text-slate-400" />}
              <span className="flex-1 truncate text-slate-700 dark:text-slate-200">{att.name}</span>
              <span className="text-xs text-slate-400">
                {att.sizeBytes < 1024 ? `${att.sizeBytes} B` : att.sizeBytes < 1048576 ? `${(att.sizeBytes / 1024).toFixed(0)} KB` : `${(att.sizeBytes / 1048576).toFixed(1)} MB`}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

// ── Custom task: normal acknowledgement modal ─────────────────────────────────
function CustomTaskAckModal({ task, date, onDone }: { task: CustomTask; date: string; onDone: () => void }) {
  const [mode, setMode] = useState<CustomTaskMode | null>(task.allowVoice ? null : "text");
  const [note, setNote] = useState("");
  const [openedCount, setOpenedCount] = useState(0);
  const startedAt = useRef(Date.now());

  const totalItems = (task.links?.length ?? 0) + (task.attachments?.length ?? 0);
  const allItemsOpened = totalItems === 0 || openedCount >= totalItems;
  const canSubmit = note.trim().length > 0 && allItemsOpened;

  function handleTextSubmit() {
    if (!canSubmit) return;
    addCustomTaskCompletion({ taskId: task.id, employeeId: ME_ID, date, note: note.trim(), wasBlocked: false, durationSeconds: Math.round((Date.now() - startedAt.current) / 1000) });
    onDone();
  }

  function handleVoiceSubmit(transcript: string) {
    addCustomTaskCompletion({ taskId: task.id, employeeId: ME_ID, date, note: transcript, wasBlocked: false, durationSeconds: Math.round((Date.now() - startedAt.current) / 1000) });
    onDone();
  }

  // ── Mode selector ────────────────────────────────────────────────────────────
  if (mode === null) {
    return (
      <div className="space-y-4">
        {task.description && <p className="text-sm text-slate-500 dark:text-slate-400">{task.description}</p>}
        <TaskResources task={task} onItemOpened={() => setOpenedCount(c => c + 1)} />
        {!allItemsOpened && <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">Open all reference materials above before continuing.</p>}
        <p className="text-sm text-slate-500 dark:text-slate-400">How would you like to complete this task?</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <button onClick={() => setMode("text")} className="flex flex-col items-center gap-3 rounded-2xl border-2 border-[#DCE9E6] bg-white p-6 text-center transition hover:border-[#0B4F4B] hover:bg-[#E8F3F1] dark:border-slate-700 dark:bg-slate-900 dark:hover:border-[#2E7D76] dark:hover:bg-[#0B2927]">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E8F3F1] dark:bg-[#0B2927]">
              <svg className="h-6 w-6 text-[#0B4F4B] dark:text-[#8FD4C6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </span>
            <div><p className="font-semibold text-slate-900 dark:text-white">Type</p><p className="mt-1 text-xs text-slate-400">Write a completion note</p></div>
          </button>
          <button onClick={() => setMode("voice")} className="flex flex-col items-center gap-3 rounded-2xl border-2 border-[#DCE9E6] bg-white p-6 text-center transition hover:border-[#0B4F4B] hover:bg-[#E8F3F1] dark:border-slate-700 dark:bg-slate-900 dark:hover:border-[#2E7D76] dark:hover:bg-[#0B2927]">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E8F3F1] dark:bg-[#0B2927]"><Mic className="h-6 w-6 text-[#0B4F4B] dark:text-[#8FD4C6]" /></span>
            <div><p className="font-semibold text-slate-900 dark:text-white">Voice Note</p><p className="mt-1 text-xs text-slate-400">Record in Arabic or English</p></div>
          </button>
        </div>
        <div className="flex justify-end pt-2"><Button variant="outline" onClick={onDone}>Cancel</Button></div>
      </div>
    );
  }

  if (mode === "voice") {
    return (
      <div className="space-y-4">
        {task.description && <p className="text-sm text-slate-500 dark:text-slate-400">{task.description}</p>}
        <TaskResources task={task} onItemOpened={() => setOpenedCount(c => c + 1)} />
        {!allItemsOpened && <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">Open all reference materials above before submitting.</p>}
        <VoiceRecorderPanel onTranscript={handleVoiceSubmit} canSave={allItemsOpened} onCancel={() => setMode(null)} />
      </div>
    );
  }

  // text mode
  return (
    <div className="space-y-4">
      {task.description && <p className="text-sm text-slate-500 dark:text-slate-400">{task.description}</p>}
      <TaskResources task={task} onItemOpened={() => setOpenedCount(c => c + 1)} />
      {task.allowVoice && (
        <button onClick={() => setMode(null)} className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-[#0B4F4B] dark:hover:text-[#8FD4C6]">← Change method</button>
      )}
      <div>
        <label className={labelCls}>Completion note *</label>
        <textarea rows={4} value={note} onChange={e => setNote(e.target.value)} placeholder="Describe what you did to complete this task…" className={`${inputCls} resize-none`} />
        <p className="mt-1 text-xs text-slate-400">A note is required to mark this task as complete.</p>
      </div>
      {!allItemsOpened && totalItems > 0 && (
        <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">Open all reference materials ({openedCount}/{totalItems}) before submitting.</p>
      )}
      <div className="flex justify-end gap-3 border-t border-[#DCE9E6] pt-4 dark:border-slate-700">
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <Button onClick={handleTextSubmit} disabled={!canSubmit}><Check className="h-4 w-4" /> Mark Complete</Button>
      </div>
    </div>
  );
}

// ── Custom task: integrity-locked assessment modal ────────────────────────────
function PriorityAssessmentModal({ task, date, onDone }: { task: CustomTask; date: string; onDone: () => void }) {
  const [mode, setMode] = useState<CustomTaskMode | null>(task.allowVoice ? null : "text");
  const [note, setNote] = useState("");
  // Initialise blocked from persisted localStorage lock so reopening still shows locked
  const [blocked, setBlocked] = useState(() => isAssessmentBlocked(ME_ID, task.id, date));
  const [openedCount, setOpenedCount] = useState(0);
  const startedAt = useRef(Date.now());
  // Grace-period: opening a reference link triggers visibilitychange — don't lock for it
  const linkJustClicked = useRef(false);

  const totalItems = (task.links?.length ?? 0) + (task.attachments?.length ?? 0);
  const allItemsOpened = totalItems === 0 || openedCount >= totalItems;

  function onItemOpened() {
    setOpenedCount(c => c + 1);
    linkJustClicked.current = true;
    setTimeout(() => { linkJustClicked.current = false; }, 3000);
  }

  // ── visibilitychange: lock only when user intentionally leaves ───────────────
  useEffect(() => {
    function handleVisibility() {
      if (document.hidden && !linkJustClicked.current) {
        markAssessmentBlocked(ME_ID, ME_NAME, task.id, task.labelEn, date);
        setBlocked(true);
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [task.id, date]);

  // ── beforeunload: browser-native warning dialog ──────────────────────────────
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "Complete this assessment before leaving — closing the tab will prevent submission.";
      return e.returnValue;
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const canSubmit = !blocked && note.trim().length > 0 && allItemsOpened;

  function handleSubmit() {
    if (!canSubmit) return;
    addCustomTaskCompletion({ taskId: task.id, employeeId: ME_ID, date, note: note.trim(), wasBlocked: false, durationSeconds: Math.round((Date.now() - startedAt.current) / 1000) });
    onDone();
  }

  return (
    // Fullscreen non-dismissable overlay — no X button, clicking outside does nothing
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-slate-950" role="dialog" aria-modal="true">
      {/* Top warning bar */}
      <div className="flex items-start gap-3 bg-amber-500 px-6 py-3 text-white dark:bg-amber-600">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="text-sm font-semibold">
            Do not open other apps or search engines — this will permanently lock your assessment.
          </p>
          <p className="mt-0.5 text-xs text-amber-100">
            Reference links and attachments provided in this task are allowed to open safely.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-6 py-10">
          {/* Header */}
          <div className="mb-6 flex items-start gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950">
              <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">Priority Assessment</p>
              <h1 className="mt-0.5 text-2xl font-semibold text-slate-900 dark:text-white">{task.labelEn}</h1>
              {task.labelAr && (
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400" dir="rtl">{task.labelAr}</p>
              )}
            </div>
          </div>

          {task.description && (
            <div className="mb-4 rounded-2xl border border-[#DCE9E6] bg-[#F5F8F7] px-5 py-4 dark:border-slate-700 dark:bg-slate-900">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Instructions</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{task.description}</p>
            </div>
          )}

          <div className="mb-6">
            <TaskResources task={task} onItemOpened={onItemOpened} />
            {!allItemsOpened && totalItems > 0 && !blocked && (
              <p className="mt-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
                Open all reference materials ({openedCount}/{totalItems}) before submitting.
              </p>
            )}
          </div>

          {/* Blocked state */}
          {blocked ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-8 text-center dark:border-rose-900 dark:bg-rose-950/40">
              <Lock className="mx-auto mb-3 h-8 w-8 text-rose-500" />
              <p className="text-lg font-semibold text-rose-700 dark:text-rose-300">Assessment Locked</p>
              <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">
                You left this screen while the assessment was open. This session cannot be submitted.
              </p>
              <p className="mt-3 text-xs text-rose-500">Contact your manager to have this task reassigned.</p>
            </div>
          ) : mode === null ? (
            /* Voice / text mode selector */
            <div className="space-y-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">How would you like to complete this assessment?</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <button onClick={() => setMode("text")} className="flex flex-col items-center gap-3 rounded-2xl border-2 border-[#DCE9E6] bg-white p-6 text-center transition hover:border-[#0B4F4B] hover:bg-[#E8F3F1] dark:border-slate-700 dark:bg-slate-900 dark:hover:border-[#2E7D76] dark:hover:bg-[#0B2927]">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E8F3F1] dark:bg-[#0B2927]">
                    <svg className="h-6 w-6 text-[#0B4F4B] dark:text-[#8FD4C6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </span>
                  <div><p className="font-semibold text-slate-900 dark:text-white">Type answer</p><p className="mt-1 text-xs text-slate-400">Write your response</p></div>
                </button>
                <button onClick={() => setMode("voice")} className="flex flex-col items-center gap-3 rounded-2xl border-2 border-[#DCE9E6] bg-white p-6 text-center transition hover:border-[#0B4F4B] hover:bg-[#E8F3F1] dark:border-slate-700 dark:bg-slate-900 dark:hover:border-[#2E7D76] dark:hover:bg-[#0B2927]">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E8F3F1] dark:bg-[#0B2927]"><Mic className="h-6 w-6 text-[#0B4F4B] dark:text-[#8FD4C6]" /></span>
                  <div><p className="font-semibold text-slate-900 dark:text-white">Voice Note</p><p className="mt-1 text-xs text-slate-400">Record in Arabic or English</p></div>
                </button>
              </div>
            </div>
          ) : mode === "voice" ? (
            <VoiceRecorderPanel
              onTranscript={(text) => {
                addCustomTaskCompletion({ taskId: task.id, employeeId: ME_ID, date, note: text, wasBlocked: false, durationSeconds: Math.round((Date.now() - startedAt.current) / 1000) });
                onDone();
              }}
              canSave={allItemsOpened}
              onCancel={() => setMode(null)}
            />
          ) : (
            <div className="space-y-4">
              {task.allowVoice && (
                <button onClick={() => setMode(null)} className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-[#0B4F4B] dark:hover:text-[#8FD4C6]">← Change method</button>
              )}
              <div>
                <label className={labelCls}>Your answer / completion note *</label>
                <textarea
                  rows={6}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Write your response here — answer from memory, do not search or use AI…"
                  className={`${inputCls} resize-none`}
                  autoFocus
                />
                <p className="mt-1.5 text-xs text-slate-400">
                  Stay on this screen. Switching tabs or apps will permanently lock this assessment.
                </p>
              </div>
              <Button className="w-full py-3 text-base" onClick={handleSubmit} disabled={!canSubmit}>
                <Check className="h-5 w-5" /> Submit Assessment
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Task icon map ─────────────────────────────────────────────────────────────
const TASK_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  ads:       Megaphone,
  knowledge: Building2,
  calls:     Phone,
  rotation:  RotateCcw,
  extra:     ClipboardList,
};

function motivationMessage(pct: number): { text: string; tone: "neutral" | "warn" | "good" | "great" } {
  const h = new Date().getHours();
  if (pct === 100) return { text: "All targets hit — outstanding work today!", tone: "great" };
  if (pct >= 75)  return { text: "Almost there — one final push to close the day strong.", tone: "good" };
  if (pct >= 50)  return { text: "Halfway done — stay focused and keep going.", tone: "good" };
  if (pct >= 25)  return { text: "Good start — keep the momentum going.", tone: "neutral" };
  if (h >= 16)    return { text: "Afternoon check — still time to hit your targets today.", tone: "warn" };
  if (h >= 12)    return { text: "Pick up the pace — targets are waiting.", tone: "warn" };
  return { text: "Fresh start — your first task today awaits.", tone: "neutral" };
}

// ── Main workspace ────────────────────────────────────────────────────────────
type ModalType = "ads" | "knowledge" | "calls" | "rotation" | "request" | "meeting" | null;

type LiveData = {
  requests: CRMRequest[];
  adsTask: DailyTask | undefined;
  knowledgeCount: number;
  callsTask: DailyTask | undefined;
  rotationTask: DailyTask | undefined;
  meetingsToday: number;
  todayVisits: VisitRequest[];
  extraTasks: ExtraTask[];
  adjustments: CRMAdjustment[];
};

const EMPTY_LIVE: LiveData = {
  requests: [], adsTask: undefined, knowledgeCount: 0,
  callsTask: undefined, rotationTask: undefined, meetingsToday: 0, todayVisits: [], extraTasks: [], adjustments: [],
};

export function CRMTasksWorkspace() {
  const [today] = useState(todayISO);
  const [modal, setModal] = useState<ModalType>(null);
  const [customTaskModal, setCustomTaskModal] = useState<string | null>(null); // custom task ID
  const [ready, setReady] = useState(false);
  const [live, setLive] = useState<LiveData>(EMPTY_LIVE);
  const [cfg, setCfg] = useState<CRMTasksConfig | null>(null);

  useEffect(() => {
    function refresh() {
      setLive({
        requests: requestsForEmployeeOnDate(ME_ID, today),
        adsTask: taskForEmployeeOnDate(ME_ID, today, "ads"),
        knowledgeCount: tasksCountForEmployeeOnDate(ME_ID, today, "knowledge"),
        callsTask: taskForEmployeeOnDate(ME_ID, today, "calls"),
        rotationTask: taskForEmployeeOnDate(ME_ID, today, "rotation"),
        meetingsToday: countMeetingsToday(today),
        todayVisits: loadRequests().visits.filter(v => v.employeeName === ME_NAME && v.date === today),
        extraTasks: extraTasksForEmployee(ME_ID).filter(t => t.assignedDate === today),
        adjustments: adjustmentsForEmployeeOnDate(ME_ID, today),
      });
      setCfg(loadCRMTaskConfig());
      setReady(true);
    }
    refresh();
    const unsubCRM = onCRMChanged(refresh);
    const unsubCfg = onCRMTaskConfigChanged(() => setCfg(loadCRMTaskConfig()));
    const unsubReq = onRequestsChanged(refresh);
    return () => { unsubCRM(); unsubCfg(); unsubReq(); };
  }, [today]);

  if (!ready || !cfg) return null;

  const { requests, adsTask, knowledgeCount, callsTask, rotationTask, meetingsToday, todayVisits, extraTasks, adjustments } = live;
  const knowledgeDone = knowledgeCount >= cfg.knowledgeTarget;

  // Custom tasks that apply today come FIRST (highest priority)
  const todayCustomTasks = cfg.customTasks.filter(t => customTaskAppliesToDate(t, today));

  const allTasks = [
    // Priority custom tasks first
    ...todayCustomTasks.map((t, i) => {
      const completion = getCustomTaskCompletion(ME_ID, t.id, today);
      return {
        key: `custom-${t.id}` as ModalType,
        num: i + 1,
        title: t.labelEn,
        desc: t.description || t.labelAr,
        done: !!completion,
        completedAt: completion?.completedAt,
        dueTime: t.dueTime,
        priority: true,
        lockMode: !!t.lockMode,
        customId: t.id,
      };
    }),
    // Then built-in tasks
    cfg.ads.enabled && {
      key: "ads" as const,
      num: todayCustomTasks.length + 1,
      title: "Ads & WhatsApp Campaign",
      desc: `Submit ${cfg.ads.linkCount} social media link${cfg.ads.linkCount > 1 ? "s" : ""} posted today`,
      done: !!adsTask,
      completedAt: adsTask?.completedAt,
      priority: false,
      lockMode: false,
      customId: undefined as string | undefined,
    },
    cfg.knowledge.enabled && {
      key: "knowledge" as const,
      num: todayCustomTasks.length + 2,
      title: "Projects in Market",
      desc: knowledgeCount > 0
        ? knowledgeCount >= cfg.knowledgeTarget
          ? `${knowledgeCount} assessment${knowledgeCount !== 1 ? "s" : ""} submitted`
          : `${knowledgeCount}/${cfg.knowledgeTarget} assessments submitted`
        : `Complete ${cfg.knowledgeTarget} project assessment${cfg.knowledgeTarget !== 1 ? "s" : ""}`,
      done: knowledgeDone,
      completedAt: knowledgeDone ? new Date().toISOString() : undefined,
      priority: false,
      lockMode: false,
      customId: undefined as string | undefined,
    },
    cfg.calls.enabled && {
      key: "calls" as const,
      num: todayCustomTasks.length + 3,
      title: "Calls",
      desc: "Log your call activity by category",
      done: !!callsTask,
      completedAt: callsTask?.completedAt,
      priority: false,
      lockMode: false,
      customId: undefined as string | undefined,
    },
    cfg.rotation.enabled && {
      key: "rotation" as const,
      num: todayCustomTasks.length + 4,
      title: "Rotation",
      desc: "Log team rotation and add notes",
      done: !!rotationTask,
      completedAt: rotationTask?.completedAt,
      priority: false,
      lockMode: false,
      customId: undefined as string | undefined,
    },
    // Extra tasks assigned by admin — appear as full task cards
    ...extraTasks.map((et, i) => {
      const assignedTime = completedAt(et.createdAt);
      const deductionNote = et.deductionDays > 0 ? ` · −${et.deductionDays}d deduction` : "";
      return {
        key: `extra-${et.id}` as ModalType,
        num: todayCustomTasks.length + (cfg.ads.enabled ? 1 : 0) + (cfg.knowledge.enabled ? 1 : 0) + (cfg.calls.enabled ? 1 : 0) + (cfg.rotation.enabled ? 1 : 0) + i + 1,
        title: et.note,
        desc: `Assigned by manager at ${assignedTime}${deductionNote}`,
        done: et.acknowledged,
        completedAt: undefined as string | undefined,
        dueTime: undefined as string | undefined,
        priority: false,
        lockMode: false,
        customId: undefined as string | undefined,
        extraId: et.id,
      };
    }),
  ].filter(Boolean) as { key: ModalType; num: number; title: string; desc: string; done: boolean; completedAt?: string; dueTime?: string; priority: boolean; lockMode: boolean; customId?: string; extraId?: string }[];

  const tasks = allTasks;
  const doneCount = tasks.filter(t => t.done).length;
  const totalTasks = tasks.length || 4;
  const pct = Math.round((doneCount / totalTasks) * 100);
  const { text: motivText, tone: motivTone } = motivationMessage(pct);

  const motivColors = {
    neutral: "bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-300",
    warn:    "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400",
    good:    "bg-teal-50 border-teal-200 text-teal-700 dark:bg-teal-950/30 dark:border-teal-800 dark:text-teal-400",
    great:   "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400",
  }[motivTone];

  const MotivIcon = { neutral: Flame, warn: Target, good: TrendingUp, great: CheckCircle2 }[motivTone];

  return (
    <div className="pb-10">
      {/* Header */}
      <header className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0B4F4B] dark:text-[#8FD4C6]">CRM</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white sm:text-4xl">Daily Tasks</h1>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{friendlyDate(today)}</p>
          </div>
          {/* Progress summary */}
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">{doneCount}<span className="text-base font-normal text-slate-400">/{totalTasks}</span></span>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${pct === 100 ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400" : "border-[#DCE9E6] bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"}`}>
                {pct}% complete
              </span>
            </div>
            <div className="w-48 h-1.5 overflow-hidden rounded-full bg-[#E8F3F1] dark:bg-slate-800">
              <div className="h-full rounded-full bg-[#0B4F4B] transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
        {/* Motivation banner */}
        <div className={`mt-4 flex items-center gap-2.5 rounded-2xl border px-4 py-3 ${motivColors}`}>
          <MotivIcon className="h-4 w-4 shrink-0" />
          <p className="text-sm font-medium">{motivText}</p>
        </div>
      </header>

      {/* Summary cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Requests card */}
        <div className="rounded-2xl border border-[#DCE9E6] bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Requests today</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950 dark:text-white">
            {requests.length}<span className="text-lg font-normal text-slate-400">/{cfg.requestsTarget}</span>
          </p>
          <div className="mt-3 flex items-center justify-between">
            <Badge tone={requests.length >= cfg.requestsTarget ? "success" : requests.length > 0 ? "warning" : "default"}>
              {requests.length >= cfg.requestsTarget ? "On target" : requests.length > 0 ? "In progress" : "Not started"}
            </Badge>
            <Link href="#requests-section" className="flex items-center gap-1 text-xs font-semibold text-slate-400 transition hover:text-[#0B4F4B] hover:underline dark:hover:text-[#8FD4C6]">
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Meetings card */}
        <div className="rounded-2xl border border-[#DCE9E6] bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Meetings today</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950 dark:text-white">
            {meetingsToday}<span className="text-lg font-normal text-slate-400">/{cfg.meetingsTarget}</span>
          </p>
          <div className="mt-3 flex items-center justify-between">
            <Badge tone={meetingsToday >= cfg.meetingsTarget ? "success" : meetingsToday > 0 ? "warning" : "default"}>
              {meetingsToday >= cfg.meetingsTarget ? "On target" : meetingsToday > 0 ? "In progress" : "Not started"}
            </Badge>
            <Link href="#meetings-section" className="flex items-center gap-1 text-xs font-semibold text-slate-400 transition hover:text-[#0B4F4B] hover:underline dark:hover:text-[#8FD4C6]">
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Tasks progress */}
        <div className="rounded-2xl border border-[#DCE9E6] bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Daily tasks</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950 dark:text-white">
            {doneCount}<span className="text-lg font-normal text-slate-400">/4</span>
          </p>
          <div className="mt-3">
            <div className="mb-1.5 flex justify-between text-xs text-slate-400">
              <span>{doneCount === 4 ? "All done!" : `${4 - doneCount} remaining`}</span>
              <span>{Math.round((doneCount / 4) * 100)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full rounded-full bg-[#0B4F4B] transition-all" style={{ width: `${(doneCount / 4) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Task list */}
      <div className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Today&apos;s Tasks</h2>
        <div className="overflow-hidden rounded-2xl border border-[#DCE9E6] bg-white dark:border-slate-800 dark:bg-slate-900">
          {tasks.map((task, idx) => {
            const isExtra = !!task.extraId;
            const iconKey = isExtra ? "extra" : (task.key as string);
            const TaskIcon = TASK_ICONS[iconKey] ?? AlertTriangle;
            return (
            <div key={task.key} className={`flex items-center gap-4 px-5 py-4 ${task.priority && !task.done ? "bg-amber-50 dark:bg-amber-950/20" : ""} ${idx < tasks.length - 1 ? "border-b border-[#DCE9E6] dark:border-slate-800" : ""}`}>
              {/* Icon + status */}
              <div className="relative shrink-0">
                <div className={`grid h-10 w-10 place-items-center rounded-xl ${task.done ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400" : task.priority ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" : "bg-[#E8F3F1] text-[#0B4F4B] dark:bg-[#133E3C] dark:text-[#8FD4C6]"}`}>
                  {task.done ? <Check className="h-5 w-5" /> : <TaskIcon className="h-5 w-5" />}
                </div>
                <span className={`absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${task.done ? "bg-emerald-500 text-white" : task.priority ? "bg-amber-500 text-white" : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300"}`}>
                  {task.num}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={`text-sm font-semibold ${task.done ? "text-slate-400 line-through" : "text-slate-900 dark:text-white"}`}>{task.title}</p>
                  {task.priority && !task.done && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-950 dark:text-amber-300">Priority</span>
                  )}
                  {task.dueTime && !task.done && (
                    <span className="text-xs font-medium text-rose-500">Due {task.dueTime}</span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  {task.key !== "knowledge" && task.done && task.completedAt ? `Completed at ${completedAt(task.completedAt)}` : task.desc}
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                {task.key === "knowledge" && knowledgeCount > 0 && (
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${knowledgeDone ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"}`}>
                    {knowledgeDone ? knowledgeCount : `${knowledgeCount}/${cfg.knowledgeTarget}`}
                  </span>
                )}
                {task.key === "knowledge" ? (
                  <Button size="sm" onClick={() => setModal("knowledge")}>
                    {knowledgeCount > 0 ? "Add more" : "Start"} <ChevronRight className="h-3 w-3" />
                  </Button>
                ) : isExtra ? (
                  task.done ? null : (
                    <Button
                      size="sm"
                      onClick={() => {
                        acknowledgeExtraTask(task.extraId!);
                        setLive(prev => ({ ...prev, extraTasks: prev.extraTasks.map(t => t.id === task.extraId ? { ...t, acknowledged: true } : t) }));
                      }}
                    >
                      Done <Check className="h-3 w-3" />
                    </Button>
                  )
                ) : task.done ? null : (
                  <Button
                    size="sm"
                    onClick={() => task.customId ? setCustomTaskModal(task.customId) : setModal(task.key)}
                    className={task.lockMode ? "border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-200 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300 dark:hover:bg-amber-900" : ""}
                    variant={task.lockMode ? "outline" : "default"}
                  >
                    {task.lockMode && <Lock className="h-3 w-3" />}
                    Start <ChevronRight className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
            );
          })}
        </div>
      </div>

      {/* Performance evaluations from management — bonuses/deductions only */}
      {adjustments.length > 0 && (
        <div className="rounded-2xl border border-[#DCE9E6] bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
          <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Performance evaluation</p>
          <div className="flex flex-wrap gap-2">
            {adjustments.map(a => {
              const isBonus = a.kind === "bonus";
              const label = `${a.days}d`;
              const aTime = completedAt(a.createdAt);
              return (
                <div
                  key={a.id}
                  className={`flex min-w-0 items-center gap-2 rounded-xl px-3 py-2 text-xs ${isBonus ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-rose-50 dark:bg-rose-950/40"}`}
                >
                  <span className={`shrink-0 text-sm font-black leading-none ${isBonus ? "text-emerald-500" : "text-rose-400"}`}>
                    {isBonus ? "★" : "▼"}
                  </span>
                  <span className="font-medium text-slate-700 dark:text-slate-200" dir={/[؀-ۿ]/.test(a.note) ? "rtl" : "ltr"}>
                    {a.note}
                  </span>
                  <span className={`shrink-0 text-[10px] text-slate-400`}>{aTime}</span>
                  <span className={`ml-1 shrink-0 rounded-full px-2 py-0.5 font-semibold ${isBonus ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" : "bg-rose-100 text-rose-600 dark:bg-rose-900 dark:text-rose-300"}`}>
                    {isBonus ? "+" : "−"}{label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Requests & Meetings unified card */}
      <div className="overflow-hidden rounded-2xl border border-[#DCE9E6] bg-white dark:border-slate-800 dark:bg-slate-900">

        {/* ── Requests section ── */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            Today&apos;s Requests
            <span className="ml-2 rounded-full bg-[#E8F3F1] px-2 py-0.5 text-[10px] font-bold text-[#0B4F4B] dark:bg-[#0B2927] dark:text-[#8FD4C6]">
              {requests.length}/{cfg.requestsTarget}
            </span>
          </h2>
          <button onClick={() => setModal("request")} className="flex items-center gap-1 text-xs font-semibold text-[#0B4F4B] hover:underline dark:text-[#8FD4C6]">
            <Plus className="h-3 w-3" /> New
          </button>
        </div>
        {requests.length === 0 ? (
          <div className="px-5 pb-5 text-center">
            <p className="text-sm text-slate-400">No requests submitted yet today.</p>
            <p className="mt-0.5 text-xs text-slate-400">Target: {cfg.requestsTarget} per day</p>
            <Button size="sm" className="mt-3" onClick={() => setModal("request")}><Plus className="h-3.5 w-3.5" /> Submit First Request</Button>
          </div>
        ) : (
          <div className="space-y-2 px-4 pb-4">
            {requests.map((req, idx) => (
              <div key={req.id} className="rounded-xl border border-[#DCE9E6] bg-[#F5F8F7] p-3 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-400">Request #{idx + 1}</p>
                    <p className="font-semibold text-slate-900 dark:text-white">{req.clientName}</p>
                    <p className="text-xs text-slate-500">{req.clientNumber} · {req.leadSource}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-[#0B4F4B] dark:text-[#8FD4C6]">{req.budget}</p>
                    <p className="text-xs text-slate-400">{completedAt(req.submittedAt)}</p>
                  </div>
                </div>
                {req.feedback && <p className="mt-2 border-t border-[#DCE9E6] pt-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">{req.feedback}</p>}
              </div>
            ))}
          </div>
        )}

        {/* ── Divider ── */}
        <div className="border-t border-[#DCE9E6] dark:border-slate-700" />

        {/* ── Meetings section ── */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            Today&apos;s Meetings
            <span className="ml-2 rounded-full bg-[#E8F3F1] px-2 py-0.5 text-[10px] font-bold text-[#0B4F4B] dark:bg-[#0B2927] dark:text-[#8FD4C6]">
              {todayVisits.length}/{cfg.meetingsTarget}
            </span>
          </h2>
          <button onClick={() => setModal("meeting")} className="flex items-center gap-1 text-xs font-semibold text-[#0B4F4B] hover:underline dark:text-[#8FD4C6]">
            <Plus className="h-3 w-3" /> New
          </button>
        </div>
        {todayVisits.length === 0 ? (
          <div className="px-5 pb-5 text-center">
            <p className="text-sm text-slate-400">No meetings logged yet today.</p>
            <p className="mt-0.5 text-xs text-slate-400">Target: {cfg.meetingsTarget} per day</p>
            <Button size="sm" className="mt-3" onClick={() => setModal("meeting")}><Plus className="h-3.5 w-3.5" /> Log First Meeting</Button>
          </div>
        ) : (
          <div className="space-y-2 px-4 pb-4">
            {todayVisits.map((v, idx) => (
              <div key={v.id} className="rounded-xl border border-[#DCE9E6] bg-[#F5F8F7] p-3 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-400">Meeting #{idx + 1} · {v.time}</p>
                    <p className="font-semibold text-slate-900 dark:text-white">{v.clientName}</p>
                    <p className="text-xs text-slate-500">{v.projectName}{v.meetingLocation ? ` · ${v.meetingLocation}` : ""}</p>
                  </div>
                  <span className={`mt-0.5 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${v.status === "approved" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : v.status === "rejected" ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"}`}>
                    {v.status === "approved" ? "Approved" : v.status === "rejected" ? "Rejected" : "Pending"}
                  </span>
                </div>
                {v.notes && <p className="mt-2 border-t border-[#DCE9E6] pt-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">{v.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {modal === "ads" && (
        <Modal title="Ads & WhatsApp Campaign" onClose={() => setModal(null)}>
          <AdsTaskForm date={today} onDone={() => setModal(null)} linkCount={cfg.ads.linkCount} />
        </Modal>
      )}
      {modal === "knowledge" && (
        <Modal title="Projects in Market" onClose={() => setModal(null)}>
          <KnowledgeTaskForm date={today} onDone={() => setModal(null)} fieldCfg={cfg.knowledge.fields} />
        </Modal>
      )}
      {modal === "calls" && (
        <Modal title="Calls" onClose={() => setModal(null)}>
          <CallsTaskForm date={today} onDone={() => setModal(null)} />
        </Modal>
      )}
      {modal === "rotation" && (
        <Modal title="Rotation" onClose={() => setModal(null)}>
          <RotationTaskForm date={today} onDone={() => setModal(null)} />
        </Modal>
      )}
      {modal === "request" && (
        <Modal title="New Client Request" onClose={() => setModal(null)}>
          <RequestForm date={today} onDone={() => setModal(null)} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {modal === "meeting" && (
        <Modal title="Log a Meeting" onClose={() => setModal(null)}>
          <MeetingForm date={today} onDone={() => setModal(null)} onCancel={() => setModal(null)} />
        </Modal>
      )}

      {/* Custom task modals */}
      {customTaskModal && (() => {
        const task = cfg.customTasks.find(t => t.id === customTaskModal);
        if (!task) return null;
        if (task.lockMode) {
          return (
            <PriorityAssessmentModal
              task={task}
              date={today}
              onDone={() => { setCustomTaskModal(null); }}
            />
          );
        }
        return (
          <Modal title={task.labelEn} onClose={() => setCustomTaskModal(null)}>
            <CustomTaskAckModal task={task} date={today} onDone={() => setCustomTaskModal(null)} />
          </Modal>
        );
      })()}
    </div>
  );
}
