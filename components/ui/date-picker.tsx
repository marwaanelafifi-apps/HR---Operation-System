"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayISO() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }

function parseISO(iso: string): Date | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
}

function toISO(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function displayDate(iso: string) {
  const d = parseISO(iso);
  if (!d) return "";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];
const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// ── Component ─────────────────────────────────────────────────────────────────

interface DatePickerProps {
  value: string;                    // YYYY-MM-DD
  onChange: (v: string) => void;
  min?: string;                     // YYYY-MM-DD
  max?: string;                     // YYYY-MM-DD
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function DatePicker({
  value, onChange, min, max,
  required, disabled, placeholder = "Pick a date", className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const ref  = useRef<HTMLDivElement>(null);

  // Calendar view state: which month/year is displayed
  const initial = parseISO(value) ?? new Date();
  const [viewYear,  setViewYear]  = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  // Keep view in sync when value changes externally
  useEffect(() => {
    const d = parseISO(value);
    if (d) { setViewYear(d.getFullYear()); setViewMonth(d.getMonth()); }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  function selectDay(d: number) {
    const iso = toISO(viewYear, viewMonth, d);
    if (min && iso < min) return;
    if (max && iso > max) return;
    onChange(iso);
    setOpen(false);
  }

  // Build calendar grid
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const today = todayISO();
  const selectedISO = value;

  function isDisabled(d: number) {
    const iso = toISO(viewYear, viewMonth, d);
    return (!!min && iso < min) || (!!max && iso > max);
  }

  return (
    <div ref={ref} className={cn("relative", className)}>
      {/* Input trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className={cn(
          "flex h-10 w-full items-center gap-2.5 rounded-xl border border-[#DCE9E6] bg-white px-3.5 text-sm text-slate-900 transition",
          "hover:border-[#0B4F4B] focus:border-[#0B4F4B] focus:outline-none focus:ring-2 focus:ring-[#0B4F4B]/20",
          "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
          disabled && "cursor-not-allowed opacity-50",
          open && "border-[#0B4F4B] ring-2 ring-[#0B4F4B]/20",
        )}
        aria-required={required}
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
        <span className={cn("flex-1 text-left", !value && "text-slate-400")}>
          {value ? displayDate(value) : placeholder}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>

      {/* Calendar dropdown */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-[#DCE9E6] bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">

          {/* Month / year header */}
          <div className="flex items-center justify-between border-b border-[#DCE9E6] px-4 py-3 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                /* toggle year/month selector — for now just show month name */
              }}
              className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 hover:text-[#0B4F4B] dark:text-white dark:hover:text-[#8FD4C6]"
            >
              {MONTHS[viewMonth]} {viewYear}
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevMonth}
                className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 transition hover:bg-[#E8F3F1] hover:text-[#0B4F4B] dark:hover:bg-[#133E3C]"
                aria-label="Previous month"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 transition hover:bg-[#E8F3F1] hover:text-[#0B4F4B] dark:hover:bg-[#133E3C]"
                aria-label="Next month"
              >
                ↓
              </button>
            </div>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 border-b border-[#DCE9E6] dark:border-slate-700">
            {DAYS.map(d => (
              <div key={d} className="py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-y-0.5 p-2">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const iso  = toISO(viewYear, viewMonth, day);
              const sel  = iso === selectedISO;
              const isToday = iso === today;
              const dis  = isDisabled(day);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={dis}
                  onClick={() => selectDay(day)}
                  className={cn(
                    "mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm transition",
                    sel && "bg-[#0B4F4B] font-semibold text-white",
                    !sel && isToday && "border-2 border-[#0B4F4B] font-semibold text-[#0B4F4B] dark:text-[#8FD4C6]",
                    !sel && !isToday && !dis && "text-slate-700 hover:bg-[#E8F3F1] hover:text-[#0B4F4B] dark:text-slate-200 dark:hover:bg-[#133E3C]",
                    dis && "cursor-not-allowed text-slate-300 dark:text-slate-600",
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-[#DCE9E6] px-4 py-2.5 dark:border-slate-700">
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); }}
              className="text-xs font-semibold text-slate-400 transition hover:text-rose-500"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                const iso = today;
                if ((!min || iso >= min) && (!max || iso <= max)) {
                  onChange(iso);
                  setOpen(false);
                }
              }}
              className="text-xs font-semibold text-[#0B4F4B] transition hover:underline dark:text-[#8FD4C6]"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
