"use client";

import { useEffect, useMemo, useState } from "react";
import { Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { loadRequests, onRequestsChanged, type VisitRequest } from "@/lib/requests-store";

type FilterBy = "all" | "employee";
function parseDateTime(date: string, time: string) { return new Date(`${date}T${time || "00:00"}`); }

export function FinanceWorkspace() {
  const [visits, setVisits] = useState<VisitRequest[]>([]);
  const [filter, setFilter] = useState<FilterBy>("all");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const refresh = () => {
      const allVisits = loadRequests().visits.filter(v => v.closed && v.transportationCost !== undefined);
      setVisits(allVisits.sort((a, b) => parseDateTime(b.date, b.time).getTime() - parseDateTime(a.date, a.time).getTime()));
    };
    refresh();
    setReady(true);
    return onRequestsChanged(refresh);
  }, []);

  const { expenses, employees, totals } = useMemo(() => {
    const employees = [...new Set(visits.map(v => v.employeeName))].sort();
    let filtered = visits;
    if (filter === "employee" && selectedEmployee) {
      filtered = visits.filter(v => v.employeeName === selectedEmployee);
    }
    const expenses = filtered;
    const totals = {
      count: expenses.length,
      cost: expenses.reduce((sum, v) => sum + (v.transportationCost ?? 0), 0),
      receipts: expenses.reduce((sum, v) => sum + (v.receipts?.length ?? 0), 0),
    };
    return { expenses, employees, totals };
  }, [visits, filter, selectedEmployee]);

  return (
    <div className="space-y-6 pb-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0B4F4B] dark:text-[#8FD4C6]">Finance</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">Meeting Expenses</h1>
        <p className="mt-1.5 text-sm text-slate-500">Track transportation costs and receipts from all closed site visits.</p>
      </header>

      {ready && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#DCE9E6] bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Expenses</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">EGP {totals.cost.toFixed(2)}</p>
            <p className="text-xs text-slate-400">{totals.count} meeting{totals.count === 1 ? "" : "s"}</p>
          </div>
          <div className="rounded-2xl border border-[#DCE9E6] bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Receipts</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{totals.receipts}</p>
            <p className="text-xs text-slate-400">file{totals.receipts === 1 ? "" : "s"} uploaded</p>
          </div>
          <div className="rounded-2xl border border-[#DCE9E6] bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Average Cost</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">EGP {totals.count > 0 ? (totals.cost / totals.count).toFixed(2) : "0.00"}</p>
            <p className="text-xs text-slate-400">per meeting</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Filter by:</label>
        <div role="tablist" aria-label="Filter expenses" className="flex gap-1 rounded-2xl border border-[#DCE9E6] bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
          {(["all", "employee"] as const).map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              onClick={() => { setFilter(f); if (f !== "employee") setSelectedEmployee(""); }}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${filter === f ? "bg-[#0B4F4B] text-white" : "text-slate-500 hover:text-[#0B4F4B] dark:text-slate-400"}`}
            >
              {f === "all" ? "All expenses" : "By employee"}
            </button>
          ))}
        </div>
        {filter === "employee" && (
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="rounded-xl border border-[#DCE9E6] bg-white px-4 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="">Select employee</option>
            {employees.map((emp) => (
              <option key={emp} value={emp}>{emp}</option>
            ))}
          </select>
        )}
      </div>

      {ready && expenses.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[#DCE9E6] bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No closed meetings yet</p>
          <p className="mt-1 text-sm text-slate-500">Meeting expenses will appear here once they are closed with receipts.</p>
        </div>
      )}

      <ul className="grid gap-4 lg:grid-cols-2">
        {expenses.map((visit) => (
          <li key={visit.id} className="rounded-2xl border border-[#DCE9E6] bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Site visit</p>
                  <span className="text-xs text-slate-500">#{visit.id.replace("omr-", "")}</span>
                </div>
                <h3 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{visit.projectName}</h3>
                <p className="text-sm text-slate-500">{visit.employeeName}</p>
              </div>
              <Badge tone="success">Closed</Badge>
            </div>

            <dl className="mt-4 space-y-2 border-t border-[#DCE9E6] pt-4 text-sm dark:border-slate-800">
              <div className="grid grid-cols-[88px_1fr] gap-3">
                <dt className="text-slate-500">Client</dt>
                <dd className="font-medium text-slate-900 dark:text-slate-100">{visit.clientName}</dd>
              </div>
              <div className="grid grid-cols-[88px_1fr] gap-3">
                <dt className="text-slate-500">Date</dt>
                <dd className="font-medium text-slate-900 dark:text-slate-100">{visit.date}</dd>
              </div>
              <div className="grid grid-cols-[88px_1fr] gap-3">
                <dt className="text-slate-500">Cost</dt>
                <dd className="font-semibold text-[#0B4F4B] dark:text-[#8FD4C6]">EGP {(visit.transportationCost ?? 0).toFixed(2)}</dd>
              </div>
            </dl>

            {visit.receipts && visit.receipts.length > 0 && (
              <div className="mt-4 border-t border-[#DCE9E6] pt-4 dark:border-slate-800">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Receipts ({visit.receipts.length})</p>
                <ul className="flex flex-wrap gap-2">
                  {visit.receipts.map((receipt, idx) => (
                    <li key={idx}>
                      <a
                        href={receipt}
                        download={`receipt-${visit.id}-${idx + 1}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#E8F3F1] px-3 py-1.5 text-xs font-medium text-[#0B4F4B] transition hover:bg-[#DCE9E6] dark:bg-slate-800 dark:text-[#8FD4C6]"
                      >
                        <Receipt className="h-3.5 w-3.5" />Receipt {idx + 1}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
