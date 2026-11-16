"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Check, ChevronRight, Mic, MicOff, Phone, Plus, X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  addDailyTask, addCRMRequest, detectSocialPlatform, isValidSocialUrl,
  onCRMChanged, requestsForEmployeeOnDate, taskForEmployeeOnDate,
  DAILY_REQUESTS_TARGET, LEAD_SOURCES,
  type AdsTaskData, type CallsTaskData, type KnowledgeTaskData,
  type ProjectAssessment, type RotationTaskData,
} from "@/lib/crm-store";
import { loadRequests } from "@/lib/requests-store";
import { employees } from "@/lib/mock-data";

// ── Demo identity ─────────────────────────────────────────────────────────────
const ME_ID = "ahmed-khalil";
const ME_NAME = "Ahmed Khalil";

// ── Helpers ───────────────────────────────────────────────────────────────────
function todayISO() { return new Date().toISOString().slice(0, 10); }

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
function AdsTaskForm({ date, onDone }: { date: string; onDone: () => void }) {
  const [urls, setUrls] = useState(["", "", ""]);
  const [confirmed, setConfirmed] = useState([false, false, false]);
  const [submitting, setSubmitting] = useState(false);

  const platforms = urls.map(u => detectSocialPlatform(u));
  const valids = urls.map(u => isValidSocialUrl(u));
  const canSubmit = valids.every(Boolean) && confirmed.every(Boolean);

  function setUrl(i: number, v: string) { setUrls(prev => prev.map((u, idx) => idx === i ? v : u)); }
  function setConf(i: number, v: boolean) { setConfirmed(prev => prev.map((c, idx) => idx === i ? v : c)); }

  function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    const data: AdsTaskData = {
      urls,
      confirmedToday: true,
      platform: platforms.filter(Boolean) as string[],
    };
    addDailyTask({ employeeId: ME_ID, employeeName: ME_NAME, date, taskType: "ads", data });
    onDone();
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Submit 3 social media posts or WhatsApp campaign links from <b>today</b>. Each URL must be from a recognised platform and confirmed as posted today.
      </p>
      {[0, 1, 2].map(i => (
        <div key={i} className="rounded-2xl border border-[#DCE9E6] bg-[#F5F8F7] p-4 dark:border-slate-700 dark:bg-slate-800">
          <p className={labelCls}>Link {i + 1}</p>
          <input
            type="url"
            placeholder="https://facebook.com/post/..."
            value={urls[i]}
            onChange={e => setUrl(i, e.target.value)}
            className={inputCls}
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs">
              {urls[i] && valids[i] ? (
                <span className="font-semibold text-[#0B4F4B] dark:text-[#8FD4C6]">{platforms[i]}</span>
              ) : urls[i] ? (
                <span className="text-rose-500">Not a recognised social media URL</span>
              ) : (
                <span className="text-slate-400">Platform detected automatically</span>
              )}
            </span>
            {valids[i] && (
              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={confirmed[i]}
                  onChange={e => setConf(i, e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#0B4F4B] accent-[#0B4F4B]"
                />
                Posted today
              </label>
            )}
          </div>
        </div>
      ))}
      <div className="flex justify-end gap-3 border-t border-[#DCE9E6] pt-4 dark:border-slate-700">
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
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
  salesName: ME_NAME, date: todayISO(), companyName: "", projectName: "",
  managementAndOperations: "", owner: "", investorType: "", previousWork: "",
  location: "", projectArea: "", finishingType: "", projectDetails: "",
  unitTypes: "", maintenance: "", deliveryDate: "",
};

function KnowledgeTaskForm({ date, onDone }: { date: string; onDone: () => void }) {
  const [form, setForm] = useState<ProjectAssessment>({ ...EMPTY_ASSESSMENT, salesName: ME_NAME, date });
  const [voiceLang, setVoiceLang] = useState<"ar" | "en">("ar");
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [voiceSupported, setVoiceSupported] = useState(true);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);

  useEffect(() => {
    setVoiceSupported(!!(window.SpeechRecognition || window.webkitSpeechRecognition));
  }, []);

  function set(key: keyof ProjectAssessment, val: string) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

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
    recognitionRef.current = rec;
    setIsRecording(true);
  }

  function stopRecording() {
    recognitionRef.current?.stop();
    setIsRecording(false);
  }

  const requiredFields: (keyof ProjectAssessment)[] = ["companyName", "projectName", "location"];
  const canSubmit = requiredFields.every(f => form[f].trim());

  function handleSubmit() {
    if (!canSubmit) return;
    const data: KnowledgeTaskData = {
      assessment: form,
      voiceNoteTranscript: transcript || undefined,
      voiceNoteLanguage: transcript ? voiceLang : undefined,
    };
    addDailyTask({ employeeId: ME_ID, employeeName: ME_NAME, date, taskType: "knowledge", data });
    onDone();
  }

  function Field({ label, k, placeholder, multiline }: { label: string; k: keyof ProjectAssessment; placeholder?: string; multiline?: boolean }) {
    return (
      <div>
        <label className={labelCls}>{label}</label>
        {multiline ? (
          <textarea rows={3} value={form[k]} onChange={e => set(k, e.target.value)} placeholder={placeholder}
            className={`${inputCls} resize-none`} />
        ) : (
          <input type="text" value={form[k]} onChange={e => set(k, e.target.value)} placeholder={placeholder} className={inputCls} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Voice note */}
      <div className="rounded-2xl border border-[#DCE9E6] bg-[#F5F8F7] p-5 dark:border-slate-700 dark:bg-slate-800">
        <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Voice Note <span className="ml-1 font-normal text-slate-400">(optional)</span></p>
        {voiceSupported ? (
          <>
            <div className="mb-3 flex items-center gap-3">
              <span className={labelCls + " mb-0"}>Language</span>
              {(["ar", "en"] as const).map(l => (
                <label key={l} className="flex cursor-pointer items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300">
                  <input type="radio" name="voiceLang" value={l} checked={voiceLang === l} onChange={() => setVoiceLang(l)}
                    className="accent-[#0B4F4B]" />
                  {l === "ar" ? "Arabic" : "English"}
                </label>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${isRecording ? "bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-950 dark:text-rose-300" : "bg-[#0B4F4B] text-white hover:bg-[#063C39]"}`}
              >
                {isRecording ? <><MicOff className="h-4 w-4" /> Stop Recording</> : <><Mic className="h-4 w-4" /> Start Recording</>}
              </button>
              {isRecording && <span className="flex items-center gap-1.5 text-xs font-medium text-rose-600"><span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" /> Recording…</span>}
            </div>
            {transcript && (
              <div className="mt-3 rounded-xl border border-[#DCE9E6] bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Transcript</p>
                <p className={`text-sm leading-6 text-slate-700 dark:text-slate-200 ${voiceLang === "ar" ? "text-right" : ""}`} dir={voiceLang === "ar" ? "rtl" : "ltr"}>{transcript}</p>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-400">Voice recording requires Chrome or Edge browser.</p>
        )}
      </div>

      {/* Project Assessment form */}
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#0B4F4B] dark:text-[#8FD4C6]">Project Assessment</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company Name *" k="companyName" placeholder="Developer / company name" />
          <Field label="Project Name *" k="projectName" placeholder="Project name" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Management & Operations" k="managementAndOperations" placeholder="Management entity" />
          <Field label="Owner" k="owner" placeholder="Owner name" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Investor Type" k="investorType" placeholder="e.g. Individual, Corporate" />
          <Field label="Previous Work" k="previousWork" placeholder="Developer's previous projects" />
        </div>
        <Field label="Location *" k="location" placeholder="Project location" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Project Area" k="projectArea" placeholder="Total area (m²)" />
          <Field label="Finishing Type" k="finishingType" placeholder="e.g. Fully finished, Core & shell" />
        </div>
        <Field label="Project Details" k="projectDetails" placeholder="Key project details…" multiline />
        <Field label="Unit Types, Prices & Areas" k="unitTypes" placeholder="e.g. 2BR from EGP 2.5M (100–130 m²)…" multiline />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Maintenance" k="maintenance" placeholder="Maintenance fee / policy" />
          <Field label="Delivery Date" k="deliveryDate" placeholder="Expected delivery" />
        </div>
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

// ── Task 3: Calls ─────────────────────────────────────────────────────────────
function CallsTaskForm({ date, onDone }: { date: string; onDone: () => void }) {
  const [fresh, setFresh] = useState("");
  const [old, setOld] = useState("");
  const [delay, setDelay] = useState("");

  const freshN = parseInt(fresh) || 0;
  const oldN = parseInt(old) || 0;
  const delayN = parseInt(delay) || 0;
  const total = freshN + oldN + delayN;
  const canSubmit = fresh !== "" && old !== "" && delay !== "";

  function handleSubmit() {
    if (!canSubmit) return;
    const data: CallsTaskData = { freshCalls: freshN, oldCalls: oldN, delayCalls: delayN };
    addDailyTask({ employeeId: ME_ID, employeeName: ME_NAME, date, taskType: "calls", data });
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

  function toggle(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function handleSubmit() {
    const names = SALES_TEAM.filter(e => selected.includes(e.id)).map(e => e.name);
    const data: RotationTaskData = { rotatedWithIds: selected, rotatedWithNames: names, notes };
    addDailyTask({ employeeId: ME_ID, employeeName: ME_NAME, date, taskType: "rotation", data });
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
        <Button onClick={handleSubmit}>
          <Check className="h-4 w-4" /> Mark Complete
        </Button>
      </div>
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
            {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
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

// ── Main workspace ────────────────────────────────────────────────────────────
type ModalType = "ads" | "knowledge" | "calls" | "rotation" | "request" | null;

export function CRMTasksWorkspace() {
  const [today] = useState(todayISO);
  const [modal, setModal] = useState<ModalType>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const unsub = onCRMChanged(() => setTick(t => t + 1));
    return unsub;
  }, []);

  const requests = requestsForEmployeeOnDate(ME_ID, today);
  const adsTask = taskForEmployeeOnDate(ME_ID, today, "ads");
  const knowledgeTask = taskForEmployeeOnDate(ME_ID, today, "knowledge");
  const callsTask = taskForEmployeeOnDate(ME_ID, today, "calls");
  const rotationTask = taskForEmployeeOnDate(ME_ID, today, "rotation");
  const meetingsToday = countMeetingsToday(today);

  void tick;

  const tasks = [
    {
      key: "ads" as const,
      num: 1,
      title: "Ads & WhatsApp Campaign",
      desc: "Submit 3 social media links posted today",
      done: !!adsTask,
      completedAt: adsTask?.completedAt,
    },
    {
      key: "knowledge" as const,
      num: 2,
      title: "Knowledge",
      desc: "Complete a project assessment form",
      done: !!knowledgeTask,
      completedAt: knowledgeTask?.completedAt,
    },
    {
      key: "calls" as const,
      num: 3,
      title: "Calls",
      desc: "Log your call activity by category",
      done: !!callsTask,
      completedAt: callsTask?.completedAt,
    },
    {
      key: "rotation" as const,
      num: 4,
      title: "Rotation",
      desc: "Log team rotation and add notes",
      done: !!rotationTask,
      completedAt: rotationTask?.completedAt,
    },
  ];

  const doneCount = tasks.filter(t => t.done).length;

  return (
    <div className="pb-10">
      {/* Header */}
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0B4F4B] dark:text-[#8FD4C6]">CRM</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white sm:text-4xl">Daily Tasks</h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{friendlyDate(today)}</p>
      </header>

      {/* Summary cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Requests card */}
        <div className="rounded-2xl border border-[#DCE9E6] bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Requests today</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950 dark:text-white">
            {requests.length}<span className="text-lg font-normal text-slate-400">/{DAILY_REQUESTS_TARGET}</span>
          </p>
          <div className="mt-3 flex items-center justify-between">
            <Badge tone={requests.length >= DAILY_REQUESTS_TARGET ? "success" : requests.length > 0 ? "warning" : "default"}>
              {requests.length >= DAILY_REQUESTS_TARGET ? "On target" : requests.length > 0 ? "In progress" : "Not started"}
            </Badge>
            <button onClick={() => setModal("request")} className="flex items-center gap-1 text-xs font-semibold text-[#0B4F4B] transition hover:underline dark:text-[#8FD4C6]">
              <Plus className="h-3 w-3" /> New
            </button>
          </div>
        </div>

        {/* Meetings card */}
        <div className="rounded-2xl border border-[#DCE9E6] bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Meeting today</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950 dark:text-white">
            {meetingsToday}<span className="text-lg font-normal text-slate-400">/1</span>
          </p>
          <div className="mt-3 flex items-center justify-between">
            <Badge tone={meetingsToday >= 1 ? "success" : "default"}>
              {meetingsToday >= 1 ? "On target" : "Not submitted"}
            </Badge>
            <Link href="/meetings" className="flex items-center gap-1 text-xs font-semibold text-[#0B4F4B] transition hover:underline dark:text-[#8FD4C6]">
              Go <ChevronRight className="h-3 w-3" />
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
          {tasks.map((task, idx) => (
            <div key={task.key} className={`flex items-center gap-4 px-5 py-4 ${idx < tasks.length - 1 ? "border-b border-[#DCE9E6] dark:border-slate-800" : ""}`}>
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${task.done ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}>
                {task.done ? <Check className="h-4 w-4" /> : task.num}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${task.done ? "text-slate-400 line-through" : "text-slate-900 dark:text-white"}`}>{task.title}</p>
                <p className="text-xs text-slate-400">
                  {task.done && task.completedAt ? `Completed at ${completedAt(task.completedAt)}` : task.desc}
                </p>
              </div>
              <div className="shrink-0">
                {task.done ? (
                  <Badge tone="success">Done</Badge>
                ) : (
                  <Button size="sm" onClick={() => setModal(task.key)}>
                    Start <ChevronRight className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Today's requests list */}
      {requests.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Today&apos;s Requests</h2>
          <div className="space-y-3">
            {requests.map((req, idx) => (
              <div key={req.id} className="rounded-2xl border border-[#DCE9E6] bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
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
        </div>
      )}

      {/* Add request CTA if none yet */}
      {requests.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#DCE9E6] bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No requests submitted yet today</p>
          <p className="mt-1 text-sm text-slate-400">Your target is {DAILY_REQUESTS_TARGET} client requests per day.</p>
          <Button className="mt-4" onClick={() => setModal("request")}><Plus className="h-4 w-4" /> Submit First Request</Button>
        </div>
      )}

      {/* Modals */}
      {modal === "ads" && (
        <Modal title="Ads & WhatsApp Campaign" onClose={() => setModal(null)}>
          <AdsTaskForm date={today} onDone={() => setModal(null)} />
        </Modal>
      )}
      {modal === "knowledge" && (
        <Modal title="Knowledge — Project Assessment" onClose={() => setModal(null)}>
          <KnowledgeTaskForm date={today} onDone={() => setModal(null)} />
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
    </div>
  );
}
