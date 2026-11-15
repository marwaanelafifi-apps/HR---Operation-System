import Link from "next/link";
import { ChevronLeft, Clock3 } from "lucide-react";
import { ExcuseRequestForm } from "@/components/excuse-request-form";
import { Button } from "@/components/ui/button";

export default function ExcuseRequestPage() {
  return (
    <div className="pb-8">
      <div className="mb-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/attendance"><ChevronLeft className="h-4 w-4" />My attendance</Link>
        </Button>
      </div>

      <header className="mb-8 flex flex-col gap-5 border-b border-slate-200/80 pb-6 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#0B4F4B] dark:text-[#8FD4C6]">
            <Clock3 className="h-3.5 w-3.5" /> Excuse request
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white sm:text-4xl">
            Request an excuse
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Request flexible hours for a late arrival (morning) or early departure (evening) from your 4-hour monthly balance. Unused balance resets on the 1st of each month.
          </p>
        </div>
      </header>

      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[#DCE9E6] bg-[#F5F8F7] px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
        <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
          <b className="text-slate-700 dark:text-slate-300">Prototype mode.</b> This form uses demo data for Ahmed Khalil with 2 hours already used this month. Delays auto-deduct, unused balance resets monthly. Submissions update this browser session only.
        </p>
      </div>

      <ExcuseRequestForm />
    </div>
  );
}
