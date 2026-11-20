"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleSlash,
  ClipboardList,
  ExternalLink,
  Megaphone,
  Mic,
  MicOff,
  Plus,
  RefreshCw,
  Settings2,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { UnitTableEditor, emptyUnitRow, unitRowHasContent } from "@/components/ui/unit-table-editor";
import { employees } from "@/lib/mock-data";
import {
  DAILY_MEETING_TARGET,
  DAILY_REQUESTS_TARGET,
  LEAD_SOURCE_GROUPS,
  addCRMRequest,
  addDailyTask,
  addExtraTask,
  deleteExtraTask,
  detectSocialPlatform,
  getDayPerformance,
  isValidSocialUrl,
  loadCRMRequests,
  loadExtraTasks,
  onCRMChanged,
  requestsForEmployeeOnDate,
  taskForEmployeeOnDate,
  type CRMRequest,
  type ExtraTask,
  type KnowledgeTaskData,
  type ProjectAssessment,
} from "@/lib/crm-store";
import { outsideMeetingRequests } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────

function today() { return new Date().toISOString().split("T")[0]; }
function fmt(iso: string) { return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso)); }
function fmtDate(d: string) { return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(d + "T12:00:00")); }

const salesEmployees = employees.filter(e =>
  e.department === "Sales"
);
const managerRoles = ["CEO", "Sales Manager", "Operations Admin", "Finance Analyst"];

function isMgr(role: string) { return managerRoles.some(r => role.includes(r) || role === r); }

// Count meetings submitted (synthetic: use outsideMeetingRequests for demo)
function meetingsOnDate(employeeId: string, date: string): number {
  const emp = employees.find(e => e.id === employeeId);
  if (!emp) return 0;
  return outsideMeetingRequests.filter(m => m.employeeName === emp.name && m.date === date).length;
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-[#DCE9E6] bg-white p-5 dark:border-slate-800 dark:bg-slate-900", className)}>
      {children}
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "good" | "warn" | "muted" }) {
  const col = tone === "good" ? "text-[#0B4F4B] dark:text-[#8FD4C6]" : tone === "warn" ? "text-amber-600" : "text-slate-950 dark:text-white";
  return (
    <Card>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cn("mt-2 text-2xl font-semibold", col)}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </Card>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 items-start">
      <label className="pt-2.5 text-sm text-slate-500">{label}</label>
      <div>{children}</div>
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-xl border border-[#DCE9E6] bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B4F4B]/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100",
        props.className,
      )}
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      rows={props.rows ?? 3}
      className={cn(
        "w-full rounded-xl border border-[#DCE9E6] bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B4F4B]/30 resize-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100",
        props.className,
      )}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "w-full rounded-xl border border-[#DCE9E6] bg-white px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B4F4B]/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100",
        props.className,
      )}
    />
  );
}

function Btn({
  children, onClick, disabled, variant = "primary", size = "md", className,
}: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean;
  variant?: "primary" | "ghost" | "danger"; size?: "sm" | "md"; className?: string;
}) {
  const base = "inline-flex items-center gap-2 font-semibold rounded-xl transition disabled:opacity-40 disabled:pointer-events-none";
  const sz = size === "sm" ? "px-3 py-1.5 text-xs" : "px-5 py-2.5 text-sm";
  const v = variant === "primary"
    ? "bg-[#0B4F4B] text-white hover:bg-[#0a3f3b]"
    : variant === "danger"
      ? "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950 dark:text-red-400"
      : "border border-[#DCE9E6] text-slate-600 hover:bg-[#E8F3F1] hover:text-[#0B4F4B] dark:border-slate-700 dark:text-slate-300";
  return <button onClick={onClick} disabled={disabled} className={cn(base, sz, v, className)}>{children}</button>;
}

function TaskBadge({ done }: { done: boolean }) {
  return done
    ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" />Done</span>
    : <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600"><CircleSlash className="h-3.5 w-3.5" />Pending</span>;
}

// ── Voice Note ────────────────────────────────────────────────────────────────

function VoiceNoteInput({ onTranscript }: { onTranscript: (text: string, lang: "ar" | "en") => void }) {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const [error, setError] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const accRef = useRef("");

  const supported = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const start = useCallback(() => {
    if (!supported) { setError("Voice recording is not supported in this browser. Use Chrome or Edge."); return; }
    setError("");
    accRef.current = "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = (w.SpeechRecognition || w.webkitSpeechRecognition) as new () => {
      lang: string; continuous: boolean; interimResults: boolean;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onresult: ((e: any) => void) | null;
      onerror: (() => void) | null;
      onend: (() => void) | null;
      start(): void;
      stop(): void;
    };
    const rec = new SR();
    rec.lang = lang === "ar" ? "ar-EG" : "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript as string;
        if (e.results[i].isFinal) final += t + " ";
        else interim += t;
      }
      accRef.current += final;
      setTranscript(accRef.current + interim);
    };
    rec.onerror = () => { setError("Microphone error. Please allow microphone access and try again."); setRecording(false); };
    rec.onend = () => setRecording(false);
    recognitionRef.current = rec;
    rec.start();
    setRecording(true);
  }, [supported, lang]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setRecording(false);
  }, []);

  const save = () => {
    if (!transcript.trim()) return;
    onTranscript(transcript.trim(), lang);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div role="group" className="flex gap-1 rounded-xl border border-[#DCE9E6] p-1 dark:border-slate-700">
          {(["ar", "en"] as const).map(l => (
            <button key={l} onClick={() => { if (!recording) setLang(l); }}
              className={cn("rounded-lg px-3 py-1 text-xs font-semibold transition", lang === l ? "bg-[#0B4F4B] text-white" : "text-slate-500 hover:text-[#0B4F4B]")}>
              {l === "ar" ? "العربية" : "English"}
            </button>
          ))}
        </div>
        {recording
          ? <Btn variant="danger" size="sm" onClick={stop}><MicOff className="h-3.5 w-3.5" />Stop recording</Btn>
          : <Btn variant="ghost" size="sm" onClick={start}><Mic className="h-3.5 w-3.5" />Start recording</Btn>
        }
        {recording && <span className="animate-pulse text-xs text-red-500 font-semibold">● REC</span>}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {transcript && (
        <div className="rounded-xl border border-[#DCE9E6] bg-[#F7FAF9] p-4 text-sm leading-relaxed text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" dir={lang === "ar" ? "rtl" : "ltr"}>
          {transcript}
        </div>
      )}
      {transcript && (
        <div className="flex justify-end">
          <Btn size="sm" onClick={save}>Save transcript</Btn>
        </div>
      )}
    </div>
  );
}

// ── Project Assessment Form ───────────────────────────────────────────────────

const EMPTY_ASSESSMENT: ProjectAssessment = {
  salesName: "", date: today(),
  projectName: "", companyName: "", previousWork: "", location: "",
  projectArea: "", projectDetails: "", unitTable: [],
  paymentPlan: "", finishingType: "", construction: "", deliveryDate: "",
  maintenance: "", investorType: "", managementAndOperations: "",
  termsOfContract: "", sellingPoints: "", weaknessPoints: "", additionalNotes: "",
  owner: "",
};

const FINISHING_OPTIONS = ["Fully Finished Furnished", "Fully Finished", "Semi Finished", "Flexi Finished", "Core, Shell"];
const CONSTRUCTION_OPTIONS = ["Ready", "Off Plan", "Construction in Progress"];

function ProjectAssessmentFormView({
  value, onChange,
}: {
  value: ProjectAssessment;
  onChange: (v: ProjectAssessment) => void;
}) {
  const set = (k: keyof ProjectAssessment) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    onChange({ ...value, [k]: e.target.value });
  const lbl = "mb-1.5 block text-xs font-semibold text-slate-500";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={lbl}>Sales Name *</label>
          <Input value={value.salesName} onChange={set("salesName")} placeholder="Your name" required />
        </div>
        <div>
          <label className={lbl}>Date *</label>
          <DatePicker required value={value.date} onChange={v => set("date")({ target: { value: v } } as React.ChangeEvent<HTMLInputElement>)} />
        </div>
        <div>
          <label className={lbl}>Project Name *</label>
          <Input value={value.projectName} onChange={set("projectName")} placeholder="Project name" required />
        </div>
        <div>
          <label className={lbl}>Company Name *</label>
          <Input value={value.companyName} onChange={set("companyName")} placeholder="Developer company name" required />
        </div>
        <div>
          <label className={lbl}>Location *</label>
          <Input value={value.location} onChange={set("location")} placeholder="Compound / district / city" required />
        </div>
        <div>
          <label className={lbl}>Project Acres *</label>
          <Input value={value.projectArea} onChange={set("projectArea")} placeholder="e.g. 50 feddan" required />
        </div>
        <div className="sm:col-span-2">
          <label className={lbl}>Unit Types, Areas &amp; Prices *</label>
          <UnitTableEditor
            rows={value.unitTable ?? []}
            onRow={(idx, patch) => {
              const rows = [...(value.unitTable ?? [])];
              rows[idx] = { ...rows[idx], ...patch };
              onChange({ ...value, unitTable: rows });
            }}
            onAdd={() => onChange({ ...value, unitTable: [...(value.unitTable ?? []), emptyUnitRow()] })}
            onRemove={idx => {
              const rows = (value.unitTable ?? []).filter((_, i) => i !== idx);
              onChange({ ...value, unitTable: rows.length ? rows : [emptyUnitRow()] });
            }}
          />
        </div>
        <div>
          <label className={lbl}>Payment Plan *</label>
          <Input value={value.paymentPlan} onChange={set("paymentPlan")} placeholder="e.g. 10% down, 5y installments" required />
        </div>
        <div>
          <label className={lbl}>Finishing Type *</label>
          <select value={value.finishingType} onChange={set("finishingType")}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#0B4F4B] focus:outline-none focus:ring-2 focus:ring-[#0B4F4B]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" required>
            <option value="">— Select —</option>
            {FINISHING_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Construction *</label>
          <select value={value.construction} onChange={set("construction")}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#0B4F4B] focus:outline-none focus:ring-2 focus:ring-[#0B4F4B]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" required>
            <option value="">— Select —</option>
            {CONSTRUCTION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Delivery Date *</label>
          <Input value={value.deliveryDate} onChange={set("deliveryDate")} placeholder="e.g. Q4 2026" required />
        </div>
        <div>
          <label className={lbl}>Maintenance</label>
          <Input value={value.maintenance} onChange={set("maintenance")} placeholder="Maintenance terms" />
        </div>
        <div>
          <label className={lbl}>Engineering Consultant</label>
          <Input value={value.investorType} onChange={set("investorType")} placeholder="Consultant name" />
        </div>
        <div>
          <label className={lbl}>Management & Operations</label>
          <Input value={value.managementAndOperations} onChange={set("managementAndOperations")} placeholder="Who manages operations?" />
        </div>
        <div>
          <label className={lbl}>Owner</label>
          <Input value={value.owner} onChange={set("owner")} placeholder="Owner / developer name" />
        </div>
      </div>
      <div>
        <label className={lbl}>Previous Projects or Owner History *</label>
        <Textarea value={value.previousWork} onChange={set("previousWork")} placeholder="Developer's completed projects and track record" required />
      </div>
      <div>
        <label className={lbl}>Project Details & Facilities *</label>
        <Textarea rows={4} value={value.projectDetails} onChange={set("projectDetails")} placeholder="Amenities, phases, master plan highlights…" required />
      </div>
      <div>
        <label className={lbl}>Terms of the Operating Contract</label>
        <Textarea rows={3} value={value.termsOfContract} onChange={set("termsOfContract")} placeholder="Key contract terms…" />
      </div>
      <div>
        <label className={lbl}>Selling Points *</label>
        <Textarea rows={3} value={value.sellingPoints} onChange={set("sellingPoints")} placeholder="Key advantages of this project…" required />
      </div>
      <div>
        <label className={lbl}>Weakness Points *</label>
        <Textarea rows={3} value={value.weaknessPoints} onChange={set("weaknessPoints")} placeholder="Known drawbacks or concerns…" required />
      </div>
      <div>
        <label className={lbl}>Additional Notes</label>
        <Textarea rows={3} value={value.additionalNotes} onChange={set("additionalNotes")} placeholder="Any other notes…" />
      </div>
    </div>
  );
}

function assessmentValid(a: ProjectAssessment): boolean {
  const hasUnits = (a.unitTable ?? []).some(unitRowHasContent);
  return !!(a.salesName && a.projectName && a.companyName && a.location && a.projectDetails && hasUnits && a.sellingPoints && a.weaknessPoints);
}

// ── Ads Task ──────────────────────────────────────────────────────────────────

function AdsTaskCard({ employeeId, employeeName, date, onDone }: { employeeId: string; employeeName: string; date: string; onDone: () => void }) {
  const existing = taskForEmployeeOnDate(employeeId, date, "ads");
  const [urls, setUrls] = useState(["", "", ""]);
  const [confirmed, setConfirmed] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  if (existing) {
    const d = existing.data as { urls: string[]; platform: string[] };
    return (
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F3F1] dark:bg-[#133E3C]">
              <Megaphone className="h-5 w-5 text-[#0B4F4B] dark:text-[#8FD4C6]" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">Ads & WhatsApp Campaign</p>
              <TaskBadge done={true} />
            </div>
          </div>
        </div>
        <ul className="mt-4 space-y-2 border-t border-[#DCE9E6] pt-4 dark:border-slate-800">
          {d.urls.map((u, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <span className="rounded bg-[#E8F3F1] px-2 py-0.5 text-xs font-semibold text-[#0B4F4B] dark:bg-[#133E3C] dark:text-[#8FD4C6]">{d.platform?.[i] ?? "Link"}</span>
              <a href={u} target="_blank" rel="noopener noreferrer" className="truncate text-slate-500 hover:underline">{u}</a>
              <ExternalLink className="h-3 w-3 shrink-0 text-slate-400" />
            </li>
          ))}
        </ul>
      </Card>
    );
  }

  const platforms = urls.map(u => detectSocialPlatform(u));
  const urlsValid = urls.every(u => isValidSocialUrl(u));
  const canSubmit = urlsValid && confirmed;

  const submit = () => {
    if (!canSubmit) return;
    setSaving(true);
    addDailyTask({
      employeeId,
      employeeName,
      date,
      taskType: "ads",
      data: { urls, confirmedToday: true, platform: platforms.map(p => p ?? "Link") },
    });
    setSaving(false);
    setOpen(false);
    onDone();
  };

  return (
    <Card>
      <button className="flex w-full items-center justify-between gap-3" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F3F1] dark:bg-[#133E3C]">
            <Megaphone className="h-5 w-5 text-[#0B4F4B] dark:text-[#8FD4C6]" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-slate-900 dark:text-white">Ads & WhatsApp Campaign</p>
            <TaskBadge done={false} />
          </div>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="mt-5 space-y-4 border-t border-[#DCE9E6] pt-5 dark:border-slate-800">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Submit <strong>3 social media posts</strong> you published <strong>today</strong>. Paste the full URL of each post (Facebook, Instagram, TikTok, X, YouTube, etc.).
          </p>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            <AlertTriangle className="mb-1 h-3.5 w-3.5 inline mr-1" />
            Post URLs must be from today. The system cannot automatically verify post dates — your manager may spot-check links.
          </div>
          <div className="space-y-3">
            {urls.map((u, i) => {
              const p = detectSocialPlatform(u);
              const invalid = u.trim() !== "" && !isValidSocialUrl(u);
              return (
                <div key={i} className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Post URL #{i + 1} *</label>
                  <div className="flex gap-2">
                    <Input
                      value={u}
                      onChange={e => setUrls(prev => { const n = [...prev]; n[i] = e.target.value; return n; })}
                      placeholder="https://www.facebook.com/…"
                      className={invalid ? "border-red-400 focus:ring-red-300" : ""}
                    />
                    {p && <span className="whitespace-nowrap self-center rounded-lg bg-[#E8F3F1] px-2 py-1 text-xs font-semibold text-[#0B4F4B] dark:bg-[#133E3C] dark:text-[#8FD4C6]">{p}</span>}
                  </div>
                  {invalid && <p className="text-xs text-red-500">Not a recognised social media URL.</p>}
                </div>
              );
            })}
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-1 h-4 w-4 rounded accent-[#0B4F4B]" />
            <span className="text-sm text-slate-700 dark:text-slate-200">I confirm all 3 posts were published <strong>today, {fmtDate(date)}</strong>, and the links are correct.</span>
          </label>
          <div className="flex justify-end">
            <Btn onClick={submit} disabled={!canSubmit || saving}>
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Submit Ads Task
            </Btn>
          </div>
        </div>
      )}
    </Card>
  );
}

// ── Knowledge Task ────────────────────────────────────────────────────────────

function KnowledgeTaskCard({ employeeId, employeeName, date, onDone }: { employeeId: string; employeeName: string; date: string; onDone: () => void }) {
  const existing = taskForEmployeeOnDate(employeeId, date, "knowledge");
  const [open, setOpen] = useState(false);
  const [assessment, setAssessment] = useState<ProjectAssessment>({ ...EMPTY_ASSESSMENT, salesName: employeeName, date });
  const [transcript, setTranscript] = useState("");
  const [transcriptLang, setTranscriptLang] = useState<"ar" | "en">("ar");
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const canSubmit = assessmentValid(assessment);

  if (existing) {
    const d = existing.data as KnowledgeTaskData;
    return (
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F3F1] dark:bg-[#133E3C]">
              <BookOpen className="h-5 w-5 text-[#0B4F4B] dark:text-[#8FD4C6]" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">Projects in Market</p>
              <TaskBadge done={true} />
            </div>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 border-t border-[#DCE9E6] pt-4 text-sm dark:border-slate-800">
          <div><dt className="text-xs text-slate-400">Project</dt><dd className="font-medium text-slate-900 dark:text-slate-100">{d.assessment.projectName}</dd></div>
          <div><dt className="text-xs text-slate-400">Company</dt><dd className="font-medium">{d.assessment.companyName}</dd></div>
          <div><dt className="text-xs text-slate-400">Location</dt><dd className="font-medium">{d.assessment.location}</dd></div>
          <div><dt className="text-xs text-slate-400">Owner</dt><dd className="font-medium">{d.assessment.owner}</dd></div>
        </dl>
        {d.voiceNoteTranscript && (
          <div className="mt-4 border-t border-[#DCE9E6] pt-4 dark:border-slate-800">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Voice Note Transcript</p>
            <div className="rounded-xl bg-[#F7FAF9] px-4 py-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200" dir={d.voiceNoteLanguage === "ar" ? "rtl" : "ltr"}>
              {d.voiceNoteTranscript}
            </div>
          </div>
        )}
      </Card>
    );
  }

  const submit = () => {
    if (!canSubmit) return;
    setSaving(true);
    addDailyTask({
      employeeId,
      employeeName,
      date,
      taskType: "knowledge",
      data: {
        assessment,
        voiceNoteTranscript: transcript || undefined,
        voiceNoteLanguage: transcript ? transcriptLang : undefined,
      },
    });
    setSaving(false);
    setOpen(false);
    onDone();
  };

  return (
    <Card>
      <button className="flex w-full items-center justify-between gap-3" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F3F1] dark:bg-[#133E3C]">
            <BookOpen className="h-5 w-5 text-[#0B4F4B] dark:text-[#8FD4C6]" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-slate-900 dark:text-white">Projects in Market</p>
            <TaskBadge done={false} />
          </div>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="mt-5 space-y-6 border-t border-[#DCE9E6] pt-5 dark:border-slate-800">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Complete the project assessment form for a property you&apos;ve studied today. All starred fields are required.
          </p>
          <ProjectAssessmentFormView value={assessment} onChange={setAssessment} />

          {/* Voice note section */}
          <div className="rounded-2xl border border-[#DCE9E6] p-4 dark:border-slate-700">
            <button className="flex w-full items-center justify-between" onClick={() => setVoiceOpen(o => !o)}>
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-[#0B4F4B]" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Voice Note (optional)</span>
                {transcript && <Badge tone="success">Transcript saved</Badge>}
              </div>
              <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", voiceOpen && "rotate-180")} />
            </button>
            {voiceOpen && (
              <div className="mt-4 border-t border-[#DCE9E6] pt-4 dark:border-slate-700">
                <p className="mb-3 text-xs text-slate-500">Record a voice note about this project. The system will transcribe it and keep both the text and reference for you.</p>
                <VoiceNoteInput onTranscript={(t, l) => { setTranscript(t); setTranscriptLang(l); }} />
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Btn onClick={submit} disabled={!canSubmit || saving}>
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Submit Assessment
            </Btn>
          </div>
        </div>
      )}
    </Card>
  );
}

// ── My Tasks Tab ──────────────────────────────────────────────────────────────

function MyTasksTab({ employeeId, employeeName, date }: { employeeId: string; employeeName: string; date: string }) {
  const [tick, setTick] = useState(0);
  const refresh = () => setTick(t => t + 1);

  const adsTask = taskForEmployeeOnDate(employeeId, date, "ads");
  const knowledgeTask = taskForEmployeeOnDate(employeeId, date, "knowledge");
  const myRequests = requestsForEmployeeOnDate(employeeId, date);
  const myMeetings = meetingsOnDate(employeeId, date);
  const extraTasks = loadExtraTasks().filter(t => t.targetEmployeeId === employeeId);

  const reqsDone = myRequests.length >= DAILY_REQUESTS_TARGET;
  const meetDone = myMeetings >= DAILY_MEETING_TARGET;
  const allDone = !!adsTask && !!knowledgeTask && reqsDone && meetDone;

  return (
    <div className="space-y-5">
      {/* Summary bar */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Ads Task" value={adsTask ? "✓ Done" : "Pending"} tone={adsTask ? "good" : "warn"} />
        <Stat label="Projects in Market" value={knowledgeTask ? "✓ Done" : "Pending"} tone={knowledgeTask ? "good" : "warn"} />
        <Stat label="Requests" value={`${myRequests.length} / ${DAILY_REQUESTS_TARGET}`} sub="today" tone={reqsDone ? "good" : "warn"} />
        <Stat label="Meeting" value={`${myMeetings} / ${DAILY_MEETING_TARGET}`} sub="submitted" tone={meetDone ? "good" : "warn"} />
      </div>

      {allDone && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          <CheckCircle2 className="mr-2 inline h-4 w-4" />All daily targets completed for {fmtDate(date)}. Great work!
        </div>
      )}

      {!allDone && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <AlertTriangle className="mr-2 inline h-4 w-4" />
          Incomplete tasks are visible to your manager. They do <strong>not</strong> affect your salary automatically — but your manager may review and take action.
        </div>
      )}

      {/* Task cards */}
      <AdsTaskCard key={`ads-${tick}`} employeeId={employeeId} employeeName={employeeName} date={date} onDone={refresh} />
      <KnowledgeTaskCard key={`know-${tick}`} employeeId={employeeId} employeeName={employeeName} date={date} onDone={refresh} />

      {/* Requests progress */}
      <Card>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F3F1] dark:bg-[#133E3C]">
            <ClipboardList className="h-5 w-5 text-[#0B4F4B] dark:text-[#8FD4C6]" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">Client Requests — {myRequests.length} / {DAILY_REQUESTS_TARGET}</p>
            <TaskBadge done={reqsDone} />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          {Array.from({ length: DAILY_REQUESTS_TARGET }).map((_, i) => (
            <div key={i} className={cn("h-2 flex-1 rounded-full", i < myRequests.length ? "bg-[#0B4F4B]" : "bg-slate-200 dark:bg-slate-700")} />
          ))}
        </div>
        {myRequests.length < DAILY_REQUESTS_TARGET && (
          <p className="mt-3 text-xs text-slate-500">Go to <strong>Requests</strong> tab to log a new client request.</p>
        )}
      </Card>

      {/* Meeting progress */}
      <Card>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F3F1] dark:bg-[#133E3C]">
            <UserRound className="h-5 w-5 text-[#0B4F4B] dark:text-[#8FD4C6]" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">Meeting Submission — {myMeetings} / {DAILY_MEETING_TARGET}</p>
            <TaskBadge done={meetDone} />
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">Submit meetings via the <strong>Meetings</strong> section in the sidebar.</p>
      </Card>

      {/* Extra tasks from GM */}
      {extraTasks.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Extra Tasks from Management</h3>
          {extraTasks.map(et => (
            <Card key={et.id} className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">Assigned for {fmtDate(et.assignedDate)}</p>
                  <p className="mt-1 text-sm text-amber-900 dark:text-amber-100">{et.note}</p>
                  {et.deductionDays > 0 && (
                    <p className="mt-1 text-xs font-semibold text-red-600 dark:text-red-400">Deduction: {et.deductionDays} day(s)</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Requests Tab ──────────────────────────────────────────────────────────────

const EMPTY_REQUEST = {
  clientName: "", clientNumber: "", leadSource: "", budget: "", feedback: "",
};

function RequestsTab({ employeeId, employeeName }: { employeeId: string; employeeName: string }) {
  const [requests, setRequests] = useState<CRMRequest[]>([]);
  const [form, setForm] = useState({ ...EMPTY_REQUEST });
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const refresh = () => setRequests(loadCRMRequests().filter(r => r.employeeId === employeeId).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)));
    refresh();
    return onCRMChanged(refresh);
  }, [employeeId]);

  const set = (k: keyof typeof EMPTY_REQUEST) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const canSubmit = form.clientName.trim() && form.clientNumber.trim() && form.leadSource && form.budget.trim() && form.feedback.trim();

  const submit = () => {
    if (!canSubmit) return;
    setSaving(true);
    addCRMRequest({
      employeeId,
      employeeName,
      date: today(),
      ...form,
    });
    setForm({ ...EMPTY_REQUEST });
    setSaving(false);
    setShowForm(false);
  };

  const todayReqs = requests.filter(r => r.date === today());

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Today's requests" value={`${todayReqs.length} / ${DAILY_REQUESTS_TARGET}`} tone={todayReqs.length >= DAILY_REQUESTS_TARGET ? "good" : "warn"} />
        <Stat label="Total submitted" value={String(requests.length)} tone="muted" />
        <Stat label="This month" value={String(requests.filter(r => r.date.startsWith(today().slice(0, 7))).length)} tone="muted" />
      </div>

      {/* New request */}
      <div>
        <Btn onClick={() => setShowForm(o => !o)} variant={showForm ? "ghost" : "primary"}>
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancel" : "New Request"}
        </Btn>
      </div>

      {showForm && (
        <Card>
          <h3 className="mb-5 text-base font-semibold text-slate-900 dark:text-white">New Client Request</h3>
          <div className="space-y-4">
            <FieldRow label="Client Name *">
              <Input value={form.clientName} onChange={set("clientName")} placeholder="Full name" required />
            </FieldRow>
            <FieldRow label="Client Number *">
              <Input value={form.clientNumber} onChange={set("clientNumber")} placeholder="+20 …" required />
            </FieldRow>
            <FieldRow label="Lead Source *">
              <Select value={form.leadSource} onChange={set("leadSource")} required>
                <option value="">Select source…</option>
                {LEAD_SOURCE_GROUPS.map(g => (
                  <optgroup key={g.label} label={g.label}>
                    {g.options.map(s => <option key={s} value={s}>{s}</option>)}
                  </optgroup>
                ))}
              </Select>
            </FieldRow>
            <FieldRow label="Budget *">
              <Input value={form.budget} onChange={set("budget")} placeholder="e.g. EGP 3–5M" required />
            </FieldRow>
            <FieldRow label="Feedback *">
              <Textarea value={form.feedback} onChange={set("feedback")} placeholder="Client's interest, requirements, outcome…" required />
            </FieldRow>
            <div className="flex justify-end pt-2">
              <Btn onClick={submit} disabled={!canSubmit || saving}>
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Submit Request
              </Btn>
            </div>
          </div>
        </Card>
      )}

      {/* Requests list */}
      {requests.length === 0 && !showForm && (
        <Card className="text-center py-10">
          <ClipboardList className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-700 dark:text-slate-200">No requests yet</p>
          <p className="mt-1 text-sm text-slate-500">Log your first client request above.</p>
        </Card>
      )}

      <ul className="grid gap-4 lg:grid-cols-2">
        {requests.map(r => (
          <li key={r.id}>
            <Card>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{r.clientName}</p>
                  <p className="text-xs text-slate-400">{fmt(r.submittedAt)}</p>
                </div>
                <Badge tone={r.date === today() ? "success" : "default"}>{r.date === today() ? "Today" : fmtDate(r.date)}</Badge>
              </div>
              <dl className="mt-3 space-y-1.5 border-t border-[#DCE9E6] pt-3 text-sm dark:border-slate-800">
                <div className="grid grid-cols-[100px_1fr]"><dt className="text-slate-500">Number</dt><dd className="font-medium">{r.clientNumber}</dd></div>
                <div className="grid grid-cols-[100px_1fr]"><dt className="text-slate-500">Source</dt><dd className="font-medium">{r.leadSource}</dd></div>
                <div className="grid grid-cols-[100px_1fr]"><dt className="text-slate-500">Budget</dt><dd className="font-medium text-[#0B4F4B] dark:text-[#8FD4C6]">{r.budget}</dd></div>
                <div className="grid grid-cols-[100px_1fr]"><dt className="text-slate-500">Feedback</dt><dd className="text-slate-700 dark:text-slate-200">{r.feedback}</dd></div>
              </dl>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Performance Tab (GM/Manager) ──────────────────────────────────────────────

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function PerformanceTab() {
  const todayDate = today();
  const [selectedEmp, setSelectedEmp] = useState(salesEmployees[0]?.id ?? "");
  const [viewDate, setViewDate] = useState(todayDate);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [mode, setMode] = useState<"day" | "month">("day");
  const [tick, setTick] = useState(0);

  useEffect(() => onCRMChanged(() => setTick(t => t + 1)), []);

  const emp = employees.find(e => e.id === selectedEmp);

  // Day view
  const dayPerf = emp ? getDayPerformance(emp.id, viewDate, (d) => meetingsOnDate(emp.id, d)) : null;

  // Month view: build per-day performance for each workday of the month
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const monthPerf = emp
    ? Array.from({ length: daysInMonth }, (_, i) => {
        const d = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
        return getDayPerformance(emp.id, d, (date) => meetingsOnDate(emp.id, date));
      })
    : [];

  const monthCompleted = monthPerf.filter(p =>
    p.adsTaskDone && p.knowledgeTaskDone && p.requestsCount >= DAILY_REQUESTS_TARGET && p.meetingsDone
  ).length;

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  return (
    <div className="space-y-5" key={tick}>
      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        <Select value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)} className="w-auto">
          {salesEmployees.map(e => <option key={e.id} value={e.id}>{e.name} — {e.role}</option>)}
        </Select>
        <div role="tablist" className="flex gap-1 rounded-2xl border border-[#DCE9E6] bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
          {(["day", "month"] as const).map(m => (
            <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
              className={cn("rounded-xl px-4 py-2 text-sm font-semibold transition", mode === m ? "bg-[#0B4F4B] text-white" : "text-slate-500 hover:text-[#0B4F4B] dark:text-slate-400")}>
              {m === "day" ? "Day view" : "Month view"}
            </button>
          ))}
        </div>
      </div>

      {/* Day view */}
      {mode === "day" && dayPerf && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <DatePicker value={viewDate} onChange={setViewDate} className="w-48" />
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="Ads Task" value={dayPerf.adsTaskDone ? "Done" : "Missing"} tone={dayPerf.adsTaskDone ? "good" : "warn"} />
            <Stat label="Projects in Market" value={dayPerf.knowledgeTaskDone ? "Done" : "Missing"} tone={dayPerf.knowledgeTaskDone ? "good" : "warn"} />
            <Stat label="Requests" value={`${dayPerf.requestsCount} / ${DAILY_REQUESTS_TARGET}`} tone={dayPerf.requestsCount >= DAILY_REQUESTS_TARGET ? "good" : "warn"} />
            <Stat label="Meeting" value={dayPerf.meetingsDone ? "Done" : "Missing"} tone={dayPerf.meetingsDone ? "good" : "warn"} />
          </div>
          {dayPerf.extraTasks.length > 0 && (
            <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
              <p className="mb-3 text-xs font-semibold uppercase text-amber-700 dark:text-amber-300">Extra Tasks Assigned</p>
              <ul className="space-y-2">
                {dayPerf.extraTasks.map(et => (
                  <li key={et.id} className="text-sm text-amber-900 dark:text-amber-100">
                    {et.note}{et.deductionDays > 0 && <span className="ml-2 text-xs font-semibold text-red-600">−{et.deductionDays} day</span>}
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {/* Requests list for this day */}
          {(() => {
            const rqs = requestsForEmployeeOnDate(emp!.id, viewDate);
            if (rqs.length === 0) return <p className="text-sm text-slate-500">No requests logged for this day.</p>;
            return (
              <ul className="grid gap-3 lg:grid-cols-2">
                {rqs.map(r => (
                  <li key={r.id}>
                    <Card>
                      <p className="font-semibold text-slate-900 dark:text-white">{r.clientName}</p>
                      <dl className="mt-2 space-y-1 text-sm">
                        <div className="grid grid-cols-[90px_1fr]"><dt className="text-slate-500">Source</dt><dd>{r.leadSource}</dd></div>
                        <div className="grid grid-cols-[90px_1fr]"><dt className="text-slate-500">Budget</dt><dd className="text-[#0B4F4B] dark:text-[#8FD4C6] font-medium">{r.budget}</dd></div>
                        <div className="grid grid-cols-[90px_1fr]"><dt className="text-slate-500">Feedback</dt><dd className="text-slate-700 dark:text-slate-200">{r.feedback}</dd></div>
                      </dl>
                    </Card>
                  </li>
                ))}
              </ul>
            );
          })()}
        </div>
      )}

      {/* Month view */}
      {mode === "month" && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <Btn variant="ghost" size="sm" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Btn>
            <span className="font-semibold text-slate-900 dark:text-white">{MONTH_NAMES[viewMonth]} {viewYear}</span>
            <Btn variant="ghost" size="sm" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Btn>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Full days completed" value={String(monthCompleted)} sub={`of ${daysInMonth} days`} tone="good" />
            <Stat label="Requests this month" value={String(monthPerf.reduce((s, p) => s + p.requestsCount, 0))} sub="total logged" tone="muted" />
            <Stat label="Deductions" value={String(monthPerf.reduce((s, p) => s + p.deductions.reduce((x, d) => x + d.deductionDays, 0), 0))} sub="days this month" tone={monthPerf.some(p => p.deductions.length > 0) ? "warn" : "muted"} />
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
              <div key={d} className="text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400 py-1">{d}</div>
            ))}
            {/* Offset */}
            {Array.from({ length: new Date(viewYear, viewMonth, 1).getDay() }).map((_, i) => <div key={`off-${i}`} />)}
            {monthPerf.map((p, i) => {
              const all = p.adsTaskDone && p.knowledgeTaskDone && p.requestsCount >= DAILY_REQUESTS_TARGET && p.meetingsDone;
              const none = !p.adsTaskDone && !p.knowledgeTaskDone && p.requestsCount === 0 && !p.meetingsDone;
              const hasDeduction = p.deductions.length > 0;
              const isToday = p.date === todayDate;
              const isFuture = p.date > todayDate;
              return (
                <div key={p.date}
                  className={cn(
                    "aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-semibold transition cursor-default",
                    isFuture ? "bg-slate-100 text-slate-300 dark:bg-slate-800 dark:text-slate-600" :
                    hasDeduction ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" :
                    all ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" :
                    none ? "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500" :
                    "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
                    isToday && "ring-2 ring-[#0B4F4B]",
                  )}
                  title={`${p.date}: Requests ${p.requestsCount}/${DAILY_REQUESTS_TARGET}, Ads ${p.adsTaskDone ? "✓" : "✗"}, Projects in Market ${p.knowledgeTaskDone ? "✓" : "✗"}, Meeting ${p.meetingsDone ? "✓" : "✗"}`}
                >
                  {i + 1}
                  {hasDeduction && <span className="text-[9px] text-red-600">-{p.deductions.reduce((s, d) => s + d.deductionDays, 0)}d</span>}
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-4 text-xs">
            {[
              { color: "bg-emerald-100", label: "All targets met" },
              { color: "bg-amber-100", label: "Partial" },
              { color: "bg-slate-100", label: "No activity" },
              { color: "bg-red-100", label: "Deduction applied" },
            ].map(({ color, label }) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className={cn("h-3 w-3 rounded", color)} />{label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Manage Tab (GM) ───────────────────────────────────────────────────────────

function ManageTab({ currentUserName }: { currentUserName: string }) {
  const [extraTasks, setExtraTasks] = useState<ExtraTask[]>([]);
  const [form, setForm] = useState({
    targetEmployeeId: salesEmployees[0]?.id ?? "",
    assignedDate: today(),
    note: "",
    deductionDays: 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const refresh = () => setExtraTasks(loadExtraTasks().sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    refresh();
    return onCRMChanged(refresh);
  }, []);

  const setF = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: k === "deductionDays" ? Number(e.target.value) : e.target.value }));

  const emp = employees.find(e => e.id === form.targetEmployeeId);
  const canSubmit = form.note.trim() && emp;

  const submit = () => {
    if (!canSubmit || !emp) return;
    setSaving(true);
    addExtraTask({
      targetEmployeeId: emp.id,
      targetEmployeeName: emp.name,
      assignedDate: form.assignedDate,
      note: form.note,
      deductionDays: form.deductionDays,
      createdBy: currentUserName,
    });
    setForm(prev => ({ ...prev, note: "", deductionDays: 0 }));
    setSaving(false);
  };

  const remove = (id: string) => { deleteExtraTask(id); };

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="mb-5 text-base font-semibold text-slate-900 dark:text-white">Assign Extra Task / Deduction</h3>
        <div className="space-y-4">
          <FieldRow label="Employee *">
            <Select value={form.targetEmployeeId} onChange={setF("targetEmployeeId")}>
              {salesEmployees.map(e => <option key={e.id} value={e.id}>{e.name} — {e.role}</option>)}
            </Select>
          </FieldRow>
          <FieldRow label="Date *">
            <DatePicker value={form.assignedDate} onChange={v => setF("assignedDate")({ target: { value: v } } as React.ChangeEvent<HTMLInputElement>)} />
          </FieldRow>
          <FieldRow label="Note / Task *">
            <Textarea value={form.note} onChange={setF("note")} placeholder="Describe the extra task or reason for deduction…" required />
          </FieldRow>
          <FieldRow label="Deduction">
            <div className="flex items-center gap-3">
              <Select value={form.deductionDays} onChange={setF("deductionDays")} className="w-auto">
                <option value={0}>None</option>
                <option value={0.25}>¼ day (0.25)</option>
                <option value={0.5}>½ day (0.5)</option>
                <option value={1}>1 day</option>
              </Select>
              {form.deductionDays > 0 && (
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="inline h-3.5 w-3.5 mr-1" />
                  Deduction will appear in Finance and the employee&apos;s calendar.
                </p>
              )}
            </div>
          </FieldRow>
          <div className="flex justify-end pt-2">
            <Btn onClick={submit} disabled={!canSubmit || saving}>
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Assign Task
            </Btn>
          </div>
        </div>
      </Card>

      {/* List */}
      {extraTasks.length === 0 && (
        <Card className="text-center py-10">
          <Settings2 className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-700 dark:text-slate-200">No extra tasks assigned</p>
        </Card>
      )}
      <ul className="space-y-3">
        {extraTasks.map(et => (
          <li key={et.id}>
            <Card className={et.deductionDays > 0 ? "border-red-200 dark:border-red-900" : ""}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white">{et.targetEmployeeName}</span>
                    <Badge tone="default">{fmtDate(et.assignedDate)}</Badge>
                    {et.deductionDays > 0 && <Badge tone="danger">−{et.deductionDays} day</Badge>}
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-200">{et.note}</p>
                  <p className="text-xs text-slate-400">Assigned by {et.createdBy} · {fmt(et.createdAt)}</p>
                </div>
                <button onClick={() => remove(et.id)} className="text-slate-400 hover:text-red-500 transition" title="Remove">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Main workspace ────────────────────────────────────────────────────────────

type CRMTab = "tasks" | "requests" | "performance" | "manage";

export function CRMWorkspace() {
  const [currentUserId, setCurrentUserId] = useState(salesEmployees[0]?.id ?? "");
  const [tab, setTab] = useState<CRMTab>("tasks");

  const currentUser = employees.find(e => e.id === currentUserId);
  const isManager = currentUser ? isMgr(currentUser.role) : false;

  const tabs: { id: CRMTab; label: string; mgr?: boolean }[] = [
    { id: "tasks", label: "My Tasks" },
    { id: "requests", label: "Requests" },
    { id: "performance", label: "Performance", mgr: true },
    { id: "manage", label: "Manage", mgr: true },
  ];

  const visibleTabs = tabs.filter(t => !t.mgr || isManager);

  // Reset to tasks tab if switching to non-manager who was on a manager-only tab
  useEffect(() => {
    if (!isManager && (tab === "performance" || tab === "manage")) setTab("tasks");
  }, [isManager, tab]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950 dark:text-white">CRM</h1>
          <p className="mt-1 text-sm text-slate-500">Client requests, daily tasks, and sales performance.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Viewing as:</span>
          <Select value={currentUserId} onChange={e => setCurrentUserId(e.target.value)} className="w-auto text-sm">
            {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.role})</option>)}
          </Select>
        </div>
      </div>

      {/* Demo notice */}
      <div className="rounded-xl border border-[#DCE9E6] bg-[#F7FAF9] px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900">
        Demo mode — all data is stored in this browser only and resets on clear. No server persistence.
      </div>

      {/* Tabs */}
      <div role="tablist" className="flex gap-1 rounded-2xl border border-[#DCE9E6] bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
        {visibleTabs.map(t => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={cn("flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition", tab === t.id ? "bg-[#0B4F4B] text-white" : "text-slate-500 hover:text-[#0B4F4B] dark:text-slate-400")}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "tasks" && currentUser && (
        <MyTasksTab employeeId={currentUser.id} employeeName={currentUser.name} date={today()} />
      )}
      {tab === "requests" && currentUser && (
        <RequestsTab employeeId={currentUser.id} employeeName={currentUser.name} />
      )}
      {tab === "performance" && isManager && <PerformanceTab />}
      {tab === "manage" && isManager && <ManageTab currentUserName={currentUser?.name ?? "Manager"} />}
    </div>
  );
}
