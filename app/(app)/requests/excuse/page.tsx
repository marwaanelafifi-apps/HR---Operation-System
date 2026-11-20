"use client";

import { useState } from "react";
import { Clock3, FileText, History, Palmtree } from "lucide-react";
import { ExcuseRequestForm } from "@/components/excuse-request-form";
import { VacationRequestForm } from "@/components/vacation-request-form";
import { HRLetterRequestForm } from "@/components/hr-letter-request-form";
import { HRRequestsHistory } from "@/components/hr-requests-history";

type Tab = "excuse" | "vacation" | "letter" | "history";

const TABS: { key: Tab; label: string; icon: React.ElementType; description: string }[] = [
  { key: "excuse", label: "Excuse Request", icon: Clock3, description: "Late arrival or early departure from your monthly balance" },
  { key: "vacation", label: "Vacation Request", icon: Palmtree, description: "Annual leave or time-off request" },
  { key: "letter", label: "HR Letter", icon: FileText, description: "Employment certificates and official documents" },
  { key: "history", label: "My History", icon: History, description: "All your past requests and their decisions" },
];

const ME = "Ahmed Khalil";

export default function HRRequestsPage() {
  const [tab, setTab] = useState<Tab>("excuse");

  return (
    <div className="pb-8">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0B4F4B] dark:text-[#8FD4C6]">Workplace</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">HR Requests</h1>
        <p className="mt-1.5 text-sm text-slate-500">Submit and track your HR requests — excuses, vacations, and official letters.</p>
      </header>

      {/* Tab selector */}
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TABS.map(t => {
          const Icon = t.icon;
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${isActive ? "border-[#0B4F4B] bg-[#E8F3F1] dark:border-[#8FD4C6]/60 dark:bg-[#133E3C]" : "border-[#DCE9E6] bg-white hover:border-[#0B4F4B]/40 dark:border-slate-800 dark:bg-slate-900"}`}
            >
              <div className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${isActive ? "bg-[#0B4F4B]" : "bg-[#F5F8F7] dark:bg-slate-800"}`}>
                <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-[#0B4F4B] dark:text-[#8FD4C6]"}`} />
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${isActive ? "text-[#0B4F4B] dark:text-[#8FD4C6]" : "text-slate-900 dark:text-white"}`}>{t.label}</p>
                <p className="mt-0.5 text-xs leading-4 text-slate-500">{t.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {tab !== "history" && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[#DCE9E6] bg-[#F5F8F7] px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
          <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
          <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
            <b className="text-slate-700 dark:text-slate-300">Prototype mode.</b> Requests are saved in this browser only. HR approval status is demo data.
          </p>
        </div>
      )}

      {tab === "excuse" && <ExcuseRequestForm />}
      {tab === "vacation" && <VacationRequestForm />}
      {tab === "letter" && <HRLetterRequestForm />}
      {tab === "history" && <HRRequestsHistory employeeFilter={ME} showEmployeeColumn={false} />}
    </div>
  );
}
