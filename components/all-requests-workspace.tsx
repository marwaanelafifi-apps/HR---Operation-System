"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { loadCRMRequests, onCRMChanged, type CRMRequest } from "@/lib/crm-store";
import { employees } from "@/lib/mock-data";

const SALES_EMPLOYEES = employees.filter(e => e.department === "Sales");

function fmtDate(iso: string) {
  return new Date(`${iso}T00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtTime(iso: string) {
  try { return new Date(iso).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" }); } catch { return iso; }
}

export function AllRequestsWorkspace() {
  const [requests, setRequests] = useState<CRMRequest[]>([]);
  const [empFilter, setEmpFilter] = useState("all");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function refresh() { setRequests(loadCRMRequests()); }
    refresh();
    setReady(true);
    return onCRMChanged(refresh);
  }, []);

  if (!ready) return null;

  const filtered = empFilter === "all"
    ? requests
    : requests.filter(r => r.employeeId === empFilter);

  const sorted = [...filtered].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

  return (
    <div className="space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <p className="text-xs font-bold uppercase tracking-wider text-[#0B4F4B]">Management</p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">All Client Requests</h1>
        <p className="text-sm text-slate-500">Every client request submitted across all sales agents.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={empFilter}
          onChange={e => setEmpFilter(e.target.value)}
          className="rounded-xl border border-[#DCE9E6] bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#0B4F4B] focus:outline-none focus:ring-2 focus:ring-[#0B4F4B]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          <option value="all">All agents</option>
          {SALES_EMPLOYEES.map(e => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
        <span className="ml-auto text-sm text-slate-500">
          {sorted.length} record{sorted.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-[#DCE9E6] bg-[#F5F8F7] px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-800">
          <p className="text-slate-500">No client requests found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#DCE9E6] dark:border-slate-700">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="border-b border-[#DCE9E6] bg-[#F5F8F7] text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Agent</th>
                <th className="px-4 py-3 text-left">Client Name</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-left">Lead Source</th>
                <th className="px-4 py-3 text-left">Budget</th>
                <th className="px-4 py-3 text-left">Submitted</th>
                <th className="px-4 py-3 text-left">Feedback</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr
                  key={r.id}
                  className={`border-b border-[#DCE9E6] last:border-0 dark:border-slate-700 ${i % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-[#FAFCFB] dark:bg-slate-900/60"}`}
                >
                  <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">{fmtDate(r.date)}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-200 whitespace-nowrap">{r.employeeName}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{r.clientName}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{r.clientNumber || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge tone="default">{r.leadSource}</Badge>
                  </td>
                  <td className="px-4 py-3 font-semibold text-[#0B4F4B] dark:text-[#8FD4C6] whitespace-nowrap">{r.budget || "—"}</td>
                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{fmtTime(r.submittedAt)}</td>
                  <td className="px-4 py-3 max-w-xs text-slate-500 dark:text-slate-400">
                    <span className="line-clamp-2">{r.feedback || "—"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
