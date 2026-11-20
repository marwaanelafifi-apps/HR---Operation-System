"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, Check, CheckCircle2, Clock3, Hash, Lock, MapPin, Phone, Plus, Receipt, StickyNote, Trash2, User, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { closeVisit, loadRequests, onRequestsChanged, type VisitRequest } from "@/lib/requests-store";
import { OutsideMeetingForm } from "@/components/outside-meeting-form";

const ME = "Ahmed Khalil"; // demo user

type Tab = "upcoming" | "pending" | "past";

function todayISO() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function parseDateTime(date: string, time: string) { return new Date(`${date}T${time || "00:00"}`); }
function friendlyDate(iso: string) {
  const d = new Date(`${iso}T00:00`);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return d.toLocaleDateString("en", { month: "short", day: "numeric", year: diff < -180 || diff > 180 ? "numeric" : undefined });
}
function timeLabel(t: string) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

// A visit is "needs closure" when it's approved, dated today or earlier, and not yet closed.
function needsClosure(v: VisitRequest) {
  return v.status === "approved" && v.date <= todayISO() && !v.closed;
}

export function MeetingsWorkspace() {
  const [visits, setVisits] = useState<VisitRequest[]>([]);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [detailsFor, setDetailsFor] = useState<VisitRequest | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const refresh = () => setVisits(loadRequests().visits.filter(v => v.employeeName === ME));
    refresh();
    return onRequestsChanged(refresh);
  }, []);

  // Keep the modal's visit in sync with store updates (so after closing, UI updates)
  useEffect(() => {
    if (!detailsFor) return;
    const fresh = visits.find(v => v.id === detailsFor.id);
    if (fresh && fresh !== detailsFor) setDetailsFor(fresh);
  }, [visits, detailsFor]);

  const { upcoming, pending, past, counts, openClosures } = useMemo(() => {
    const today = todayISO();
    const sorted = [...visits].sort((a, b) => parseDateTime(a.date, a.time).getTime() - parseDateTime(b.date, b.time).getTime());
    // Upcoming = approved + future-dated
    const upcoming = sorted.filter(v => v.status === "approved" && v.date > today);
    const pending = sorted.filter(v => v.status === "pending");
    // Past = everything else (today's approved, closed, rejected, old dates) with newest first
    const past = sorted.filter(v => (v.status === "approved" && v.date <= today) || v.status === "rejected").reverse();
    const openClosures = visits.filter(needsClosure);
    return { upcoming, pending, past, counts: { upcoming: upcoming.length, pending: pending.length, past: past.length }, openClosures };
  }, [visits]);

  const list = tab === "upcoming" ? upcoming : tab === "pending" ? pending : past;

  return (
    <div className="pb-8">
      {/* Header */}
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0B4F4B] dark:text-[#8FD4C6]">Sales</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white sm:text-4xl">Meetings</h1>
          <p className="mt-1.5 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Submit client meeting requests, track approvals, and close every meeting with its outcome.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-[#0B4F4B] text-white hover:bg-[#063C39]">
          <Plus className="h-4 w-4" />New Client Meeting
        </Button>
      </header>

      {/* Closure reminder */}
      {openClosures.length > 0 && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-900/60 dark:bg-amber-950/20">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              {openClosures.length} meeting{openClosures.length === 1 ? "" : "s"} waiting to be closed
            </p>
            <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-300">
              You must add outcome notes for every past meeting <strong>before today&apos;s checkout</strong>. Open each one below to close it.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <Metric label="Upcoming" value={String(counts.upcoming)} detail="Approved — ready to go" tone="emerald" />
        <Metric label="Awaiting approval" value={String(counts.pending)} detail={counts.pending === 0 ? "Nothing to review" : "CEO / GM to approve"} tone="amber" />
        <Metric label="Past" value={String(counts.past)} detail="Completed or declined" tone="slate" />
      </section>

      {/* Tabs */}
      <div role="tablist" aria-label="Filter meetings" className="mb-4 flex w-full gap-1 overflow-x-auto rounded-2xl border border-[#DCE9E6] bg-white p-1 dark:border-slate-800 dark:bg-slate-900 sm:w-fit">
        <TabButton label="Upcoming" count={counts.upcoming} active={tab === "upcoming"} onClick={() => setTab("upcoming")} />
        <TabButton label="Pending" count={counts.pending} active={tab === "pending"} onClick={() => setTab("pending")} />
        <TabButton label="Past" count={counts.past} active={tab === "past"} onClick={() => setTab("past")} />
      </div>

      {/* Table view */}
      {list.length === 0 ? (
        <EmptyState tab={tab} onNew={() => setShowForm(true)} />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-[#DCE9E6] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#F5F8F7] text-left dark:bg-slate-800/60">
                <tr>
                  <Th>Date / Time</Th>
                  <Th>Project</Th>
                  <Th>Client</Th>
                  <Th>Zone</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Action</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE9E6] dark:divide-slate-800">
                {list.map(v => (
                  <tr key={v.id} className="transition hover:bg-[#F5F8F7]/60 dark:hover:bg-slate-800/40">
                    <Td>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{friendlyDate(v.date)}</p>
                        <p className="text-xs text-slate-500">{timeLabel(v.time)}</p>
                      </div>
                    </Td>
                    <Td>
                      <p className="font-semibold text-slate-900 dark:text-white">{v.projectName}</p>
                      {v.closed && <p className="mt-0.5 flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="h-3 w-3" />Closed</p>}
                    </Td>
                    <Td>
                      <p className="text-slate-900 dark:text-slate-100">{v.clientName}</p>
                      <p className="text-xs text-slate-500">{v.clientNumber}</p>
                    </Td>
                    <Td className="text-slate-700 dark:text-slate-300">{v.zone}</Td>
                    <Td><StatusCell v={v} /></Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1.5">
                        {needsClosure(v) && (
                          <Button onClick={() => setDetailsFor(v)} className="bg-amber-500 px-3 py-1.5 text-xs text-white hover:bg-amber-600">
                            Close
                          </Button>
                        )}
                        <Button variant="outline" onClick={() => setDetailsFor(v)} className="px-3 py-1.5 text-xs">
                          View
                        </Button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {detailsFor && <DetailsDialog visit={detailsFor} onClose={() => setDetailsFor(null)} />}
      {showForm && <FormDialog onClose={() => setShowForm(false)} />}
    </div>
  );
}

// ─── Table cell helpers ───────────────────────────────────────────────────────

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 ${className ?? ""}`}>{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-5 py-4 align-top ${className ?? ""}`}>{children}</td>;
}

function StatusCell({ v }: { v: VisitRequest }) {
  if (v.closed) return <Badge tone="info">Closed</Badge>;
  if (v.status === "approved" && needsClosure(v)) return <Badge tone="warning">Needs closure</Badge>;
  if (v.status === "approved") return <Badge tone="success">Approved</Badge>;
  if (v.status === "pending") return <Badge tone="warning">Pending</Badge>;
  return <Badge tone="danger">Declined</Badge>;
}

function StatusBadge({ status, closed }: { status: "pending" | "approved" | "rejected"; closed?: boolean }) {
  if (closed) return <Badge tone="info">Closed</Badge>;
  const map = { pending: { tone: "warning" as const, label: "Pending" }, approved: { tone: "success" as const, label: "Approved" }, rejected: { tone: "danger" as const, label: "Declined" } };
  return <Badge tone={map[status].tone}>{map[status].label}</Badge>;
}

function TabButton({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition sm:flex-initial ${active ? "bg-[#0B4F4B] text-white" : "text-slate-500 hover:text-[#0B4F4B] dark:text-slate-400"}`}
    >
      {label}
      <span className={`inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold ${active ? "bg-white/20 text-white" : "bg-[#E8F3F1] text-[#0B4F4B] dark:bg-slate-800 dark:text-[#8FD4C6]"}`}>{count}</span>
    </button>
  );
}

function EmptyState({ tab, onNew }: { tab: Tab; onNew: () => void }) {
  const copy = {
    upcoming: { title: "No upcoming meetings", body: "Approved client meetings will show up here once the CEO / GM approves them." },
    pending: { title: "No pending requests", body: "Submitted meeting requests awaiting approval will appear here." },
    past: { title: "No past meetings yet", body: "Completed and declined visits are archived here." },
  }[tab];
  return (
    <div className="rounded-3xl border border-dashed border-[#DCE9E6] bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#E8F3F1] dark:bg-[#133E3C]">
        <CalendarDays className="h-7 w-7 text-[#0B4F4B] dark:text-[#8FD4C6]" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">{copy.title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{copy.body}</p>
      <Button onClick={onNew} className="mt-5 bg-[#0B4F4B] text-white hover:bg-[#063C39]">
        <Plus className="h-4 w-4" />Request a client meeting
      </Button>
    </div>
  );
}

// ─── Details / close dialog ───────────────────────────────────────────────────

function DetailsDialog({ visit, onClose }: { visit: VisitRequest; onClose: () => void }) {
  const [closing, setClosing] = useState(false);
  const [outcome, setOutcome] = useState("");
  const [cost, setCost] = useState("");
  const [receipts, setReceipts] = useState<File[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", esc); document.body.style.overflow = ""; };
  }, [onClose]);

  const submitClose = async () => {
    if (outcome.trim().length < 10) { setErr("Outcome notes must be at least 10 characters."); return; }
    const costNum = parseFloat(cost);
    if (!cost.trim() || isNaN(costNum) || costNum <= 0) { setErr("Transportation cost must be a valid positive number (EGP)."); return; }
    if (receipts.length === 0) { setErr("At least one receipt file is required."); return; }

    // Convert files to base64
    const receiptData: string[] = [];
    for (const file of receipts) {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      receiptData.push(base64);
    }

    closeVisit(visit.id, outcome, costNum, receiptData);
    setClosing(false);
    setOutcome("");
    setCost("");
    setReceipts([]);
    setErr(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[#DCE9E6] px-6 py-5 dark:border-slate-800">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <StatusBadge status={visit.status} closed={visit.closed} />
              <span className="text-xs text-slate-400">#{visit.id.replace("omr-", "")}</span>
            </div>
            <h2 className="mt-2 truncate text-xl font-semibold tracking-tight text-slate-950 dark:text-white">{visit.projectName}</h2>
            <p className="mt-0.5 text-sm text-slate-500">{friendlyDate(visit.date)} · {timeLabel(visit.time)}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-[#E8F3F1] hover:text-[#0B4F4B] dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {needsClosure(visit) && !closing && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/60 dark:bg-amber-950/20">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div className="flex-1 text-xs leading-5 text-amber-800 dark:text-amber-200">
                This meeting hasn&apos;t been closed yet. <strong>Outcome notes are required before today&apos;s checkout.</strong>
              </div>
            </div>
          )}

          <DetailGroup title="Client">
            <DetailRow icon={<User className="h-4 w-4" />} label="Name" value={visit.clientName} />
            <DetailRow icon={<Phone className="h-4 w-4" />} label="Number" value={visit.clientNumber} />
          </DetailGroup>

          <DetailGroup title="Location">
            <DetailRow icon={<Hash className="h-4 w-4" />} label="Zone" value={visit.zone} />
            <DetailRow icon={<MapPin className="h-4 w-4" />} label="Address" value={visit.meetingLocation} />
          </DetailGroup>

          <DetailGroup title="Schedule">
            <DetailRow icon={<CalendarDays className="h-4 w-4" />} label="Date" value={visit.date} />
            <DetailRow icon={<Clock3 className="h-4 w-4" />} label="Time" value={timeLabel(visit.time)} />
            <DetailRow icon={<Clock3 className="h-4 w-4" />} label="Submitted" value={visit.submittedAt} />
            {visit.decidedAt && <DetailRow icon={<Clock3 className="h-4 w-4" />} label={visit.status === "approved" ? "Approved" : "Decided"} value={visit.decidedAt} />}
            {visit.closedAt && <DetailRow icon={<CheckCircle2 className="h-4 w-4" />} label="Closed" value={visit.closedAt} />}
          </DetailGroup>

          {visit.notes && (
            <DetailGroup title="Request notes">
              <div className="flex items-start gap-3 rounded-xl bg-[#F5F8F7] px-4 py-3 text-sm dark:bg-slate-800">
                <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <p className="leading-6 text-slate-700 dark:text-slate-200">{visit.notes}</p>
              </div>
            </DetailGroup>
          )}

          {visit.decisionNote && (
            <DetailGroup title="Decision note">
              <div className="rounded-xl bg-[#F5F8F7] px-4 py-3 text-sm dark:bg-slate-800">
                <p className="text-slate-700 dark:text-slate-200">{visit.decisionNote}</p>
              </div>
            </DetailGroup>
          )}

          {visit.outcomeNotes && (
            <DetailGroup title="Outcome">
              <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm dark:bg-emerald-950/20">
                <p className="text-slate-700 dark:text-slate-200">{visit.outcomeNotes}</p>
              </div>
            </DetailGroup>
          )}

          {visit.transportationCost !== undefined && (
            <DetailGroup title="Expenses">
              <DetailRow icon={<Receipt className="h-4 w-4" />} label="Transportation" value={`EGP ${visit.transportationCost.toFixed(2)}`} />
              {visit.receipts && visit.receipts.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-medium text-slate-500">Receipts ({visit.receipts.length} file{visit.receipts.length === 1 ? "" : "s"})</p>
                  <ul className="space-y-1">
                    {visit.receipts.map((receipt, idx) => (
                      <li key={idx} className="text-xs">
                        <a href={receipt} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#0B4F4B] hover:underline dark:text-[#8FD4C6]">
                          <Receipt className="h-3 w-3" />Receipt {idx + 1}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </DetailGroup>
          )}

          {/* Close-meeting form */}
          {closing && (
            <div className="space-y-4 rounded-2xl border border-[#DCE9E6] bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50">
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Outcome notes <span className="text-rose-500">*</span></span>
                <p className="mt-0.5 text-xs text-slate-500">Describe what happened: client interest, next steps, blockers, follow-up date.</p>
                <textarea
                  rows={4}
                  value={outcome}
                  onChange={e => { setOutcome(e.target.value); if (err) setErr(null); }}
                  placeholder="e.g. Client viewed Units 4A and 5B. Interested in 5B at EGP 8.5M. Follow-up scheduled for next Tuesday with paperwork."
                  className={`mt-2 w-full resize-none rounded-xl border bg-transparent px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-1 dark:text-white ${err ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200" : "border-[#DCE9E6] focus:border-[#0B4F4B] focus:ring-[#0B4F4B]/20 dark:border-slate-700"}`}
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Transportation cost (EGP) <span className="text-rose-500">*</span></span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={cost}
                  onChange={e => { setCost(e.target.value); if (err) setErr(null); }}
                  placeholder="e.g. 500"
                  className={`mt-2 w-full rounded-xl border bg-transparent px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-1 dark:text-white ${err ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200" : "border-[#DCE9E6] focus:border-[#0B4F4B] focus:ring-[#0B4F4B]/20 dark:border-slate-700"}`}
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Receipt attachments <span className="text-rose-500">*</span></span>
                <p className="mt-0.5 text-xs text-slate-500">Upload at least one receipt (fuel, tolls, parking, etc.)</p>
                <div className="mt-2 rounded-xl border-2 border-dashed border-[#DCE9E6] bg-[#F5F8F7] p-4 text-center transition hover:border-[#0B4F4B] dark:border-slate-700 dark:bg-slate-800">
                  <input
                    type="file"
                    multiple
                    onChange={e => {
                      const files = Array.from(e.target.files || []);
                      setReceipts(prev => [...prev, ...files]);
                      if (err) setErr(null);
                      e.target.value = "";
                    }}
                    className="hidden"
                    id="receipt-input"
                    accept="image/*,.pdf"
                  />
                  <label htmlFor="receipt-input" className="block cursor-pointer">
                    <Receipt className="mx-auto h-5 w-5 text-slate-400" />
                    <p className="mt-2 text-xs font-medium text-slate-600 dark:text-slate-300">Click to upload or drag files</p>
                    <p className="text-xs text-slate-500">PNG, JPG, PDF</p>
                  </label>
                </div>
                {receipts.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {receipts.map((file, idx) => (
                      <li key={idx} className="flex items-center justify-between rounded-lg bg-[#E8F3F1] px-3 py-2 text-xs dark:bg-slate-800">
                        <span className="text-slate-700 dark:text-slate-200">{file.name}</span>
                        <button type="button" onClick={() => setReceipts(prev => prev.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-rose-500">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </label>

              {err && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 dark:bg-rose-950/30 dark:text-rose-400">{err}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap justify-end gap-2 border-t border-[#DCE9E6] bg-[#F5F8F7]/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/50">
          {closing ? (
            <>
              <Button variant="outline" onClick={() => { setClosing(false); setErr(null); }}>Cancel</Button>
              <Button onClick={submitClose} className="bg-[#0B4F4B] text-white hover:bg-[#063C39]"><Check className="h-4 w-4" />Close meeting</Button>
            </>
          ) : needsClosure(visit) ? (
            <>
              <Button variant="outline" onClick={onClose}>Close</Button>
              <Button onClick={() => setClosing(true)} className="bg-amber-500 text-white hover:bg-amber-600"><Lock className="h-4 w-4" />Close with notes</Button>
            </>
          ) : (
            <Button variant="outline" onClick={onClose}>Close</Button>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="mt-0.5 text-slate-400">{icon}</span>
      <span className="w-24 shrink-0 text-slate-500">{label}</span>
      <span className="flex-1 font-medium text-slate-900 dark:text-slate-100">{value}</span>
    </div>
  );
}

// ─── Form dialog ──────────────────────────────────────────────────────────────

function FormDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", esc); document.body.style.overflow = ""; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#DCE9E6] px-6 py-5 dark:border-slate-800">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0B4F4B] dark:text-[#8FD4C6]">Client Meeting</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950 dark:text-white">Request a new client meeting</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-[#E8F3F1] hover:text-[#0B4F4B] dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        {/* Scrollable form body */}
        <div className="flex-1 overflow-y-auto">
          <OutsideMeetingForm onDone={onClose} />
        </div>
      </div>
    </div>
  );
}

// ─── Metric card ──────────────────────────────────────────────────────────────

function Metric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: "emerald" | "amber" | "slate" }) {
  const color = { emerald: "bg-emerald-500", amber: "bg-amber-500", slate: "bg-slate-400" }[tone];
  return (
    <div className="rounded-2xl border border-[#DCE9E6] bg-white px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <span className={`h-2 w-2 rounded-full ${color}`} />{label}
      </div>
      <div className="mt-2 flex items-end justify-between">
        <p className="text-2xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">{value}</p>
        <p className="text-xs text-slate-400">{detail}</p>
      </div>
    </div>
  );
}
