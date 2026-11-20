"use client";

import { useEffect, useState } from "react";
import { Clock3, FileText, Palmtree } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { loadRequests, onRequestsChanged, type ExcuseRequest } from "@/lib/requests-store";
import { loadHRRequests, onHRRequestsChanged, type LetterRequest, type VacationRequest } from "@/lib/hr-requests-store";

// ── Types ─────────────────────────────────────────────────────────────────────

type AnyRequest =
  | { kind: "excuse"; data: ExcuseRequest }
  | { kind: "vacation"; data: VacationRequest }
  | { kind: "letter"; data: LetterRequest };

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTs(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

function submittedAt(r: AnyRequest): string {
  if (r.kind === "excuse") return r.data.submittedAt;
  return r.data.submittedAt;
}

function employeeName(r: AnyRequest): string {
  return r.data.employeeName;
}

function StatusBadge({ status }: { status: "pending" | "approved" | "rejected" }) {
  const map = {
    pending: { tone: "warning" as const, label: "Waiting" },
    approved: { tone: "success" as const, label: "Approved" },
    rejected: { tone: "danger" as const, label: "Declined" },
  };
  return <Badge tone={map[status].tone}>{map[status].label}</Badge>;
}

// ── Detail row ────────────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-xs">
      <span className="shrink-0 font-medium text-slate-500">{label}:</span>
      <span className="text-slate-700 dark:text-slate-300">{value}</span>
    </div>
  );
}

function RequestCard({ req, showEmployee }: { req: AnyRequest; showEmployee: boolean }) {
  const decided = req.data.decidedAt;

  const icon = req.kind === "excuse"
    ? <Clock3 className="h-4 w-4" />
    : req.kind === "vacation"
    ? <Palmtree className="h-4 w-4" />
    : <FileText className="h-4 w-4" />;

  const kindLabel =
    req.kind === "excuse" ? "Excuse Request" :
    req.kind === "vacation" ? "Vacation Request" : "HR Letter";

  let title = "";
  let details: { label: string; value: string }[] = [];

  if (req.kind === "excuse") {
    const d = req.data;
    title = `${d.slot} slot — ${d.date}`;
    details = [
      { label: "Hours", value: `${d.hoursUsed}` },
      { label: "Reason", value: d.reason },
    ];
  } else if (req.kind === "vacation") {
    const d = req.data;
    const days = Math.round((new Date(d.toDate).getTime() - new Date(d.fromDate).getTime()) / 86400000) + 1;
    title = d.fromDate === d.toDate ? d.fromDate : `${d.fromDate} → ${d.toDate}`;
    details = [
      { label: "Days", value: `${days}` },
      { label: "Reason", value: d.reason },
    ];
  } else {
    const d = req.data;
    title = d.letterType;
    details = [
      { label: "Purpose", value: d.purpose },
      ...(d.addressedTo ? [{ label: "To", value: d.addressedTo }] : []),
      ...(d.neededBy ? [{ label: "Needed by", value: d.neededBy }] : []),
    ];
  }

  return (
    <article className="rounded-2xl border border-[#DCE9E6] bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#E8F3F1] text-[#0B4F4B] dark:bg-[#133E3C] dark:text-[#8FD4C6]">
            {icon}
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{kindLabel}</p>
            {showEmployee && (
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{req.data.employeeName}</p>
            )}
          </div>
        </div>
        <StatusBadge status={req.data.status} />
      </div>

      <p className="mt-3 font-semibold text-slate-900 dark:text-white">{title}</p>

      <div className="mt-2 space-y-1">
        {details.map(d => <DetailRow key={d.label} label={d.label} value={d.value} />)}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-[#DCE9E6] pt-3 dark:border-slate-800">
        <span className="text-xs text-slate-400">
          Submitted: <span className="font-medium text-slate-600 dark:text-slate-300">{fmtTs(submittedAt(req))}</span>
        </span>
        {decided && (
          <span className="text-xs text-slate-400">
            {req.data.status === "approved" ? "Approved" : "Declined"}:{" "}
            <span className="font-medium text-slate-600 dark:text-slate-300">{fmtTs(decided)}</span>
          </span>
        )}
        {req.data.decisionNote && (
          <span className="text-xs text-slate-400">
            Note: <span className="font-medium text-slate-600 dark:text-slate-300">{req.data.decisionNote}</span>
          </span>
        )}
      </div>
    </article>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  /** If set, show only this employee's requests. If undefined, show all. */
  employeeFilter?: string;
  showEmployeeColumn?: boolean;
}

export function HRRequestsHistory({ employeeFilter, showEmployeeColumn = false }: Props) {
  const [items, setItems] = useState<AnyRequest[]>([]);
  const [typeFilter, setTypeFilter] = useState<"all" | "excuse" | "vacation" | "letter">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [empSearch, setEmpSearch] = useState("");

  useEffect(() => {
    const refresh = () => {
      const main = loadRequests();
      const hr = loadHRRequests();
      const all: AnyRequest[] = [
        ...main.excuses.map(d => ({ kind: "excuse" as const, data: d })),
        ...hr.vacations.map(d => ({ kind: "vacation" as const, data: d })),
        ...hr.letters.map(d => ({ kind: "letter" as const, data: d })),
      ];
      all.sort((a, b) => submittedAt(b).localeCompare(submittedAt(a)));
      setItems(all);
    };
    refresh();
    const u1 = onRequestsChanged(refresh);
    const u2 = onHRRequestsChanged(refresh);
    return () => { u1(); u2(); };
  }, []);

  const filtered = items.filter(r => {
    if (employeeFilter && employeeName(r) !== employeeFilter) return false;
    if (typeFilter !== "all" && r.kind !== typeFilter) return false;
    if (statusFilter !== "all" && r.data.status !== statusFilter) return false;
    if (empSearch && !employeeName(r).toLowerCase().includes(empSearch.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {showEmployeeColumn && (
          <input
            type="text"
            placeholder="Search employee…"
            value={empSearch}
            onChange={e => setEmpSearch(e.target.value)}
            className="rounded-xl border border-[#DCE9E6] bg-white px-3 py-2 text-sm outline-none focus:border-[#0B4F4B] dark:border-slate-700 dark:bg-slate-900"
          />
        )}

        <div className="flex gap-1 rounded-xl border border-[#DCE9E6] bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
          {(["all", "excuse", "vacation", "letter"] as const).map(k => (
            <button key={k} onClick={() => setTypeFilter(k)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${typeFilter === k ? "bg-[#0B4F4B] text-white" : "text-slate-500 hover:text-[#0B4F4B]"}`}>
              {k === "all" ? "All types" : k === "excuse" ? "Excuses" : k === "vacation" ? "Vacations" : "HR Letters"}
            </button>
          ))}
        </div>

        <div className="flex gap-1 rounded-xl border border-[#DCE9E6] bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
          {(["all", "pending", "approved", "rejected"] as const).map(k => (
            <button key={k} onClick={() => setStatusFilter(k)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${statusFilter === k ? "bg-[#0B4F4B] text-white" : "text-slate-500 hover:text-[#0B4F4B]"}`}>
              {k === "all" ? "All status" : k === "pending" ? "Waiting" : k === "approved" ? "Approved" : "Declined"}
            </button>
          ))}
        </div>

        <span className="ml-auto text-xs text-slate-400">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#DCE9E6] bg-white py-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-400">No requests match this filter.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(r => (
            <RequestCard key={`${r.kind}-${r.data.id}`} req={r} showEmployee={showEmployeeColumn} />
          ))}
        </div>
      )}
    </div>
  );
}
