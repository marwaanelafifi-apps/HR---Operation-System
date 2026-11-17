"use client";

import { useEffect, useState } from "react";
import {
  Check, ChevronDown, ChevronUp, Clock, ExternalLink, Lock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  loadDailyTasks, loadCustomTaskCompletions, onCRMChanged,
  type AdsTaskData, type CallsTaskData, type DailyTask,
  type KnowledgeTaskData, type RotationTaskData,
} from "@/lib/crm-store";
import { loadCRMTaskConfig } from "@/lib/crm-task-config";

// ── Current user (prototype: single hardcoded user) ───────────────────────────
const ME_ID = "ahmed-khalil";

// ── Helpers ───────────────────────────────────────────────────────────────────
function todayISO() { return new Date().toISOString().slice(0, 10); }

function friendlyDate(iso: string) {
  const d = new Date(`${iso}T00:00`);
  const today = todayISO();
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (iso === today) return "Today";
  if (iso === yesterday) return "Yesterday";
  return d.toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" });
}

function fmtDuration(seconds?: number): string | null {
  if (!seconds || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

const TASK_TYPE_LABELS: Record<string, string> = {
  ads: "Ads & WhatsApp Campaign",
  knowledge: "Projects in Market",
  calls: "Calls Log",
  rotation: "Rotation",
};

// ── Entry card ────────────────────────────────────────────────────────────────
interface HistoryEntry {
  id: string;
  date: string;
  label: string;
  submittedAt: string;
  durationSeconds?: number;
  wasBlocked?: boolean;
  detail: React.ReactNode;
}

function EntryCard({ entry }: { entry: HistoryEntry }) {
  const [open, setOpen] = useState(false);
  const dur = fmtDuration(entry.durationSeconds);

  return (
    <div className="rounded-2xl border border-[#DCE9E6] bg-white dark:border-slate-700 dark:bg-slate-900">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
          <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900 dark:text-white">{entry.label}</p>
          <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />{fmtTime(entry.submittedAt)}
            </span>
            {dur && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {dur}
              </span>
            )}
            {entry.wasBlocked && (
              <span className="flex items-center gap-1 text-rose-500">
                <Lock className="h-3 w-3" /> Locked
              </span>
            )}
          </div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" /> : <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />}
      </button>
      {open && (
        <div className="border-t border-[#DCE9E6] px-5 py-4 text-sm dark:border-slate-700">
          {entry.detail}
        </div>
      )}
    </div>
  );
}

// ── Detail renderers ──────────────────────────────────────────────────────────
function AdsDetail({ data }: { data: AdsTaskData }) {
  return (
    <div className="space-y-2">
      {data.urls.map((url, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="mt-0.5 shrink-0 font-semibold text-[#0B4F4B] dark:text-[#8FD4C6]">{i + 1}.</span>
          <div className="min-w-0">
            <span className="font-medium text-slate-500">{data.platform?.[i] ?? "Link"} — </span>
            <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 break-all text-[#0B4F4B] underline dark:text-[#8FD4C6]">
              {url}<ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}

function KnowledgeDetail({ data }: { data: KnowledgeTaskData }) {
  if (data.voiceNoteTranscript) {
    return (
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Voice note · {data.voiceNoteLanguage === "ar" ? "Arabic" : "English"}
        </p>
        <p
          className="leading-6 text-slate-700 dark:text-slate-200"
          dir={data.voiceNoteLanguage === "ar" ? "rtl" : "ltr"}
        >
          {data.voiceNoteTranscript}
        </p>
      </div>
    );
  }
  const rows: [string, string][] = [
    ["Project", data.assessment.projectName],
    ["Company", data.assessment.companyName],
    ["Previous Projects / Owner History", data.assessment.previousWork],
    ["Location", data.assessment.location],
    ["Project Acres", data.assessment.projectArea],
    ["Details & Facilities", data.assessment.projectDetails],
    ["Unit Types", data.assessment.unitTypes],
    ["Prices & Acres", data.assessment.pricesAndAcres],
    ["Payment Plan", data.assessment.paymentPlan],
    ["Finishing Type", data.assessment.finishingType],
    ["Construction", data.assessment.construction],
    ["Delivery Date", data.assessment.deliveryDate],
    ["Maintenance", data.assessment.maintenance],
    ["Engineering Consultant", data.assessment.investorType],
    ["Management & Operations", data.assessment.managementAndOperations],
    ["Terms of Contract", data.assessment.termsOfContract],
    ["Selling Points", data.assessment.sellingPoints],
    ["Weakness Points", data.assessment.weaknessPoints],
    ["Additional Notes", data.assessment.additionalNotes],
    ["Owner", data.assessment.owner],
  ].filter(([, v]) => v) as [string, string][];
  return (
    <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
      {rows.map(([k, v]) => (
        <div key={k} className="flex gap-2">
          <span className="shrink-0 font-semibold text-slate-500">{k}:</span>
          <span className="text-slate-700 dark:text-slate-200">{v}</span>
        </div>
      ))}
    </div>
  );
}

function CallsDetail({ data }: { data: CallsTaskData }) {
  const total = data.freshCalls + data.oldCalls + data.delayCalls;
  return (
    <div className="flex flex-wrap gap-6">
      <div><span className="font-semibold text-emerald-600">{data.freshCalls}</span><span className="ml-1.5 text-slate-500">Fresh</span></div>
      <div><span className="font-semibold text-sky-600">{data.oldCalls}</span><span className="ml-1.5 text-slate-500">Old</span></div>
      <div><span className="font-semibold text-amber-600">{data.delayCalls}</span><span className="ml-1.5 text-slate-500">Delay</span></div>
      <div className="ml-auto"><span className="font-semibold text-slate-700 dark:text-slate-200">{total}</span><span className="ml-1.5 text-slate-500">Total</span></div>
    </div>
  );
}

function RotationDetail({ data }: { data: RotationTaskData }) {
  return (
    <div className="space-y-1">
      {data.rotatedWithNames.length > 0 && (
        <p><span className="font-semibold text-slate-500">Rotated with: </span>{data.rotatedWithNames.join(", ")}</p>
      )}
      {data.notes && <p><span className="font-semibold text-slate-500">Notes: </span>{data.notes}</p>}
    </div>
  );
}

// ── Build entry list ──────────────────────────────────────────────────────────
function buildEntries(): HistoryEntry[] {
  const entries: HistoryEntry[] = [];

  // Standard daily tasks
  const dailyTasks = loadDailyTasks().filter(t => t.employeeId === ME_ID);
  for (const t of dailyTasks) {
    let detail: React.ReactNode = null;
    const data = t.data;
    if (t.taskType === "ads") detail = <AdsDetail data={data as AdsTaskData} />;
    else if (t.taskType === "knowledge") detail = <KnowledgeDetail data={data as KnowledgeTaskData} />;
    else if (t.taskType === "calls") detail = <CallsDetail data={data as CallsTaskData} />;
    else if (t.taskType === "rotation") detail = <RotationDetail data={data as RotationTaskData} />;

    entries.push({
      id: t.id,
      date: t.date,
      label: TASK_TYPE_LABELS[t.taskType] ?? t.taskType,
      submittedAt: t.completedAt,
      durationSeconds: (t as DailyTask & { durationSeconds?: number }).durationSeconds,
      detail,
    });
  }

  // Custom task completions
  const customCompletions = loadCustomTaskCompletions().filter(c => c.employeeId === ME_ID);
  const cfg = loadCRMTaskConfig();
  for (const c of customCompletions) {
    const task = cfg.customTasks.find(ct => ct.id === c.taskId);
    entries.push({
      id: c.id,
      date: c.date,
      label: task?.labelEn ?? "Custom Task",
      submittedAt: c.completedAt,
      durationSeconds: c.durationSeconds,
      wasBlocked: c.wasBlocked,
      detail: c.note ? (
        <p className="text-slate-700 dark:text-slate-200">{c.note}</p>
      ) : null,
    });
  }

  // Sort most-recent first
  return entries.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

// ── Main workspace ────────────────────────────────────────────────────────────
export function CRMHistoryWorkspace() {
  const [ready, setReady] = useState(false);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    function refresh() { setEntries(buildEntries()); }
    refresh();
    setReady(true);
    const unsub = onCRMChanged(refresh);
    return unsub;
  }, []);

  if (!ready) return null;

  // Group by date
  const filtered = filterType === "all" ? entries : entries.filter(e => {
    if (filterType === "custom") return !Object.keys(TASK_TYPE_LABELS).includes(
      loadDailyTasks().find(t => t.id === e.id)?.taskType ?? ""
    );
    return loadDailyTasks().find(t => t.id === e.id)?.taskType === filterType;
  });

  const byDate = filtered.reduce<Record<string, HistoryEntry[]>>((acc, e) => {
    (acc[e.date] ??= []).push(e);
    return acc;
  }, {});
  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  const filterOptions = [
    { value: "all", label: "All tasks" },
    { value: "ads", label: "Ads" },
    { value: "knowledge", label: "Knowledge" },
    { value: "calls", label: "Calls" },
    { value: "rotation", label: "Rotation" },
    { value: "custom", label: "Custom tasks" },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">My Task History</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {entries.length} submission{entries.length !== 1 ? "s" : ""} across all time
          </p>
        </div>
        <Badge tone={entries.length > 0 ? "success" : "default"}>
          {entries.length} total
        </Badge>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {filterOptions.map(opt => (
          <button
            key={opt.value}
            onClick={() => setFilterType(opt.value)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${filterType === opt.value ? "bg-[#0B4F4B] text-white dark:bg-[#2E7D76]" : "bg-[#F5F8F7] text-slate-600 hover:bg-[#E8F3F1] dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"}`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Entries grouped by date */}
      {sortedDates.length === 0 ? (
        <div className="rounded-2xl border border-[#DCE9E6] bg-[#F5F8F7] px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-800">
          <p className="text-slate-500 dark:text-slate-400">No submissions yet.</p>
        </div>
      ) : (
        sortedDates.map(date => (
          <div key={date}>
            <div className="mb-3 flex items-center gap-3">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{friendlyDate(date)}</p>
              <div className="flex-1 border-t border-[#DCE9E6] dark:border-slate-700" />
              <span className="rounded-full bg-[#E8F3F1] px-2 py-0.5 text-xs font-semibold text-[#0B4F4B] dark:bg-[#0B2927] dark:text-[#8FD4C6]">
                {byDate[date].length} task{byDate[date].length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="space-y-3">
              {byDate[date].map(entry => <EntryCard key={entry.id} entry={entry} />)}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
