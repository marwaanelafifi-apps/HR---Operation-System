"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, ChevronUp, Megaphone, Pin, PinOff, Plus, Trash2, Users, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  deleteAnnouncement, loadAnnouncements, onAnnouncementsChanged,
  postAnnouncement, togglePin,
  type Announcement, type AudienceKind, type Priority,
} from "@/lib/announcements-store";
import { loadDepartments, onDepartmentsChanged, type Department } from "@/lib/departments-store";
import { employees } from "@/lib/mock-data";

const ME_ID   = "ahmed-khalil";
const ME_NAME = "Ahmed Khalil";
const CAN_POST = true; // prototype: everyone can post

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTs(iso: string) {
  return new Date(iso).toLocaleString("en", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function isForMe(a: Announcement, depts: Department[]): boolean {
  if (a.audience === "all") return true;
  if (a.audience === "department") {
    const dept = depts.find(d => d.id === a.departmentId);
    return !!dept?.memberIds.includes(ME_ID);
  }
  return a.targetIds.includes(ME_ID);
}

function audienceLabel(a: Announcement, depts: Department[]): string {
  if (a.audience === "all") return "All users";
  if (a.audience === "department") {
    return depts.find(d => d.id === a.departmentId)?.name ?? "Team";
  }
  const names = a.targetIds.map(id => employees.find(e => e.id === id)?.name ?? id);
  if (names.length === 0) return "Nobody";
  if (names.length <= 2) return names.join(" & ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
}

// ── Announcement card ─────────────────────────────────────────────────────────

function AnnouncementCard({ ann, depts, canManage, onDelete, onPin }: {
  ann: Announcement; depts: Department[]; canManage: boolean;
  onDelete: () => void; onPin: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLong = ann.body.length > 180;

  return (
    <article className={`rounded-2xl border bg-white dark:bg-slate-900 ${ann.priority === "urgent" ? "border-rose-200 dark:border-rose-900/50" : "border-[#DCE9E6] dark:border-slate-800"}`}>
      <div className={`flex items-start gap-3 rounded-t-2xl px-5 py-4 ${ann.priority === "urgent" ? "bg-rose-50 dark:bg-rose-950/30" : ann.pinned ? "bg-[#E8F3F1] dark:bg-[#133E3C]" : ""}`}>
        <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${ann.priority === "urgent" ? "bg-rose-100 dark:bg-rose-900/50" : "bg-[#E8F3F1] dark:bg-[#1A4D4A]"}`}>
          {ann.priority === "urgent"
            ? <Bell className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            : <Megaphone className="h-4 w-4 text-[#0B4F4B] dark:text-[#8FD4C6]" />}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {ann.pinned && <Pin className="h-3.5 w-3.5 text-[#0B4F4B] dark:text-[#8FD4C6]" />}
            {ann.priority === "urgent" && <Badge tone="danger">Urgent</Badge>}
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{audienceLabel(ann, depts)}</span>
          </div>
          <h2 className="mt-1 font-semibold text-slate-950 dark:text-white">{ann.title}</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Posted by <span className="font-medium text-slate-600 dark:text-slate-300">{ann.postedBy}</span> · {fmtTs(ann.postedAt)}
          </p>
        </div>

        {canManage && (
          <div className="flex shrink-0 gap-1">
            <button onClick={onPin} title={ann.pinned ? "Unpin" : "Pin"}
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-[#E8F3F1] hover:text-[#0B4F4B] dark:hover:bg-slate-800">
              {ann.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
            </button>
            <button onClick={onDelete}
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="px-5 py-4">
        <p className={`whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300 ${!expanded && isLong ? "line-clamp-3" : ""}`}>
          {ann.body}
        </p>
        {isLong && (
          <button onClick={() => setExpanded(e => !e)}
            className="mt-2 flex items-center gap-1 text-xs font-semibold text-[#0B4F4B] hover:underline dark:text-[#8FD4C6]">
            {expanded ? <><ChevronUp className="h-3.5 w-3.5" />Show less</> : <><ChevronDown className="h-3.5 w-3.5" />Read more</>}
          </button>
        )}
      </div>
    </article>
  );
}

// ── Post form ─────────────────────────────────────────────────────────────────

function PostForm({ depts, onClose }: { depts: Department[]; onClose: () => void }) {
  const [title, setTitle]       = useState("");
  const [body, setBody]         = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [pinned, setPinned]     = useState(false);
  const [audience, setAudience] = useState<AudienceKind>("all");
  const [deptId, setDeptId]     = useState<string>(depts[0]?.id ?? "");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { titleRef.current?.focus(); }, []);

  function toggleId(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    postAnnouncement({
      title: title.trim(),
      body: body.trim(),
      priority,
      pinned,
      postedBy: ME_NAME,
      audience,
      departmentId: audience === "department" ? deptId : undefined,
      targetIds: audience === "specific" ? selectedIds : [],
    });
    onClose();
  }

  const isValid = title.trim() && body.trim() &&
    (audience !== "specific" || selectedIds.length > 0) &&
    (audience !== "department" || deptId);

  return (
    <div className="rounded-2xl border border-[#0B4F4B]/30 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-[#DCE9E6] px-5 py-4 dark:border-slate-800">
        <h2 className="font-semibold text-slate-950 dark:text-white">New announcement</h2>
        <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:text-slate-600">
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 p-5">
        {/* Title */}
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Title <span className="text-rose-500">*</span></span>
          <input ref={titleRef} required value={title} onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Office closed on 1 December"
            className="w-full rounded-xl border border-[#DCE9E6] bg-transparent px-3.5 py-2.5 text-sm outline-none transition focus:border-[#0B4F4B] dark:border-slate-700" />
        </label>

        {/* Body */}
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Message <span className="text-rose-500">*</span></span>
          <textarea required rows={4} value={body} onChange={e => setBody(e.target.value)}
            placeholder="Write your announcement here…"
            className="w-full resize-none rounded-xl border border-[#DCE9E6] bg-transparent px-3.5 py-2.5 text-sm outline-none transition focus:border-[#0B4F4B] dark:border-slate-700" />
        </label>

        {/* Priority + Pin */}
        <div className="flex flex-wrap gap-4">
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Priority</p>
            <div className="flex gap-2">
              {(["normal", "urgent"] as Priority[]).map(p => (
                <label key={p} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-2 text-sm transition ${priority === p ? (p === "urgent" ? "border-rose-400 bg-rose-50 font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300" : "border-[#0B4F4B] bg-[#E8F3F1] font-semibold text-[#0B4F4B] dark:bg-[#133E3C] dark:text-[#8FD4C6]") : "border-[#DCE9E6] text-slate-500 dark:border-slate-700"}`}>
                  <input type="radio" name="priority" value={p} checked={priority === p} onChange={() => setPriority(p)} className="sr-only" />
                  {p === "urgent" ? <Bell className="h-3.5 w-3.5" /> : <Megaphone className="h-3.5 w-3.5" />}
                  {p === "normal" ? "Normal" : "Urgent"}
                </label>
              ))}
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 self-end pb-2 text-sm">
            <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} className="h-4 w-4 accent-[#0B4F4B]" />
            <span className="font-medium text-slate-700 dark:text-slate-300">Pin to top</span>
          </label>
        </div>

        {/* Audience */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Send to</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {([
              { key: "all" as AudienceKind,        label: "All users",       desc: `${employees.length} people` },
              { key: "department" as AudienceKind,  label: "Department",      desc: "Select a team group" },
              { key: "specific" as AudienceKind,    label: "Specific people", desc: "Pick individuals" },
            ]).map(opt => (
              <label key={opt.key} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${audience === opt.key ? "border-[#0B4F4B] bg-[#E8F3F1] dark:border-[#8FD4C6]/60 dark:bg-[#133E3C]" : "border-[#DCE9E6] hover:border-[#0B4F4B]/40 dark:border-slate-700"}`}>
                <input type="radio" name="audience" value={opt.key} checked={audience === opt.key} onChange={() => setAudience(opt.key)} className="mt-0.5 accent-[#0B4F4B]" />
                <div>
                  <p className={`text-sm font-semibold ${audience === opt.key ? "text-[#0B4F4B] dark:text-[#8FD4C6]" : "text-slate-900 dark:text-white"}`}>{opt.label}</p>
                  <p className="text-xs text-slate-500">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>

          {/* Department picker */}
          {audience === "department" && (
            <div className="grid gap-2 sm:grid-cols-2">
              {depts.map(d => (
                <label key={d.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${deptId === d.id ? "border-[#0B4F4B] bg-[#E8F3F1] dark:border-[#8FD4C6]/60 dark:bg-[#133E3C]" : "border-[#DCE9E6] hover:border-[#0B4F4B]/40 dark:border-slate-700"}`}>
                  <input type="radio" name="dept" value={d.id} checked={deptId === d.id} onChange={() => setDeptId(d.id)} className="accent-[#0B4F4B]" />
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${deptId === d.id ? "text-[#0B4F4B] dark:text-[#8FD4C6]" : "text-slate-900 dark:text-white"}`}>{d.name}</p>
                    <p className="text-xs text-slate-500">{d.memberIds.length} member{d.memberIds.length !== 1 ? "s" : ""}</p>
                  </div>
                </label>
              ))}
            </div>
          )}

          {/* Specific person picker */}
          {audience === "specific" && (
            <div className="rounded-xl border border-[#DCE9E6] bg-[#F5F8F7] p-3 dark:border-slate-700 dark:bg-slate-800 space-y-4">
              {depts.map(dept => (
                <div key={dept.id}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{dept.name}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {dept.memberIds.map(id => {
                      const emp = employees.find(e => e.id === id);
                      if (!emp) return null;
                      return (
                        <label key={id} className="flex cursor-pointer items-center gap-2.5 text-sm">
                          <input type="checkbox" checked={selectedIds.includes(id)} onChange={() => toggleId(id)} className="h-4 w-4 accent-[#0B4F4B]" />
                          <span className="font-medium text-slate-800 dark:text-slate-200">{emp.name}</span>
                          <span className="text-xs text-slate-400">{emp.role}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
              {/* Employees not in any department */}
              {(() => {
                const inDept = new Set(depts.flatMap(d => d.memberIds));
                const rest = employees.filter(e => !inDept.has(e.id));
                if (!rest.length) return null;
                return (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Other</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {rest.map(emp => (
                        <label key={emp.id} className="flex cursor-pointer items-center gap-2.5 text-sm">
                          <input type="checkbox" checked={selectedIds.includes(emp.id)} onChange={() => toggleId(emp.id)} className="h-4 w-4 accent-[#0B4F4B]" />
                          <span className="font-medium text-slate-800 dark:text-slate-200">{emp.name}</span>
                          <span className="text-xs text-slate-400">{emp.role}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })()}
              {selectedIds.length > 0 && (
                <p className="text-xs font-semibold text-[#0B4F4B] dark:text-[#8FD4C6]">{selectedIds.length} person{selectedIds.length !== 1 ? "s" : ""} selected</p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={!isValid} className="bg-[#0B4F4B] text-white hover:bg-[#063C39] disabled:opacity-60">
            Post announcement
          </Button>
        </div>
      </form>
    </div>
  );
}

// ── Main workspace ────────────────────────────────────────────────────────────

export function AnnouncementsWorkspace() {
  const [all, setAll]       = useState<Announcement[]>([]);
  const [depts, setDepts]   = useState<Department[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [view, setView]     = useState<"mine" | "all">("mine");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    const refreshA = () => setAll(loadAnnouncements());
    const refreshD = () => setDepts(loadDepartments());
    refreshA(); refreshD();
    const u1 = onAnnouncementsChanged(refreshA);
    const u2 = onDepartmentsChanged(refreshD);
    return () => { u1(); u2(); };
  }, []);

  const mine   = all.filter(a => isForMe(a, depts));
  const shown  = view === "mine" ? mine : all;
  const sorted = [...shown].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.postedAt.localeCompare(a.postedAt);
  });

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0B4F4B] dark:text-[#8FD4C6]">Company</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">Announcements</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            {mine.length > 0 ? `${mine.length} announcement${mine.length !== 1 ? "s" : ""} for you.` : "No announcements yet."}
          </p>
        </div>
        {CAN_POST && (
          <Button onClick={() => setShowForm(true)} className="bg-[#0B4F4B] text-white hover:bg-[#063C39]">
            <Plus className="h-4 w-4" /> New announcement
          </Button>
        )}
      </header>

      {showForm && <PostForm depts={depts} onClose={() => setShowForm(false)} />}

      {/* View toggle */}
      <div className="flex w-fit gap-1 rounded-2xl border border-[#DCE9E6] bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
        {([["mine", "For me", mine.length], ["all", "All", all.length]] as const).map(([k, label, count]) => (
          <button key={k} onClick={() => setView(k)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${view === k ? "bg-[#0B4F4B] text-white" : "text-slate-500 hover:text-[#0B4F4B] dark:text-slate-400"}`}>
            {label}
            <span className={`rounded-full px-1.5 py-0.5 text-xs ${view === k ? "bg-white/20 text-white" : "bg-[#E8F3F1] text-[#0B4F4B] dark:bg-slate-800 dark:text-slate-300"}`}>{count}</span>
          </button>
        ))}
      </div>

      {/* Stats strip */}
      {all.length > 0 && (
        <div className="flex flex-wrap gap-4 rounded-2xl border border-[#DCE9E6] bg-white px-5 py-3 dark:border-slate-800 dark:bg-slate-900">
          <Stat icon={<Users className="h-4 w-4" />} label="Total" value={all.length} />
          <Stat icon={<Bell className="h-4 w-4 text-rose-500" />} label="Urgent" value={all.filter(a => a.priority === "urgent").length} />
          <Stat icon={<Pin className="h-4 w-4 text-[#0B4F4B]" />} label="Pinned" value={all.filter(a => a.pinned).length} />
        </div>
      )}

      {/* List */}
      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#DCE9E6] bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <Megaphone className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">No announcements</p>
          <p className="mt-1 text-sm text-slate-400">{CAN_POST ? "Post one using the button above." : "Check back soon."}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map(ann =>
            confirmDelete === ann.id ? (
              <div key={ann.id} className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 dark:border-rose-900/50 dark:bg-rose-950/30">
                <p className="flex-1 text-sm font-medium text-rose-800 dark:text-rose-200">Delete &quot;{ann.title}&quot;?</p>
                <Button size="sm" className="bg-rose-600 text-white hover:bg-rose-700" onClick={() => { deleteAnnouncement(ann.id); setConfirmDelete(null); }}>Delete</Button>
                <Button size="sm" variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              </div>
            ) : (
              <AnnouncementCard key={ann.id} ann={ann} depts={depts} canManage={CAN_POST}
                onDelete={() => setConfirmDelete(ann.id)} onPin={() => togglePin(ann.id)} />
            )
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-slate-400">{icon}</span>
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-900 dark:text-white">{value}</span>
    </div>
  );
}
