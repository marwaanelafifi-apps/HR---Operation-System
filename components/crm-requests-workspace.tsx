"use client";

import { useEffect, useState } from "react";
import {
  Check, ChevronDown, ChevronUp, Phone, Plus, TrendingUp, Users, X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  addCRMRequest, loadCRMRequests, onCRMChanged, LEAD_SOURCE_GROUPS,
  type CRMRequest,
} from "@/lib/crm-store";
import { loadCRMTaskConfig } from "@/lib/crm-task-config";

const ME_ID   = "ahmed-khalil";
const ME_NAME = "Ahmed Khalil";

function todayISO() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }

function fmtDate(iso: string) {
  return new Date(`${iso}T00:00`).toLocaleDateString("en", {
    weekday: "short", month: "short", day: "numeric",
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" });
}

const inputCls = "w-full rounded-xl border border-[#DCE9E6] bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0B4F4B] focus:outline-none focus:ring-2 focus:ring-[#0B4F4B]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";
const labelCls = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400";

// ── New request modal ─────────────────────────────────────────────────────────
function RequestModal({ date, onClose }: { date: string; onClose: () => void }) {
  const [form, setForm] = useState({ clientName: "", clientNumber: "", leadSource: "", budget: "", feedback: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function set(k: keyof typeof form, v: string) { setForm(p => ({ ...p, [k]: v })); }
  const canSubmit = Object.values(form).every(v => v.trim());

  function handleSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    addCRMRequest({ employeeId: ME_ID, employeeName: ME_NAME, date, ...form });
    setSubmitted(true);
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 pt-12">
      <div className="w-full max-w-2xl rounded-2xl border border-[#DCE9E6] bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-[#DCE9E6] px-6 py-4 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">New Client Request</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6">
          {submitted ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center dark:border-emerald-900 dark:bg-emerald-950/40">
              <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-emerald-100 dark:bg-emerald-900">
                <Check className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-base font-semibold text-emerald-800 dark:text-emerald-300">Request submitted!</p>
              <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">{form.clientName} has been logged.</p>
              <div className="mt-5 flex justify-center gap-3">
                <Button size="sm" onClick={() => { setForm({ clientName: "", clientNumber: "", leadSource: "", budget: "", feedback: "" }); setSubmitted(false); }}>
                  <Plus className="h-3 w-3" /> Add Another
                </Button>
                <Button size="sm" variant="outline" onClick={onClose}>Done</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Client Name *</label>
                  <input autoFocus type="text" value={form.clientName} onChange={e => set("clientName", e.target.value)} placeholder="Full name" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Client Number *</label>
                  <input type="tel" inputMode="numeric" value={form.clientNumber} onChange={e => set("clientNumber", e.target.value.replace(/[^0-9+\-\s()]/g, ""))} placeholder="+20 1XX XXX XXXX" className={inputCls} />
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
                  <input type="text" inputMode="numeric" value={form.budget} onChange={e => set("budget", e.target.value.replace(/[^0-9,]/g, ""))} placeholder="e.g. 2,500,000" className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Feedback *</label>
                <textarea rows={4} value={form.feedback} onChange={e => set("feedback", e.target.value)} placeholder="Client interest, notes, outcome…" className={`${inputCls} resize-none`} />
              </div>
              <div className="flex justify-end gap-3 border-t border-[#DCE9E6] pt-4 dark:border-slate-700">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
                  <Check className="h-4 w-4" /> Submit Request
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Request card ──────────────────────────────────────────────────────────────
function RequestCard({ req, index }: { req: CRMRequest; index: number }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-2xl border border-[#DCE9E6] bg-white dark:border-slate-800 dark:bg-slate-900">
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-[#F5F8F7] dark:hover:bg-slate-800/60"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#E8F3F1] text-[#0B4F4B] dark:bg-[#133E3C] dark:text-[#8FD4C6]">
          <Users className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{req.clientName}</p>
            <span className="rounded-full bg-[#E8F3F1] px-2 py-0.5 text-[10px] font-semibold text-[#0B4F4B] dark:bg-[#133E3C] dark:text-[#8FD4C6]">#{index + 1}</span>
          </div>
          <p className="text-xs text-slate-500">{req.leadSource} · {req.budget} · {fmtTime(req.submittedAt)}</p>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>
      {expanded && (
        <div className="border-t border-[#DCE9E6] px-5 pb-4 pt-3 dark:border-slate-800">
          <dl className="grid gap-y-2 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Phone</dt>
              <dd className="mt-0.5 flex items-center gap-1 text-sm text-slate-700 dark:text-slate-200">
                <Phone className="h-3.5 w-3.5" /> {req.clientNumber || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Budget</dt>
              <dd className="mt-0.5 text-sm font-semibold text-[#0B4F4B] dark:text-[#8FD4C6]">{req.budget}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Lead Source</dt>
              <dd className="mt-0.5 text-sm text-slate-700 dark:text-slate-200">{req.leadSource}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Submitted</dt>
              <dd className="mt-0.5 text-sm text-slate-700 dark:text-slate-200">{fmtTime(req.submittedAt)}</dd>
            </div>
          </dl>
          {req.feedback && (
            <div className="mt-3 rounded-xl bg-[#F5F8F7] p-3 dark:bg-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Feedback / Notes</p>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{req.feedback}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main workspace ────────────────────────────────────────────────────────────
export function CRMRequestsWorkspace() {
  const [today] = useState(todayISO);
  const [allRequests, setAllRequests] = useState<CRMRequest[]>([]);
  const [target, setTarget] = useState(3);
  const [showModal, setShowModal] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function refresh() {
      const all = loadCRMRequests().filter(r => r.employeeId === ME_ID);
      setAllRequests(all.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)));
      setTarget(loadCRMTaskConfig().requestsTarget);
      setReady(true);
    }
    refresh();
    return onCRMChanged(refresh);
  }, []);

  if (!ready) return null;

  const todayRequests = allRequests.filter(r => r.date === today);
  const pastRequests  = allRequests.filter(r => r.date !== today);
  const pct = Math.min(100, Math.round((todayRequests.length / target) * 100));
  const onTarget = todayRequests.length >= target;

  // Group past requests by date
  const byDate = pastRequests.reduce<Record<string, CRMRequest[]>>((acc, r) => {
    (acc[r.date] ||= []).push(r);
    return acc;
  }, {});
  const pastDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  return (
    <div className="pb-10">
      {/* Header */}
      <header className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0B4F4B] dark:text-[#8FD4C6]">CRM</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white sm:text-4xl">Client Requests</h1>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              {new Date(`${today}T00:00`).toLocaleDateString("en", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <Button onClick={() => setShowModal(true)} className="shrink-0">
            <Plus className="h-4 w-4" /> New Request
          </Button>
        </div>
      </header>

      {/* Today's stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#DCE9E6] bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Today&apos;s requests</p>
              <p className="mt-1 text-3xl font-semibold text-slate-950 dark:text-white">
                {todayRequests.length}<span className="text-lg font-normal text-slate-400">/{target}</span>
              </p>
            </div>
            <span className={`grid h-12 w-12 place-items-center rounded-xl ${onTarget ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-[#E8F3F1] text-[#0B4F4B] dark:bg-[#133E3C] dark:text-[#8FD4C6]"}`}>
              <TrendingUp className="h-6 w-6" />
            </span>
          </div>
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between text-xs text-slate-400">
              <span>{onTarget ? "Target reached!" : `${target - todayRequests.length} more to hit target`}</span>
              <span>{pct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#E8F3F1] dark:bg-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-700 ${onTarget ? "bg-emerald-500" : "bg-[#0B4F4B]"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#DCE9E6] bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total requests</p>
          <p className="mt-1 text-3xl font-semibold text-slate-950 dark:text-white">{allRequests.length}</p>
          <div className="mt-3">
            <Badge tone={onTarget ? "success" : todayRequests.length > 0 ? "warning" : "default"}>
              {onTarget ? "On target" : todayRequests.length > 0 ? "In progress" : "Not started"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Today's requests list */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            Today&apos;s Requests
            <span className="ml-2 rounded-full bg-[#E8F3F1] px-2 py-0.5 text-[10px] font-bold text-[#0B4F4B] dark:bg-[#133E3C] dark:text-[#8FD4C6]">
              {todayRequests.length}/{target}
            </span>
          </h2>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-1 text-xs font-semibold text-[#0B4F4B] hover:underline dark:text-[#8FD4C6]">
            <Plus className="h-3 w-3" /> New
          </button>
        </div>

        {todayRequests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#DCE9E6] bg-white px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-[#E8F3F1] text-[#0B4F4B] dark:bg-[#133E3C] dark:text-[#8FD4C6]">
              <Users className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No requests submitted yet today</p>
            <p className="mt-1 text-xs text-slate-400">Target: {target} per day</p>
            <Button className="mt-4" onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4" /> Submit First Request
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {todayRequests.map((r, i) => (
              <RequestCard key={r.id} req={r} index={i} />
            ))}
            {todayRequests.length < target && (
              <button
                onClick={() => setShowModal(true)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#DCE9E6] py-3.5 text-sm font-semibold text-[#0B4F4B] transition hover:border-[#0B4F4B] hover:bg-[#F5F8F7] dark:border-slate-700 dark:text-[#8FD4C6]"
              >
                <Plus className="h-4 w-4" /> Add another request
              </button>
            )}
          </div>
        )}
      </section>

      {/* Past requests grouped by date */}
      {pastDates.length > 0 && (
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            History
          </h2>
          <div className="space-y-6">
            {pastDates.map(date => (
              <div key={date}>
                <div className="mb-2 flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{fmtDate(date)}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    {byDate[date].length} request{byDate[date].length !== 1 ? "s" : ""}
                  </span>
                  <div className="h-px flex-1 bg-[#DCE9E6] dark:bg-slate-800" />
                </div>
                <div className="space-y-2">
                  {byDate[date].map((r, i) => (
                    <RequestCard key={r.id} req={r} index={i} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {showModal && <RequestModal date={today} onClose={() => setShowModal(false)} />}
    </div>
  );
}
