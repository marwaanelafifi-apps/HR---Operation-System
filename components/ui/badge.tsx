import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const styles = { default: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200", success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300", warning: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300", danger: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300", info: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" };
export function Badge({ className, tone = "default", ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof styles }) { return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", styles[tone], className)} {...props} />; }
