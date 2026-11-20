"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, ChevronDown, Clock3, MapPin, User, Phone, Calendar, Building2, StickyNote } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { zones } from "@/lib/mock-data";
import { addVisit } from "@/lib/requests-store";

const ME = { name: "Ahmed Khalil", role: "Broker" };

type FormState = "idle" | "submitting" | "submitted";

function validatePhone(localNumber: string) {
  const digits = localNumber.replace(/\D/g, "");
  if (!localNumber.trim()) return "Mobile number is required.";
  if (digits.length < 7) return "Number is too short.";
  return null;
}

const tomorrowDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
};

const todayDate = () => new Date().toISOString().split("T")[0];

// ─── Custom time picker ───────────────────────────────────────────────────────
function TimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [raw, setRaw] = useState({ h: "10", m: "00", pm: false });

  // Sync raw state from external value prop on mount / prop change
  useEffect(() => {
    const [hStr, mStr] = value.split(":");
    const h24 = parseInt(hStr, 10) || 0;
    const m = parseInt(mStr, 10) || 0;
    const pm = h24 >= 12;
    const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
    setRaw({ h: String(h12), m: String(m).padStart(2, "0"), pm });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = (h: string, m: string, pm: boolean) => {
    const h12 = Math.min(12, Math.max(1, parseInt(h, 10) || 1));
    const min = Math.min(59, Math.max(0, parseInt(m, 10) || 0));
    const h24 = h12 === 12 ? (pm ? 12 : 0) : (pm ? h12 + 12 : h12);
    onChange(`${String(h24).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
  };

  return (
    <div className="flex items-center gap-1.5 rounded-xl border border-[#DCE9E6] px-3 py-2.5 focus-within:border-[#0B4F4B] focus-within:ring-1 focus-within:ring-[#0B4F4B]/20 dark:border-slate-700">
      <input
        type="text" inputMode="numeric" maxLength={2}
        value={raw.h}
        onFocus={e => e.target.select()}
        onChange={e => { const v = e.target.value.replace(/\D/g, ""); setRaw(r => ({ ...r, h: v })); emit(v, raw.m, raw.pm); }}
        className="w-7 bg-transparent text-center text-sm font-semibold text-slate-900 outline-none dark:text-white"
        placeholder="10"
      />
      <span className="text-sm font-semibold text-slate-400">:</span>
      <input
        type="text" inputMode="numeric" maxLength={2}
        value={raw.m}
        onFocus={e => e.target.select()}
        onChange={e => { const v = e.target.value.replace(/\D/g, "").padStart(2, "0").slice(-2); setRaw(r => ({ ...r, m: v })); emit(raw.h, v, raw.pm); }}
        className="w-7 bg-transparent text-center text-sm font-semibold text-slate-900 outline-none dark:text-white"
        placeholder="00"
      />
      <div className="ml-1 flex overflow-hidden rounded-lg border border-[#DCE9E6] dark:border-slate-700">
        <button type="button" onClick={() => { setRaw(r => ({ ...r, pm: false })); emit(raw.h, raw.m, false); }}
          className={`px-2 py-0.5 text-xs font-semibold transition ${!raw.pm ? "bg-[#0B4F4B] text-white" : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}>AM</button>
        <button type="button" onClick={() => { setRaw(r => ({ ...r, pm: true })); emit(raw.h, raw.m, true); }}
          className={`px-2 py-0.5 text-xs font-semibold transition ${raw.pm ? "bg-[#0B4F4B] text-white" : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}>PM</button>
      </div>
    </div>
  );
}

// ─── Custom zone / generic select ────────────────────────────────────────────
function CustomSelect({ value, onChange, placeholder, options }: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: string[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm transition focus:outline-none ${open ? "border-[#0B4F4B] ring-1 ring-[#0B4F4B]/20" : "border-[#DCE9E6] dark:border-slate-700"} ${value ? "text-slate-900 dark:text-white" : "text-slate-400"} bg-transparent`}
      >
        <span>{value || placeholder}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-full overflow-hidden rounded-2xl border border-[#DCE9E6] bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="max-h-56 overflow-y-auto py-1">
            {options.map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => { onChange(opt); setOpen(false); }}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-[#E8F3F1] dark:hover:bg-slate-800 ${opt === value ? "bg-[#E8F3F1] font-semibold text-[#0B4F4B] dark:bg-slate-800 dark:text-[#8FD4C6]" : "text-slate-700 dark:text-slate-200"}`}
              >
                {opt === value && <Check className="h-3.5 w-3.5 shrink-0 text-[#0B4F4B] dark:text-[#8FD4C6]" />}
                {opt !== value && <span className="h-3.5 w-3.5 shrink-0" />}
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────
export function OutsideMeetingForm({ onDone }: { onDone?: () => void } = {}) {
  const [state, setState] = useState<FormState>("idle");

  const [form, setForm] = useState({
    clientName: "",
    clientNumber: "",
    date: todayDate(),
    time: "10:00",
    zone: "",
    projectName: "",
    meetingLocation: "",
    notes: "",
  });
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validatePhone(form.clientNumber);
    if (err) { setPhoneError(err); return; }
    setPhoneError(null);
    addVisit({
      employeeName: ME.name,
      employeeRole: ME.role,
      clientName: form.clientName.trim(),
      clientNumber: form.clientNumber.trim(),
      date: form.date,
      time: form.time,
      zone: form.zone,
      projectName: form.projectName.trim(),
      meetingLocation: form.meetingLocation.trim(),
      notes: form.notes.trim(),
    });
    setState("submitted");
  };

  const resetForm = () => {
    setState("idle");
    setForm({ clientName: "", clientNumber: "", date: todayDate(), time: "10:00", zone: "", projectName: "", meetingLocation: "", notes: "" });
    setPhoneError(null);
  };

  if (state === "submitted") {
    return (
      <div className="p-8 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#E8F3F1] dark:bg-[#133E3C]">
          <Check className="h-8 w-8 text-[#0B4F4B] dark:text-[#8FD4C6]" />
        </div>
        <h2 className="mt-5 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">Request submitted</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
          Pending <span className="font-semibold text-slate-700 dark:text-slate-200">CEO / GM approval</span>. The meeting check-in location activates only after approval.
        </p>
        <div className="mx-auto mt-6 max-w-xs rounded-2xl border border-[#DCE9E6] bg-[#F5F8F7] p-4 text-left dark:border-slate-800 dark:bg-slate-800">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Summary</p>
          <div className="space-y-2">
            <Row label="Client" value={form.clientName} />
            <Row label="Date" value={`${form.date} · ${form.time}`} />
            <Row label="Zone" value={form.zone} />
            <Row label="Project" value={form.projectName} />
          </div>
        </div>
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="outline" onClick={resetForm}>Submit another</Button>
          {onDone && <Button className="bg-[#0B4F4B] text-white hover:bg-[#063C39]" onClick={onDone}>Done</Button>}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-6">

          {/* Section: Client */}
          <SectionLabel>Client details</SectionLabel>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <IconField label="Client Name" icon={<User className="h-4 w-4" />} required>
              <input
                required
                value={form.clientName}
                onChange={e => setForm({ ...form, clientName: e.target.value })}
                placeholder="Mohammed Al-Rashidy"
              />
            </IconField>

            <IconField label="Client Number" icon={<Phone className="h-4 w-4" />} required>
              <input
                required
                type="tel"
                value={form.clientNumber}
                onChange={e => {
                  setForm({ ...form, clientNumber: e.target.value });
                  if (phoneError) setPhoneError(validatePhone(e.target.value));
                }}
                onBlur={e => { if (e.target.value) setPhoneError(validatePhone(e.target.value)); }}
                placeholder="e.g. 01012345678"
              />
              {phoneError && <span className="mt-1 block text-xs font-medium text-rose-600">{phoneError}</span>}
            </IconField>
          </div>

          {/* Section: Schedule */}
          <SectionLabel className="mt-7">Schedule</SectionLabel>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <IconField label="Date" icon={<Calendar className="h-4 w-4" />} required hint="Today or later">
              <DatePicker required value={form.date} min={todayDate()} onChange={v => setForm({ ...form, date: v })} />
            </IconField>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Time <span className="text-rose-500">*</span></label>
              <TimePicker value={form.time} onChange={v => setForm({ ...form, time: v })} />
            </div>
          </div>

          {/* Section: Meeting */}
          <SectionLabel className="mt-7">Meeting details</SectionLabel>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Zone <span className="text-rose-500">*</span>
              </label>
              <CustomSelect
                value={form.zone}
                onChange={v => setForm({ ...form, zone: v })}
                placeholder="Select a zone"
                options={zones.filter(z => z.active).map(z => z.name)}
              />
            </div>
            <IconField label="Project Name" icon={<Building2 className="h-4 w-4" />} required>
              <input required value={form.projectName} onChange={e => setForm({ ...form, projectName: e.target.value })} placeholder="Midtown East Tower" />
            </IconField>
          </div>

          <div className="mt-4">
            <IconField label="Meeting Location" icon={<MapPin className="h-4 w-4" />} required hint="Full address — used for GPS check-in on the meeting day">
              <input required value={form.meetingLocation} onChange={e => setForm({ ...form, meetingLocation: e.target.value })} placeholder="Plot 23, Administrative District, New Capital" />
            </IconField>
          </div>

          <div className="mt-4">
            <IconField label="Additional Notes" icon={<StickyNote className="h-4 w-4" />} hint="Optional — context for the CEO / GM review">
              <textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Client is interested in Units 4A and 5B, expecting to close this week." className="resize-none" />
            </IconField>
          </div>

          {/* Notice */}
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/40 dark:bg-amber-950/20">
            <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-xs leading-5 text-amber-800 dark:text-amber-200">
              Requests must be submitted <strong>at least one day before</strong> the meeting. GPS check-in activates only after CEO / GM approval.
            </p>
          </div>

          {/* Submit */}
          <div className="mt-6 flex justify-end">
            <Button type="submit" disabled={state === "submitting"} className="bg-[#0B4F4B] text-white hover:bg-[#063C39] disabled:opacity-60">
              {state === "submitting" ? "Submitting…" : "Submit for approval"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </form>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500 ${className ?? ""}`}>
      {children}
    </p>
  );
}

function IconField({ label, icon, required, hint, children }: { label: string; icon: React.ReactNode; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}{required && <span className="ml-0.5 text-rose-500">*</span>}
      </span>
      <span className="relative block">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 [.textarea-wrap_&]:top-3 [.textarea-wrap_&]:translate-y-0">
          {icon}
        </span>
        <span className="block [&>input]:w-full [&>input]:rounded-xl [&>input]:border [&>input]:border-[#DCE9E6] [&>input]:bg-transparent [&>input]:py-2.5 [&>input]:pl-10 [&>input]:pr-3.5 [&>input]:text-sm [&>input]:text-slate-900 [&>input]:outline-none [&>input]:transition [&>input]:placeholder:text-slate-400 [&>input]:focus:border-[#0B4F4B] [&>input]:focus:ring-1 [&>input]:focus:ring-[#0B4F4B]/20 [&>textarea]:w-full [&>textarea]:rounded-xl [&>textarea]:border [&>textarea]:border-[#DCE9E6] [&>textarea]:bg-transparent [&>textarea]:py-2.5 [&>textarea]:pl-10 [&>textarea]:pr-3.5 [&>textarea]:text-sm [&>textarea]:text-slate-900 [&>textarea]:outline-none [&>textarea]:transition [&>textarea]:placeholder:text-slate-400 [&>textarea]:focus:border-[#0B4F4B] [&>textarea]:focus:ring-1 [&>textarea]:focus:ring-[#0B4F4B]/20 dark:[&>input]:border-slate-700 dark:[&>input]:text-white dark:[&>textarea]:border-slate-700 dark:[&>textarea]:text-white">
          {children}
        </span>
      </span>
      {hint && <span className="block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="shrink-0 text-slate-500">{label}</span>
      <span className="text-right font-semibold text-slate-900 dark:text-slate-100">{value}</span>
    </div>
  );
}
