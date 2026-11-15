"use client";

import { useEffect, useState } from "react";
import { Check, Clock3, LogIn, LogOut, MapPin, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { decide, loadRequests, onRequestsChanged, type ExcuseRequest, type VisitRequest } from "@/lib/requests-store";

type Filter = "pending" | "approved" | "rejected" | "all";
type Item =
  | { kind: "visit"; at: string; data: VisitRequest }
  | { kind: "excuse"; at: string; data: ExcuseRequest };

const filters: { key: Filter; label: string }[] = [
  { key: "pending", label: "Waiting" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Declined" },
  { key: "all", label: "All" },
];

export function ApprovalsWorkspace() {
  const [visits, setVisits] = useState<VisitRequest[]>([]);
  const [excuses, setExcuses] = useState<ExcuseRequest[]>([]);
  const [filter, setFilter] = useState<Filter>("pending");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const refresh = () => {
      const s = loadRequests();
      setVisits(s.visits);
      setExcuses(s.excuses);
    };
    refresh();
    setReady(true);
    return onRequestsChanged(refresh);
  }, []);

  const items: Item[] = [
    ...visits.map((data) => ({ kind: "visit" as const, at: data.date, data })),
    ...excuses.map((data) => ({ kind: "excuse" as const, at: data.date, data })),
  ]
    .filter((i) => filter === "all" || i.data.status === filter)
    .sort((a, b) => a.at.localeCompare(b.at));

  const waiting = visits.filter((v) => v.status === "pending").length + excuses.filter((e) => e.status === "pending").length;

  return (
    <div className="space-y-6 pb-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0B4F4B] dark:text-[#8FD4C6]">For CEO and GM</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">Approvals</h1>
        <p className="mt-1.5 text-sm text-slate-500">
          {ready && waiting > 0 ? `${waiting} request${waiting === 1 ? "" : "s"} waiting for a decision.` : "Nothing is waiting for a decision."}
        </p>
      </header>

      <div role="tablist" aria-label="Filter requests" className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-2xl border border-[#DCE9E6] bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
        {filters.map((f) => (
          <button
            key={f.key}
            role="tab"
            aria-selected={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition ${filter === f.key ? "bg-[#0B4F4B] text-white" : "text-slate-500 hover:text-[#0B4F4B] dark:text-slate-400"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {ready && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#DCE9E6] bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No requests here</p>
          <p className="mt-1 text-sm text-slate-500">Site visits and excuse requests from brokers and staff appear here.</p>
        </div>
      )}

      <ul className="grid gap-4 lg:grid-cols-2">
        {items.map((item) => (
          <li key={`${item.kind}-${item.data.id}`}>
            {item.kind === "visit" ? <VisitCard req={item.data} /> : <ExcuseCard req={item.data} />}
          </li>
        ))}
      </ul>
    </div>
  );
}

function VisitCard({ req }: { req: VisitRequest }) {
  const [note, setNote] = useState("");
  const [declining, setDeclining] = useState(false);
  const [approving, setApproving] = useState(false);

  // Smart default: if meeting starts before typical shift start (11 AM), enable check-in from meeting zone
  const meetingHour = parseInt(req.time.split(":")[0], 10);
  const suggestCheckInOverride = meetingHour < 11;

  const [overrideIn, setOverrideIn] = useState(suggestCheckInOverride);
  const [overrideOut, setOverrideOut] = useState(true);

  const tone = req.status === "approved" ? "success" : req.status === "rejected" ? "danger" : "warning";
  const label = req.status === "approved" ? "Approved" : req.status === "rejected" ? "Declined" : "Waiting";

  function confirmApprove() {
    decide("visit", req.id, "approved", undefined, { checkIn: overrideIn, checkOut: overrideOut });
    setApproving(false);
  }

  return (
    <article className="flex h-full flex-col rounded-2xl border border-[#DCE9E6] bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#E8F3F1] text-[#0B4F4B] dark:bg-[#133E3C] dark:text-[#8FD4C6]"><MapPin className="h-4 w-4" /></span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Site visit</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{req.employeeName}<span className="font-normal text-slate-500"> · {req.employeeRole}</span></p>
          </div>
        </div>
        <Badge tone={tone}>{label}</Badge>
      </div>

      <h2 className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">{req.projectName}</h2>
      <p className="text-sm text-slate-500">{req.date} at {req.time}</p>

      <dl className="mt-4 space-y-2 border-t border-[#DCE9E6] pt-4 text-sm dark:border-slate-800">
        {([["Client", `${req.clientName} · ${req.clientNumber}`], ["Zone", req.zone], ["Location", req.meetingLocation], ...(req.notes ? [["Notes", req.notes]] : [])] as [string, string][]).map(([k, v]) => (
          <div key={k} className="grid grid-cols-[88px_1fr] gap-3">
            <dt className="text-slate-500">{k}</dt>
            <dd className="text-slate-900 dark:text-slate-100">{v}</dd>
          </div>
        ))}
      </dl>

      {req.attendanceOverride && req.status === "approved" && (
        <div className="mt-3 flex flex-wrap gap-3 rounded-xl border border-[#DCE9E6] bg-[#E8F3F1] px-3 py-2.5 dark:border-slate-700 dark:bg-[#0d2f2d]">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-[#0B4F4B] dark:text-[#8FD4C6]">
            <LogIn className="h-3.5 w-3.5" />{req.attendanceOverride.checkIn ? "Check-in: meeting zone" : "Check-in: office"}
          </span>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-[#0B4F4B] dark:text-[#8FD4C6]">
            <LogOut className="h-3.5 w-3.5" />{req.attendanceOverride.checkOut ? "Check-out: meeting zone" : "Check-out: office"}
          </span>
        </div>
      )}

      {req.decisionNote && (
        <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">Note: {req.decisionNote}</p>
      )}

      {req.status === "pending" && (
        <div className="mt-auto pt-5">
          {declining ? (
            <div className="space-y-3">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Reason for declining (optional)</label>
              <input value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-xl border border-[#DCE9E6] bg-transparent px-3 py-2 text-sm dark:border-slate-700" />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setDeclining(false)}>Back</Button>
                <Button className="bg-rose-600 text-white hover:bg-rose-700" onClick={() => decide("visit", req.id, "rejected", note)}><X className="h-4 w-4" />Confirm decline</Button>
              </div>
            </div>
          ) : approving ? (
            <div className="space-y-3 rounded-xl border border-[#DCE9E6] bg-[#E8F3F1] p-4 dark:border-slate-700 dark:bg-[#0d2f2d]">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#0B4F4B] dark:text-[#8FD4C6]">Attendance override</p>
              <label className="flex cursor-pointer items-center gap-3">
                <input type="checkbox" checked={overrideIn} onChange={(e) => setOverrideIn(e.target.checked)} className="h-4 w-4 accent-[#0B4F4B]" />
                <span className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-200"><LogIn className="h-4 w-4 text-[#0B4F4B] dark:text-[#8FD4C6]" />Allow check-in from meeting zone</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3">
                <input type="checkbox" checked={overrideOut} onChange={(e) => setOverrideOut(e.target.checked)} className="h-4 w-4 accent-[#0B4F4B]" />
                <span className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-200"><LogOut className="h-4 w-4 text-[#0B4F4B] dark:text-[#8FD4C6]" />Allow check-out from meeting zone</span>
              </label>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" onClick={() => setApproving(false)}>Back</Button>
                <Button className="flex-1 bg-[#0B4F4B] text-white hover:bg-[#063C39]" onClick={confirmApprove}><Check className="h-4 w-4" />Confirm approve</Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button className="flex-1 bg-[#0B4F4B] text-white hover:bg-[#063C39]" onClick={() => setApproving(true)}><Check className="h-4 w-4" />Approve</Button>
              <Button variant="outline" className="flex-1" onClick={() => setDeclining(true)}>Decline</Button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function ExcuseCard({ req }: { req: ExcuseRequest }) {
  return (
    <Card
      icon={<Clock3 className="h-4 w-4" />}
      kind="Excuse"
      who={req.employeeName}
      role=""
      status={req.status}
      when={`${req.date} · ${req.slot} slot (1 hour)`}
      title={`${req.slot} excuse`}
      detail={[["Reason", req.reason]]}
      status_={req}
      onDecide={(status, note) => decide("excuse", req.id, status, note)}
    />
  );
}

type CardProps = {
  icon: React.ReactNode;
  kind: string;
  who: string;
  role: string;
  status: "pending" | "approved" | "rejected";
  when: string;
  title: string;
  detail: [string, string][];
  status_: VisitRequest | ExcuseRequest;
  onDecide: (status: "approved" | "rejected", note?: string) => void;
};

function Card({ icon, kind, who, role, status, when, title, detail, status_, onDecide }: CardProps) {
  const [note, setNote] = useState("");
  const [declining, setDeclining] = useState(false);
  const tone = status === "approved" ? "success" : status === "rejected" ? "danger" : "warning";
  const label = status === "approved" ? "Approved" : status === "rejected" ? "Declined" : "Waiting";

  return (
    <article className="flex h-full flex-col rounded-2xl border border-[#DCE9E6] bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#E8F3F1] text-[#0B4F4B] dark:bg-[#133E3C] dark:text-[#8FD4C6]">{icon}</span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{kind}</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{who}{role && <span className="font-normal text-slate-500"> · {role}</span>}</p>
          </div>
        </div>
        <Badge tone={tone}>{label}</Badge>
      </div>

      <h2 className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">{title}</h2>
      <p className="text-sm text-slate-500">{when}</p>

      <dl className="mt-4 space-y-2 border-t border-[#DCE9E6] pt-4 text-sm dark:border-slate-800">
        {detail.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[88px_1fr] gap-3">
            <dt className="text-slate-500">{k}</dt>
            <dd className="text-slate-900 dark:text-slate-100">{v}</dd>
          </div>
        ))}
      </dl>

      {status_.decisionNote && (
        <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">Note: {status_.decisionNote}</p>
      )}

      {status === "pending" && (
        <div className="mt-auto pt-5">
          {declining ? (
            <div className="space-y-3">
              <label htmlFor={`note-${status_.decidedAt ?? title}-${when}`} className="block text-xs font-medium text-slate-600 dark:text-slate-300">Reason for declining (optional)</label>
              <input
                id={`note-${status_.decidedAt ?? title}-${when}`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-xl border border-[#DCE9E6] bg-transparent px-3 py-2 text-sm dark:border-slate-700"
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setDeclining(false)}>Back</Button>
                <Button className="bg-rose-600 text-white hover:bg-rose-700" onClick={() => onDecide("rejected", note)}><X className="h-4 w-4" />Confirm decline</Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button className="flex-1 bg-[#0B4F4B] text-white hover:bg-[#063C39]" onClick={() => onDecide("approved")}><Check className="h-4 w-4" />Approve</Button>
              <Button variant="outline" className="flex-1" onClick={() => setDeclining(true)}>Decline</Button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
