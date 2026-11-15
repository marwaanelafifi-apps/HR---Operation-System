"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Check, Clock3, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { addExcuse, loadRequests, onRequestsChanged, type ExcuseRequest } from "@/lib/requests-store";

type Slot = "Morning" | "Evening";
type FormState = "idle" | "submitting" | "submitted";

// Demo: the signed-in user is Ahmed Khalil. Pending and approved excuses both count against the 4-hour balance.
const MONTHLY_LIMIT = 4;
const CURRENT_USER = "Ahmed Khalil";

export function ExcuseRequestForm() {
  const [state, setState] = useState<FormState>("idle");
  const [mine, setMine] = useState<ExcuseRequest[]>([]);

  useEffect(() => {
    const month = new Date().toISOString().slice(0, 7);
    const refresh = () => setMine(loadRequests().excuses.filter(r => r.employeeName === CURRENT_USER && r.date.slice(0, 7) === month));
    refresh();
    return onRequestsChanged(refresh);
  }, []);

  const HOURS_USED = mine.filter(r => r.status !== "rejected").reduce((sum, r) => sum + r.hoursUsed, 0);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    slot: "" as Slot | "",
    reason: "",
  });

  const remaining = MONTHLY_LIMIT - HOURS_USED;
  const exhausted = remaining <= 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (exhausted || !form.slot) return;
    addExcuse({ employeeName: CURRENT_USER, date: form.date, slot: form.slot, reason: form.reason.trim() });
    setState("submitted");
  };

  if (state === "submitted") {
    return (
      <div className="rounded-3xl border border-[#DCE9E6] bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#E8F3F1] dark:bg-[#133E3C]">
          <Check className="h-7 w-7 text-[#0B4F4B] dark:text-[#8FD4C6]" />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-slate-950 dark:text-white">Excuse request submitted</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          Your request is pending approval. You have <b>{Math.max(remaining, 0)} hour{remaining !== 1 ? "s" : ""}</b> remaining this month.
        </p>
        <Button
          className="mt-6 bg-[#0B4F4B] text-white hover:bg-[#063C39]"
          onClick={() => { setState("idle"); setForm({ date: new Date().toISOString().split("T")[0], slot: "", reason: "" }); }}
        >
          Submit another
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* Form */}
      <div className="rounded-3xl border border-[#DCE9E6] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-[#DCE9E6] px-6 py-5 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-950 dark:text-white">New excuse request</h2>
          <p className="mt-1 text-sm text-slate-500">Request a late arrival (morning) or early departure (evening) — 1 hour each.</p>
        </div>

        {/* Balance bar */}
        <div className="border-b border-[#DCE9E6] px-6 py-4 dark:border-slate-800">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Monthly excuse balance</span>
            <span className={`font-semibold ${remaining <= 1 ? "text-rose-600" : "text-[#0B4F4B] dark:text-[#8FD4C6]"}`}>
              {remaining} / {MONTHLY_LIMIT} hrs remaining
            </span>
          </div>
          <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-[#E8F3F1] dark:bg-slate-800">
            <div
              className={`h-2 rounded-full transition-all ${remaining <= 1 ? "bg-rose-500" : "bg-[#0B4F4B]"}`}
              style={{ width: `${(remaining / MONTHLY_LIMIT) * 100}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-slate-400">
            <span>{HOURS_USED} hr{HOURS_USED !== 1 ? "s" : ""} used</span>
            <span>Resets Dec 1</span>
          </div>
        </div>

        {exhausted && (
          <div className="mx-6 mt-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-900/60 dark:bg-rose-950/30">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <p className="text-xs leading-5 text-rose-800 dark:text-rose-200">
              You&apos;ve used all 4 excuse hours this month. Additional absences may result in a salary deduction. Contact HR or your manager if you have an urgent situation.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <FormField label="Date" required>
            <input
              required
              type="date"
              value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })}
            />
          </FormField>

          <div>
            <p className="mb-2.5 text-sm font-medium text-slate-700 dark:text-slate-300">
              Time slot <span className="text-rose-500">*</span>
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {(["Morning", "Evening"] as Slot[]).map(slot => (
                <label
                  key={slot}
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                    form.slot === slot
                      ? "border-[#0B4F4B] bg-[#E8F3F1] dark:border-[#8FD4C6] dark:bg-[#133E3C]"
                      : "border-[#DCE9E6] hover:border-[#0B4F4B]/40 dark:border-slate-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="slot"
                    value={slot}
                    required
                    checked={form.slot === slot}
                    onChange={() => setForm({ ...form, slot })}
                    className="mt-0.5 accent-[#0B4F4B]"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{slot} — 1 hour</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {slot === "Morning" ? "Late arrival — shift starts 1 hr later" : "Early departure — leaves 1 hr before shift ends"}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <FormField label="Reason" required>
            <textarea
              required
              rows={3}
              value={form.reason}
              onChange={e => setForm({ ...form, reason: e.target.value })}
              placeholder="e.g. Doctor appointment — will arrive by 12:30 PM."
              className="resize-none"
            />
          </FormField>

          <div className="flex items-start gap-3 rounded-2xl border border-[#DCE9E6] bg-[#F5F8F7] px-4 py-3 dark:border-slate-800 dark:bg-slate-800">
            <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[#6C807C]" />
            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
              Each approved excuse deducts 1 hour from your monthly balance of 4 hours. Balance resets on the 1st of each month.
            </p>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              disabled={state === "submitting" || exhausted}
              className="bg-[#0B4F4B] text-white hover:bg-[#063C39] disabled:opacity-60"
            >
              {state === "submitting" ? "Submitting…" : "Submit request"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>

      {/* Sidebar: this month's requests */}
      <div className="space-y-4">
        <div className="rounded-3xl border border-[#DCE9E6] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-[#DCE9E6] px-5 py-4 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-950 dark:text-white">My requests this month</h3>
          </div>
          <div className="divide-y divide-[#DCE9E6] dark:divide-slate-800">
            {mine.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-slate-400">No requests yet this month.</p>
            ) : (
              mine.map(req => (
                <div key={req.id} className="flex items-start gap-3 px-5 py-4">
                  <div className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl ${req.slot === "Morning" ? "bg-amber-50 dark:bg-amber-950/40" : "bg-[#E8F3F1] dark:bg-[#063C39]/40"}`}>
                    <Clock3 className={`h-4 w-4 ${req.slot === "Morning" ? "text-amber-600" : "text-[#0B4F4B]"}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{req.slot} slot</p>
                    <p className="text-xs text-slate-500">{req.date}</p>
                    <p className="mt-0.5 text-xs text-slate-400 line-clamp-1">{req.reason}</p>
                  </div>
                  <StatusBadge status={req.status} />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[#DCE9E6] bg-[#F5F8F7] p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-semibold text-[#0B4F4B] dark:text-[#8FD4C6]">November 2026</p>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <Stat label="Hours used" value={`${HOURS_USED} / ${MONTHLY_LIMIT}`} />
            <Stat label="Remaining" value={`${remaining} hr${remaining !== 1 ? "s" : ""}`} accent={remaining <= 1} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-[#DCE9E6] bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${accent ? "text-rose-600" : "text-slate-900 dark:text-white"}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: "pending" | "approved" | "rejected" }) {
  const map = {
    pending: { tone: "warning" as const, label: "Pending" },
    approved: { tone: "success" as const, label: "Approved" },
    rejected: { tone: "danger" as const, label: "Rejected" },
  };
  return <Badge tone={map[status].tone}>{map[status].label}</Badge>;
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}{required && <span className="ml-0.5 text-rose-500">*</span>}
      </span>
      <span className="block [&>input]:w-full [&>input]:rounded-xl [&>input]:border [&>input]:border-[#DCE9E6] [&>input]:bg-transparent [&>input]:px-3.5 [&>input]:py-2.5 [&>input]:text-sm [&>input]:outline-none [&>input]:transition [&>input]:focus:border-[#0B4F4B] [&>textarea]:w-full [&>textarea]:rounded-xl [&>textarea]:border [&>textarea]:border-[#DCE9E6] [&>textarea]:bg-transparent [&>textarea]:px-3.5 [&>textarea]:py-2.5 [&>textarea]:text-sm [&>textarea]:outline-none [&>textarea]:transition [&>textarea]:focus:border-[#0B4F4B] dark:[&>input]:border-slate-700 dark:[&>textarea]:border-slate-700">
        {children}
      </span>
    </label>
  );
}
