"use client";

import { useEffect, useState } from "react";
import { Check, GripVertical, Link2, Lock, Paperclip, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  loadCRMTaskConfig, saveCRMTaskConfig, onCRMTaskConfigChanged,
  DEFAULT_CONFIG,
  type CRMTasksConfig, type KnowledgeFieldConfig, type CustomTask,
  type TaskLink, type TaskAttachment,
} from "@/lib/crm-task-config";

const labelCls = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400";
const inputCls = "w-full rounded-xl border border-[#DCE9E6] bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0B4F4B] focus:outline-none focus:ring-2 focus:ring-[#0B4F4B]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5">
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-full transition ${checked ? "bg-[#0B4F4B]" : "bg-slate-200 dark:bg-slate-700"}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? "left-4" : "left-0.5"}`} />
      </button>
      {label && <span className="text-sm text-slate-600 dark:text-slate-300">{label}</span>}
    </label>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#DCE9E6] bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-[#DCE9E6] px-5 py-3.5 dark:border-slate-800">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export function CRMTaskSettings() {
  const [config, setConfig] = useState<CRMTasksConfig>(DEFAULT_CONFIG);
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setConfig(loadCRMTaskConfig());
    setReady(true);
    return onCRMTaskConfigChanged(() => setConfig(loadCRMTaskConfig()));
  }, []);

  if (!ready) return null;

  function update(partial: Partial<CRMTasksConfig>) {
    setConfig(prev => ({ ...prev, ...partial }));
    setSaved(false);
  }

  function save() {
    saveCRMTaskConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function resetAll() {
    setConfig(DEFAULT_CONFIG);
    setSaved(false);
  }

  // ── Daily targets ────────────────────────────────────────────────────────────
  function setRequestsTarget(n: number) { update({ requestsTarget: Math.max(1, Math.min(20, n)) }); }
  function setMeetingsTarget(n: number) { update({ meetingsTarget: Math.max(1, Math.min(10, n)) }); }
  function setKnowledgeTarget(n: number) { update({ knowledgeTarget: Math.max(2, Math.min(10, n)) }); }

  // ── Ads ──────────────────────────────────────────────────────────────────────
  function setAdsLinkCount(n: number) {
    update({ ads: { ...config.ads, linkCount: Math.max(1, Math.min(5, n)) } });
  }

  // ── Knowledge fields ─────────────────────────────────────────────────────────
  function toggleField(key: string, enabled: boolean) {
    update({
      knowledge: {
        ...config.knowledge,
        fields: config.knowledge.fields.map(f => f.key === key ? { ...f, enabled } : f),
      },
    });
  }

  function updateFieldLabel(key: string, lang: "En" | "Ar", value: string) {
    update({
      knowledge: {
        ...config.knowledge,
        fields: config.knowledge.fields.map(f =>
          f.key === key ? { ...f, [`label${lang}`]: value } : f
        ) as KnowledgeFieldConfig[],
      },
    });
  }

  // ── Custom tasks ─────────────────────────────────────────────────────────────
  function addCustomTask() {
    const id = `custom-${Date.now()}`;
    update({
      customTasks: [
        ...config.customTasks,
        {
          id, labelEn: "New Task", labelAr: "مهمة جديدة", description: "",
          enabled: true,
          startDate: new Date().toISOString().slice(0, 10),
          dueTime: "",
          recurrence: "once" as import("@/lib/crm-task-config").Recurrence,
        },
      ],
    });
  }

  function updateCustomTask(id: string, patch: Partial<CustomTask>) {
    update({ customTasks: config.customTasks.map(t => t.id === id ? { ...t, ...patch } : t) });
  }

  function deleteCustomTask(id: string) {
    update({ customTasks: config.customTasks.filter(t => t.id !== id) });
  }

  // ── Links ─────────────────────────────────────────────────────────────────────
  function addLink(taskId: string) {
    const link: TaskLink = { id: `lnk-${Date.now()}`, label: "", url: "" };
    update({ customTasks: config.customTasks.map(t => t.id === taskId ? { ...t, links: [...(t.links ?? []), link] } : t) });
  }
  function updateLink(taskId: string, linkId: string, patch: Partial<TaskLink>) {
    update({ customTasks: config.customTasks.map(t => t.id === taskId ? { ...t, links: (t.links ?? []).map(l => l.id === linkId ? { ...l, ...patch } : l) } : t) });
  }
  function removeLink(taskId: string, linkId: string) {
    update({ customTasks: config.customTasks.map(t => t.id === taskId ? { ...t, links: (t.links ?? []).filter(l => l.id !== linkId) } : t) });
  }

  // ── Attachments ───────────────────────────────────────────────────────────────
  function addAttachment(taskId: string, file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const att: TaskAttachment = {
        id: `att-${Date.now()}`,
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        dataUrl: reader.result as string,
      };
      update({ customTasks: config.customTasks.map(t => t.id === taskId ? { ...t, attachments: [...(t.attachments ?? []), att] } : t) });
    };
    reader.readAsDataURL(file);
  }
  function removeAttachment(taskId: string, attId: string) {
    update({ customTasks: config.customTasks.map(t => t.id === taskId ? { ...t, attachments: (t.attachments ?? []).filter(a => a.id !== attId) } : t) });
  }
  function formatBytes(n: number) {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  }

  const BUILT_IN_TASKS: { key: keyof Omit<CRMTasksConfig, "customTasks">; label: string }[] = [
    { key: "ads",       label: "Ads & WhatsApp Campaign" },
    { key: "knowledge", label: "Projects in Market" },
    { key: "calls",     label: "Calls" },
    { key: "rotation",  label: "Rotation" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">CRM Task Settings</h1>
          <p className="mt-1 text-sm text-slate-500">Configure which tasks are active and customise their fields.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={resetAll} className="text-xs text-slate-400 transition hover:text-rose-500">Reset to defaults</button>
          <Button onClick={save}>
            {saved ? <><Check className="h-4 w-4" /> Saved</> : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* ── Daily targets ─────────────────────────────────────────────────── */}
      <SectionCard title="Daily Targets">
        <p className="mb-5 text-sm text-slate-500">Set how many client requests, meetings, and project assessments each salesperson must reach per day.</p>
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { label: "Client requests per day", value: config.requestsTarget, setter: setRequestsTarget, min: 1, max: 20 },
            { label: "Meetings per day", value: config.meetingsTarget, setter: setMeetingsTarget, min: 1, max: 10 },
            { label: "Projects in Market per day", value: config.knowledgeTarget, setter: setKnowledgeTarget, min: 2, max: 10 },
          ].map(({ label, value, setter, min, max }) => (
            <div key={label}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setter(value - 1)}
                  disabled={value <= min}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#DCE9E6] text-lg font-semibold text-slate-600 transition hover:border-[#0B4F4B] hover:text-[#0B4F4B] disabled:opacity-30 dark:border-slate-700 dark:text-slate-300"
                >−</button>
                <span className="w-8 text-center text-2xl font-semibold text-slate-900 dark:text-white">{value}</span>
                <button
                  onClick={() => setter(value + 1)}
                  disabled={value >= max}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#DCE9E6] text-lg font-semibold text-slate-600 transition hover:border-[#0B4F4B] hover:text-[#0B4F4B] disabled:opacity-30 dark:border-slate-700 dark:text-slate-300"
                >+</button>
                <span className="text-sm text-slate-400">{min}–{max}/day</span>
              </div>
            </div>
          ))}
        </div>

        {config.ads.enabled && (
          <>
            <div className="my-5 border-t border-[#DCE9E6] dark:border-slate-700" />
            <p className="mb-5 text-sm text-slate-500">Set how many social media / WhatsApp links the salesperson must submit each day.</p>
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Ads & WhatsApp links per day</p>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setAdsLinkCount(config.ads.linkCount - 1)}
                  disabled={config.ads.linkCount <= 1}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#DCE9E6] text-lg font-semibold text-slate-600 transition hover:border-[#0B4F4B] hover:text-[#0B4F4B] disabled:opacity-30 dark:border-slate-700 dark:text-slate-300"
                >−</button>
                <span className="w-8 text-center text-2xl font-semibold text-slate-900 dark:text-white">{config.ads.linkCount}</span>
                <button
                  onClick={() => setAdsLinkCount(config.ads.linkCount + 1)}
                  disabled={config.ads.linkCount >= 5}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#DCE9E6] text-lg font-semibold text-slate-600 transition hover:border-[#0B4F4B] hover:text-[#0B4F4B] disabled:opacity-30 dark:border-slate-700 dark:text-slate-300"
                >+</button>
                <span className="text-sm text-slate-400">links required per day (1–5)</span>
              </div>
            </div>
          </>
        )}
      </SectionCard>

      {/* ── Enable / disable built-in tasks ───────────────────────────────── */}
      <SectionCard title="Active Tasks">
        <div className="space-y-3">
          {BUILT_IN_TASKS.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between rounded-xl border border-[#DCE9E6] px-4 py-3 dark:border-slate-700">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
              <Toggle
                checked={(config[key] as { enabled: boolean }).enabled}
                onChange={v => update({ [key]: { ...(config[key] as object), enabled: v } })}
              />
            </div>
          ))}
        </div>
      </SectionCard>


      {/* ── Knowledge fields ──────────────────────────────────────────────── */}
      {config.knowledge.enabled && (
        <SectionCard title="Projects in Market — Assessment Fields">
          <p className="mb-4 text-sm text-slate-500">Toggle fields on or off and edit their labels. Disabled fields are hidden from both the form and the voice reference card.</p>
          <div className="space-y-2">
            {config.knowledge.fields.map((f, idx) => (
              <div key={f.key} className={`rounded-xl border p-3 transition ${f.enabled ? "border-[#DCE9E6] bg-white dark:border-slate-700 dark:bg-slate-900" : "border-slate-200 bg-slate-50 opacity-60 dark:border-slate-700 dark:bg-slate-800"}`}>
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 shrink-0 text-slate-300" />
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0B4F4B] text-[10px] font-bold text-white">{idx + 1}</span>
                  <div className="flex flex-1 gap-3">
                    <div className="flex-1">
                      <label className={labelCls}>English label</label>
                      <input
                        type="text"
                        value={f.labelEn}
                        onChange={e => updateFieldLabel(f.key, "En", e.target.value)}
                        disabled={!f.enabled}
                        className={inputCls}
                      />
                    </div>
                    <div className="flex-1">
                      <label className={labelCls}>Arabic label / التسمية بالعربي</label>
                      <input
                        type="text"
                        value={f.labelAr}
                        onChange={e => updateFieldLabel(f.key, "Ar", e.target.value)}
                        disabled={!f.enabled}
                        className={`${inputCls} text-right`}
                        dir="rtl"
                      />
                    </div>
                  </div>
                  <Toggle checked={f.enabled} onChange={v => toggleField(f.key, v)} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ── Custom tasks ──────────────────────────────────────────────────── */}
      <SectionCard title="Custom Tasks">
        <p className="mb-4 text-sm text-slate-500">Add tasks that appear for all sales users on a specific date, with optional recurrence.</p>
        <div className="space-y-3">
          {config.customTasks.map(t => {
            const recurrenceLabel: Record<string, string> = {
              once: "One time", daily: "Every day", weekly: "Every week (same day)", monthly: "Every month (same date)",
            };
            return (
              <div key={t.id} className={`rounded-xl border p-4 transition ${t.enabled ? "border-[#DCE9E6] bg-white dark:border-slate-700 dark:bg-slate-900" : "border-slate-200 bg-slate-50 opacity-60 dark:border-slate-700 dark:bg-slate-800"}`}>
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{t.labelEn || "Untitled task"}</p>
                    {t.startDate && (
                      <p className="text-xs text-slate-400">
                        {recurrenceLabel[t.recurrence ?? "once"]} · from {new Date(`${t.startDate}T00:00`).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}
                        {t.dueTime ? ` · due ${t.dueTime}` : ""}
                      </p>
                    )}
                  </div>
                  <Toggle checked={t.enabled} onChange={v => updateCustomTask(t.id, { enabled: v })} />
                  <button onClick={() => deleteCustomTask(t.id)} className="text-slate-300 transition hover:text-rose-500 dark:text-slate-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Task name</label>
                    <input type="text" value={t.labelEn} onChange={e => updateCustomTask(t.id, { labelEn: e.target.value })} className={inputCls} placeholder="e.g. Daily Report" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Instructions for the salesperson</label>
                    <input type="text" value={t.description} onChange={e => updateCustomTask(t.id, { description: e.target.value })} className={inputCls} placeholder="What should the salesperson do or note?" />
                  </div>

                  {/* Links */}
                  <div className="sm:col-span-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className={labelCls + " mb-0"}>
                        Links <span className="font-normal normal-case tracking-normal text-slate-400">(optional)</span>
                      </label>
                      <button
                        onClick={() => addLink(t.id)}
                        className="flex items-center gap-1 rounded-lg border border-[#DCE9E6] px-2.5 py-1 text-xs font-semibold text-[#0B4F4B] transition hover:border-[#0B4F4B] hover:bg-[#E8F3F1] dark:border-slate-700 dark:text-[#8FD4C6] dark:hover:border-[#2E7D76] dark:hover:bg-[#0B2927]"
                      >
                        <Plus className="h-3 w-3" /> Add link
                      </button>
                    </div>
                    {(t.links ?? []).map(lnk => (
                      <div key={lnk.id} className="rounded-xl border border-[#DCE9E6] bg-[#F5F8F7] p-3 dark:border-slate-700 dark:bg-slate-800">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Link2 className="h-3.5 w-3.5 text-[#0B4F4B] dark:text-[#8FD4C6]" />
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Link</span>
                          </div>
                          <button onClick={() => removeLink(t.id, lnk.id)} className="text-slate-300 transition hover:text-rose-500 dark:text-slate-600">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={lnk.label}
                            onChange={e => updateLink(t.id, lnk.id, { label: e.target.value })}
                            placeholder="Label — e.g. Project Brochure"
                            className={inputCls}
                          />
                          <input
                            type="url"
                            value={lnk.url}
                            onChange={e => updateLink(t.id, lnk.id, { url: e.target.value })}
                            placeholder="https://…"
                            className={inputCls}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Attachments */}
                  <div className="sm:col-span-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className={labelCls + " mb-0"}>
                        Attachments <span className="font-normal normal-case tracking-normal text-slate-400">(optional)</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-1 rounded-lg border border-[#DCE9E6] px-2.5 py-1 text-xs font-semibold text-[#0B4F4B] transition hover:border-[#0B4F4B] hover:bg-[#E8F3F1] dark:border-slate-700 dark:text-[#8FD4C6] dark:hover:border-[#2E7D76] dark:hover:bg-[#0B2927]">
                        <Plus className="h-3 w-3" /> Add file
                        <input type="file" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) addAttachment(t.id, f); e.target.value = ""; }} />
                      </label>
                    </div>
                    {(t.attachments ?? []).map(att => (
                      <div key={att.id} className="flex items-center gap-3 rounded-xl border border-[#DCE9E6] bg-white px-4 py-2.5 dark:border-slate-700 dark:bg-slate-900">
                        <Paperclip className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="flex-1 truncate text-sm text-slate-700 dark:text-slate-200">{att.name}</span>
                        <span className="shrink-0 text-xs text-slate-400">{formatBytes(att.sizeBytes)}</span>
                        <button onClick={() => removeAttachment(t.id, att.id)} className="shrink-0 text-slate-300 transition hover:text-rose-500 dark:text-slate-600">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Schedule */}
                  <div>
                    <label className={labelCls}>Start date</label>
                    <input type="date" value={t.startDate ?? ""} onChange={e => updateCustomTask(t.id, { startDate: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Due time (optional)</label>
                    <input type="time" value={t.dueTime ?? ""} onChange={e => updateCustomTask(t.id, { dueTime: e.target.value })} className={inputCls} placeholder="e.g. 14:00" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Recurrence</label>
                    <div className="flex flex-wrap gap-2">
                      {(["once", "daily", "weekly", "monthly"] as const).map(r => (
                        <button key={r} onClick={() => updateCustomTask(t.id, { recurrence: r })}
                          className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${(t.recurrence ?? "once") === r ? "border-[#0B4F4B] bg-[#E8F3F1] text-[#0B4F4B] dark:border-[#2E7D76] dark:bg-[#0B2927] dark:text-[#8FD4C6]" : "border-[#DCE9E6] text-slate-500 hover:border-[#B7D9D3] dark:border-slate-700"}`}>
                          {recurrenceLabel[r]}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Lock mode */}
                  <div className="sm:col-span-2">
                    <div className={`flex items-start gap-3 rounded-xl border p-4 transition ${t.lockMode ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30" : "border-[#DCE9E6] dark:border-slate-700"}`}>
                      <Lock className={`mt-0.5 h-4 w-4 shrink-0 ${t.lockMode ? "text-amber-600 dark:text-amber-400" : "text-slate-400"}`} />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Integrity Lock (Assessment Mode)</p>
                        <p className="mt-0.5 text-xs text-slate-400">When enabled, switching tabs or minimising the app during this task will block the user from submitting — prevents using AI or search to look up answers.</p>
                      </div>
                      <Toggle checked={!!t.lockMode} onChange={v => updateCustomTask(t.id, { lockMode: v })} />
                    </div>
                  </div>
                  {/* Voice note */}
                  <div className="sm:col-span-2">
                    <div className={`flex items-start gap-3 rounded-xl border p-4 transition ${t.allowVoice ? "border-[#0B4F4B]/30 bg-[#E8F3F1] dark:border-[#2E7D76] dark:bg-[#0B2927]" : "border-[#DCE9E6] dark:border-slate-700"}`}>
                      <svg className={`mt-0.5 h-4 w-4 shrink-0 ${t.allowVoice ? "text-[#0B4F4B] dark:text-[#8FD4C6]" : "text-slate-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Allow Voice Note</p>
                        <p className="mt-0.5 text-xs text-slate-400">When enabled, the user can choose to record a spoken answer instead of typing. Works in Chrome and Edge.</p>
                      </div>
                      <Toggle checked={!!t.allowVoice} onChange={v => updateCustomTask(t.id, { allowVoice: v })} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <button
            onClick={addCustomTask}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#DCE9E6] py-3 text-sm font-medium text-slate-400 transition hover:border-[#0B4F4B] hover:text-[#0B4F4B] dark:border-slate-700 dark:hover:border-[#2E7D76]"
          >
            <Plus className="h-4 w-4" /> Add custom task
          </button>
        </div>
      </SectionCard>


      <div className="flex items-center justify-between rounded-2xl border border-amber-100 bg-amber-50 px-5 py-3 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400">
        <span>Demo prototype — settings are stored in this browser only and are not shared with other users.</span>
        {saved && <span className="flex items-center gap-1 font-semibold text-emerald-600"><Check className="h-3 w-3" /> Changes saved</span>}
      </div>
    </div>
  );
}
