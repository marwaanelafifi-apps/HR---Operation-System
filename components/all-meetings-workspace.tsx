"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { loadRequests, type VisitRequest } from "@/lib/requests-store";
import { employees } from "@/lib/mock-data";

const SALES_EMPLOYEES = employees.filter(e => e.department === "Sales");

function fmtDate(iso: string) {
  return new Date(`${iso}T00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function statusTone(s: string): "success" | "warning" | "danger" | "default" {
  if (s === "approved") return "success";
  if (s === "pending") return "warning";
  if (s === "rejected") return "danger";
  return "default";
}

export function AllMeetingsWorkspace() {
  const [meetings, setMeetings] = useState<VisitRequest[]>([]);
  const [empFilter, setEmpFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function refresh() { setMeetings(loadRequests().visits); }
    refresh();
    setReady(true);
  }, []);

  if (!ready) return null;

  const filtered = meetings.filter(m => {
    if (empFilter !== "all") {
      const emp = SALES_EMPLOYEES.find(e => e.name === m.employeeName);
      if (!emp || emp.id !== empFilter) return false;
    }
    if (statusFilter !== "all" && m.status !== statusFilter) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date) || (b.time ?? "").localeCompare(a.time ?? ""));

  return (
    <div className="space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <p className="text-xs font-bold uppercase tracking-wider text-[#0B4F4B]">Management</p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">All Client Meetings</h1>
        <p className="text-sm text-slate-500">Every client meeting submitted across all sales agents.</p>
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
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="rounded-xl border border-[#DCE9E6] bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#0B4F4B] focus:outline-none focus:ring-2 focus:ring-[#0B4F4B]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <span className="ml-auto text-sm text-slate-500">
          {sorted.length} record{sorted.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-[#DCE9E6] bg-[#F5F8F7] px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-800">
          <p className="text-slate-500">No client meetings found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#DCE9E6] dark:border-slate-700">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-[#DCE9E6] bg-[#F5F8F7] text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Time</th>
                <th className="px-4 py-3 text-left">Agent</th>
                <th className="px-4 py-3 text-left">Client</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-left">Project</th>
                <th className="px-4 py-3 text-left">Zone</th>
                <th className="px-4 py-3 text-left">Location</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Notes</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((m, i) => (
                <tr
                  key={m.id}
                  className={`border-b border-[#DCE9E6] last:border-0 dark:border-slate-700 ${i % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-[#FAFCFB] dark:bg-slate-900/60"}`}
                >
                  <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">{fmtDate(m.date)}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{m.time || "—"}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-200 whitespace-nowrap">{m.employeeName}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{m.clientName}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{m.clientNumber || "—"}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{m.projectName || "—"}</td>
                  <td className="px-4 py-3 text-[#0B4F4B] dark:text-[#8FD4C6] whitespace-nowrap">{m.zone || "—"}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{m.meetingLocation || "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge tone={statusTone(m.status)} className="capitalize">{m.status}</Badge>
                  </td>
                  <td className="px-4 py-3 max-w-xs text-slate-500 dark:text-slate-400">
                    <span className="line-clamp-2">{m.outcomeNotes || m.notes || "—"}</span>
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
