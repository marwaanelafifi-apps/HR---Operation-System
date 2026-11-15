import { Shield } from "lucide-react";
import { AdminPanel } from "@/components/admin-panel";

export default function AdminPage() {
  return (
    <div className="pb-8">
      <header className="mb-8 flex flex-col gap-5 border-b border-slate-200/80 pb-6 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#0B4F4B] dark:text-[#8FD4C6]">
            <Shield className="h-3.5 w-3.5" /> Administration
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white sm:text-4xl">
            Admin panel
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Manage meeting zones, attendance location locks, and role permissions for B Investment.
          </p>
        </div>
      </header>

      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[#DCE9E6] bg-[#F5F8F7] px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
        <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
          <b className="text-slate-700 dark:text-slate-300">Prototype mode.</b> In production this page will be protected by CEO / Owner role only. Changes here update this browser session only.
        </p>
      </div>

      <AdminPanel />
    </div>
  );
}
