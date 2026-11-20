"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Check, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { addLetter, loadHRRequests, onHRRequestsChanged, type LetterRequest } from "@/lib/hr-requests-store";

type FormState = "idle" | "submitted";

const CURRENT_USER = "Ahmed Khalil";

const LETTER_TYPES = [
  "Salary Certificate",
  "Employment Certificate",
];

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}{required && <span className="ml-0.5 text-rose-500">*</span>}
      </span>
      <span className="block [&>input]:w-full [&>input]:rounded-xl [&>input]:border [&>input]:border-[#DCE9E6] [&>input]:bg-transparent [&>input]:px-3.5 [&>input]:py-2.5 [&>input]:text-sm [&>input]:outline-none [&>input]:transition [&>input]:focus:border-[#0B4F4B] [&>select]:w-full [&>select]:rounded-xl [&>select]:border [&>select]:border-[#DCE9E6] [&>select]:bg-transparent [&>select]:px-3.5 [&>select]:py-2.5 [&>select]:text-sm [&>select]:outline-none [&>select]:transition [&>select]:focus:border-[#0B4F4B] [&>textarea]:w-full [&>textarea]:rounded-xl [&>textarea]:border [&>textarea]:border-[#DCE9E6] [&>textarea]:bg-transparent [&>textarea]:px-3.5 [&>textarea]:py-2.5 [&>textarea]:text-sm [&>textarea]:outline-none [&>textarea]:transition [&>textarea]:focus:border-[#0B4F4B] dark:[&>input]:border-slate-700 dark:[&>select]:border-slate-700 dark:[&>textarea]:border-slate-700">
        {children}
      </span>
    </label>
  );
}

function StatusBadge({ status }: { status: "pending" | "approved" | "rejected" }) {
  const map = { pending: { tone: "warning" as const, label: "Pending" }, approved: { tone: "success" as const, label: "Approved" }, rejected: { tone: "danger" as const, label: "Rejected" } };
  return <Badge tone={map[status].tone}>{map[status].label}</Badge>;
}

export function HRLetterRequestForm() {
  const today = new Date().toISOString().split("T")[0];
  const [state, setState] = useState<FormState>("idle");
  const [records, setRecords] = useState<LetterRequest[]>([]);
  const [form, setForm] = useState({ letterType: "", addressedTo: "", purpose: "", neededBy: "" });

  useEffect(() => {
    const refresh = () => setRecords(loadHRRequests().letters.filter(r => r.employeeName === CURRENT_USER));
    refresh();
    return onHRRequestsChanged(refresh);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addLetter({ employeeName: CURRENT_USER, letterType: form.letterType, addressedTo: form.addressedTo.trim(), purpose: form.purpose.trim(), neededBy: form.neededBy });
    setState("submitted");
  };

  if (state === "submitted") {
    return (
      <div className="rounded-3xl border border-[#DCE9E6] bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#E8F3F1] dark:bg-[#133E3C]">
          <Check className="h-7 w-7 text-[#0B4F4B] dark:text-[#8FD4C6]" />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-slate-950 dark:text-white">Letter request submitted</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Your <b>{form.letterType}</b> request is pending HR approval.
        </p>
        <Button className="mt-6 bg-[#0B4F4B] text-white hover:bg-[#063C39]" onClick={() => { setState("idle"); setForm({ letterType: "", addressedTo: "", purpose: "", neededBy: "" }); }}>
          Submit another
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="rounded-3xl border border-[#DCE9E6] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-[#DCE9E6] px-6 py-5 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-950 dark:text-white">New HR letter request</h2>
          <p className="mt-1 text-sm text-slate-500">Request an official HR document or certificate from the company.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <FormField label="Employee name" required>
            <input type="text" value={CURRENT_USER} readOnly className="cursor-not-allowed opacity-60" />
          </FormField>

          <FormField label="Letter type" required>
            <select required value={form.letterType} onChange={e => setForm(f => ({ ...f, letterType: e.target.value }))}>
              <option value="">Select letter type…</option>
              {LETTER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </FormField>

          <FormField label="Addressed to (optional)">
            <input type="text" value={form.addressedTo} onChange={e => setForm(f => ({ ...f, addressedTo: e.target.value }))} placeholder="e.g. Embassy of Germany, ABC Bank…" />
          </FormField>

          <FormField label="Purpose / reason" required>
            <textarea required rows={3} value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} placeholder="e.g. Required for visa application." className="resize-none" />
          </FormField>

          <FormField label="Needed by" required>
            <DatePicker required value={form.neededBy} min={today} onChange={v => setForm(f => ({ ...f, neededBy: v }))} />
          </FormField>

          <div className="flex justify-end pt-1">
            <Button type="submit" disabled={!form.letterType} className="bg-[#0B4F4B] text-white hover:bg-[#063C39] disabled:opacity-60">
              Submit request <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>

      <div className="rounded-3xl border border-[#DCE9E6] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-[#DCE9E6] px-5 py-4 dark:border-slate-800">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-white">
            <FileText className="h-4 w-4 text-[#0B4F4B]" /> My letter requests
          </h3>
        </div>
        <div className="divide-y divide-[#DCE9E6] dark:divide-slate-800">
          {records.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-slate-400">No requests yet.</p>
          ) : (
            [...records].reverse().map(r => (
              <div key={r.id} className="flex items-start gap-3 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{r.letterType}</p>
                  {r.addressedTo && <p className="text-xs text-slate-500">To: {r.addressedTo}</p>}
                  <p className="mt-0.5 text-xs text-slate-400 line-clamp-1">{r.purpose}</p>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
