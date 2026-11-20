"use client";

import { Plus, X } from "lucide-react";
import type { UnitFloor, UnitRow } from "@/lib/crm-store";

const CELL = "w-full min-w-0 rounded-lg border border-transparent bg-transparent px-2.5 py-2 text-sm text-slate-900 placeholder:text-slate-300 focus:border-[#0B4F4B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0B4F4B]/15 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:bg-slate-900";
const GRID = "grid min-w-[760px] grid-cols-[1.1fr_0.9fr_1.4fr_1fr_1.1fr_auto] items-center";
const CHEVRON = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";
const SELECT = `${CELL} cursor-pointer appearance-none bg-[length:1rem] bg-[right_0.4rem_center] bg-no-repeat pr-6`;

export const UNIT_TYPES = [
  "Town House", "Twin House", "Standalone", "Studio",
  "1 bed", "2 beds", "3 beds", "4 beds", "Duplex", "Penthouse",
] as const;

export const UNIT_FLOORS: UnitFloor[] = ["Typical", "Ground", "Roof"];

/** Penthouse is a roof unit by definition — the floor is not a choice. */
export function floorIsLocked(unitType: string) { return unitType === "Penthouse"; }

export function emptyUnitRow(): UnitRow {
  return { unitType: "", floor: "Typical", areaFrom: "", areaTo: "", gardenArea: "", terraceArea: "", startingPrice: "" };
}

export function unitRowHasContent(r: UnitRow): boolean {
  return !!(r.unitType || r.areaFrom || r.areaTo || r.area || r.gardenArea || r.terraceArea || r.startingPrice);
}

/** "144 – 179", or just the single value when only one end is filled. */
export function formatArea(row: UnitRow): string {
  const from = (row.areaFrom ?? "").trim();
  const to = (row.areaTo ?? "").trim();
  if (from && to) return `${from} – ${to}`;
  if (from || to) return from || to;
  return (row.area ?? "").trim();   // legacy single-value rows
}

/** The extra area this row's floor calls for, if any. */
export function extraArea(row: UnitRow): { label: string; value: string } | null {
  if (row.floor === "Ground") return { label: "Garden", value: (row.gardenArea ?? "").trim() };
  if (row.floor === "Roof") return { label: "Terrace", value: (row.terraceArea ?? "").trim() };
  return null;
}

export function UnitTableEditor({ rows, onRow, onAdd, onRemove }: {
  rows: UnitRow[];
  onRow: (idx: number, patch: Partial<UnitRow>) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[#DCE9E6] dark:border-slate-700">
      <div className={`${GRID} bg-[#F5F8F7] text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400`}>
        <span className="px-3 py-2">Unit Type</span>
        <span className="px-3 py-2">Floor</span>
        <span className="px-3 py-2">Built up area<span className="text-rose-400"> *</span></span>
        <span className="px-3 py-2">Garden / Terrace</span>
        <span className="px-3 py-2">Starting Price</span>
        <span className="w-9" />
      </div>

      {rows.map((row, i) => {
        const locked = floorIsLocked(row.unitType);
        const extra = extraArea(row);
        const started = unitRowHasContent(row);
        // Flag only what the row's own floor actually requires, and only once it is in use.
        const missingFrom = started && !(row.areaFrom ?? "").trim();
        const missingExtra = started && !!extra && !extra.value;
        const warn = " ring-2 ring-rose-200 dark:ring-rose-900/60";

        return (
          <div key={i} className={`${GRID} border-t border-[#DCE9E6] dark:border-slate-700`}>
            <select
              value={row.unitType}
              onChange={e => {
                const v = e.target.value;
                onRow(i, floorIsLocked(v) ? { unitType: v, floor: "Roof" } : { unitType: v });
              }}
              aria-label={`Row ${i + 1} unit type`}
              className={`${SELECT} ${row.unitType ? "" : "text-slate-300 dark:text-slate-600"}`}
              style={{ backgroundImage: CHEVRON }}
            >
              <option value="">Select…</option>
              {UNIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              {row.unitType && !UNIT_TYPES.includes(row.unitType as typeof UNIT_TYPES[number]) && (
                <option value={row.unitType}>{row.unitType}</option>
              )}
            </select>

            <select
              value={row.floor ?? "Typical"}
              onChange={e => onRow(i, { floor: e.target.value as UnitFloor })}
              disabled={locked}
              aria-label={`Row ${i + 1} floor`}
              title={locked ? "Penthouse is always a roof unit" : undefined}
              className={`${SELECT} ${locked ? "cursor-not-allowed text-slate-400 dark:text-slate-500" : ""}`}
              style={{ backgroundImage: locked ? "none" : CHEVRON }}
            >
              {UNIT_FLOORS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>

            <div className="flex min-w-0 items-center">
              <input
                value={row.areaFrom ?? ""}
                onChange={e => onRow(i, { areaFrom: e.target.value })}
                placeholder="144"
                aria-label={`Row ${i + 1} built up area from`}
                className={`${CELL} tabular-nums${missingFrom ? warn : ""}`}
              />
              <span className="shrink-0 px-0.5 text-xs text-slate-300 dark:text-slate-600">to</span>
              <input
                value={row.areaTo ?? ""}
                onChange={e => onRow(i, { areaTo: e.target.value })}
                placeholder="optional"
                aria-label={`Row ${i + 1} built up area to`}
                className={`${CELL} tabular-nums`}
              />
            </div>

            {extra ? (
              <input
                value={extra.label === "Garden" ? (row.gardenArea ?? "") : (row.terraceArea ?? "")}
                onChange={e => onRow(i, extra.label === "Garden" ? { gardenArea: e.target.value } : { terraceArea: e.target.value })}
                placeholder={`${extra.label} *`}
                aria-label={`Row ${i + 1} ${extra.label.toLowerCase()} area`}
                className={`${CELL} tabular-nums${missingExtra ? warn : ""}`}
              />
            ) : (
              <span className="px-2.5 text-sm text-slate-300 dark:text-slate-600">—</span>
            )}

            <input
              value={row.startingPrice}
              onChange={e => onRow(i, { startingPrice: e.target.value })}
              placeholder="8,900,000"
              aria-label={`Row ${i + 1} starting price`}
              className={`${CELL} tabular-nums`}
            />

            <button
              type="button"
              onClick={() => onRemove(i)}
              aria-label={`Remove row ${i + 1}`}
              className="mr-1.5 grid h-7 w-7 place-items-center rounded-lg text-slate-300 transition hover:bg-rose-50 hover:text-rose-500 dark:text-slate-600 dark:hover:bg-rose-950 dark:hover:text-rose-400"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}

      <button
        type="button"
        onClick={onAdd}
        className="flex w-full items-center gap-1.5 border-t border-[#DCE9E6] px-3 py-2.5 text-xs font-semibold text-[#0B4F4B] transition hover:bg-[#F5F8F7] dark:border-slate-700 dark:text-[#8FD4C6] dark:hover:bg-slate-800"
      >
        <Plus className="h-3.5 w-3.5" /> Add unit type
      </button>
    </div>
  );
}

/** Read-only table used in history and performance views. */
export function UnitTableView({ rows, compact }: { rows: UnitRow[]; compact?: boolean }) {
  const visible = rows.filter(unitRowHasContent);
  if (visible.length === 0) return null;
  const pad = compact ? "px-2.5 py-1.5" : "px-3 py-2";
  return (
    <div className="overflow-x-auto rounded-xl border border-[#DCE9E6] dark:border-slate-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#F5F8F7] text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <th className={`${pad} text-left`}>Unit Type</th>
            <th className={`${pad} text-left`}>Floor</th>
            <th className={`${pad} text-left`}>Built up area</th>
            <th className={`${pad} text-left`}>Garden / Terrace</th>
            <th className={`${pad} text-left`}>Starting Price</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((r, i) => {
            const extra = extraArea(r);
            return (
              <tr key={i} className="border-t border-[#DCE9E6] dark:border-slate-700">
                <td className={`${pad} font-medium text-slate-800 dark:text-slate-100`}>{r.unitType || "—"}</td>
                <td className={`${pad} text-slate-600 dark:text-slate-300`}>{r.floor ?? "Typical"}</td>
                <td className={`${pad} tabular-nums text-slate-600 dark:text-slate-300`}>{formatArea(r) || "—"}</td>
                <td className={`${pad} tabular-nums text-slate-600 dark:text-slate-300`}>
                  {extra?.value
                    ? <><span className="text-slate-400">{extra.label} </span>{extra.value}</>
                    : "—"}
                </td>
                <td className={`${pad} tabular-nums font-semibold text-[#0B4F4B] dark:text-[#8FD4C6]`}>{r.startingPrice || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
