"use client";

import { useEffect, useState } from "react";
import { getPosition, isShortMapsLink, loadOffice, parseCoordinates, loadUnlocks, saveOffice, saveUnlocks, type GeoFailure } from "@/lib/office-location";
import { loadAssessmentLocks, unlockAssessment, loadDailyTasks, onCRMChanged, type AssessmentLock, type KnowledgeTaskData, type DailyTask } from "@/lib/crm-store";
import { deleteVisit, loadRequests, onRequestsChanged, type VisitRequest } from "@/lib/requests-store";
import { loadWorkSchedule, saveWorkSchedule, DEFAULT_SCHEDULE, DAY_NAMES_FULL, formatDayHours, type WorkSchedule, type DaySchedule, type DeductionRule, type SaturdayOffRule } from "@/lib/work-schedule";
import { Check, ChevronDown, ChevronUp, Clock, Lock, MapPin, Plus, RefreshCw, Shield, Trash2, Unlock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { zones as defaultZones, attendanceUnlocks as defaultUnlocks } from "@/lib/mock-data";

type Tab = "office-schedule" | "zones" | "attendance" | "permissions" | "assessment-locks" | "meetings" | "knowledge-submissions";

// Role × Permission matrix
const ROLES = ["CEO / Owner", "Finance", "Sales Manager", "Broker", "Operations Admin", "Marketeer"];
const PERMISSIONS = [
  { key: "submit_outside_meeting", label: "Submit outside meeting request" },
  { key: "submit_excuse", label: "Submit excuse request" },
  { key: "submit_leave", label: "Submit leave request" },
  { key: "approve_outside_meeting", label: "Approve outside meeting requests" },
  { key: "approve_excuse", label: "Approve excuse requests" },
  { key: "view_team_attendance", label: "View team attendance" },
  { key: "manage_zones", label: "Manage zones" },
  { key: "unlock_attendance", label: "Unlock employee attendance" },
];

const DEFAULT_PERMISSIONS: Record<string, Record<string, boolean>> = {
  "CEO / Owner":        { submit_outside_meeting: true,  submit_excuse: true,  submit_leave: true,  approve_outside_meeting: true,  approve_excuse: true,  view_team_attendance: true,  manage_zones: true,  unlock_attendance: true  },
  "Finance":            { submit_outside_meeting: false, submit_excuse: true,  submit_leave: true,  approve_outside_meeting: false, approve_excuse: false, view_team_attendance: false, manage_zones: false, unlock_attendance: false },
  "Sales Manager":      { submit_outside_meeting: true,  submit_excuse: true,  submit_leave: true,  approve_outside_meeting: false, approve_excuse: true,  view_team_attendance: true,  manage_zones: false, unlock_attendance: false },
  "Broker":             { submit_outside_meeting: true,  submit_excuse: true,  submit_leave: true,  approve_outside_meeting: false, approve_excuse: false, view_team_attendance: false, manage_zones: false, unlock_attendance: false },
  "Operations Admin":   { submit_outside_meeting: false, submit_excuse: true,  submit_leave: true,  approve_outside_meeting: false, approve_excuse: false, view_team_attendance: false, manage_zones: false, unlock_attendance: false },
  "Marketeer":          { submit_outside_meeting: false, submit_excuse: true,  submit_leave: true,  approve_outside_meeting: false, approve_excuse: false, view_team_attendance: false, manage_zones: false, unlock_attendance: false },
};

export function AdminPanel() {
  const [tab, setTab] = useState<Tab>("office-schedule");

  return (
    <div>
      {/* Tab bar */}
      <div className="mb-6 flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-[#DCE9E6] bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900 w-fit">
        {([["office-schedule", "Office & Schedule"], ["zones", "Zones"], ["attendance", "Attendance locks"], ["permissions", "Role permissions"], ["assessment-locks", "Assessment locks"], ["meetings", "Meetings"], ["knowledge-submissions", "Knowledge"]] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${tab === key ? "bg-[#0B4F4B] text-white shadow-sm" : "text-slate-500 hover:text-[#0B4F4B] dark:text-slate-400"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "office-schedule" && <OfficeScheduleTab />}
      {tab === "zones" && <ZonesTab />}
      {tab === "attendance" && <AttendanceTab />}
      {tab === "permissions" && <PermissionsTab />}
      {tab === "assessment-locks" && <AssessmentLocksTab />}
      {tab === "meetings" && <MeetingsTab />}
      {tab === "knowledge-submissions" && <KnowledgeSubmissionsTab />}
    </div>
  );
}

/* ── Office & Schedule (merged) ── */
function OfficeScheduleTab() {
  return (
    <div className="space-y-10">
      <OfficeTab />
      <div className="border-t border-[#DCE9E6] dark:border-slate-800" />
      <ScheduleTab />
    </div>
  );
}

/* ── Assessment Locks ── */
function AssessmentLocksTab() {
  const [locks, setLocks] = useState<AssessmentLock[]>([]);

  function refresh() { setLocks(loadAssessmentLocks()); }

  useEffect(() => { refresh(); }, []);

  function handleUnlock(lock: AssessmentLock) {
    unlockAssessment(lock.employeeId, lock.taskId, lock.date);
    refresh();
  }

  function formatLockedAt(iso: string | undefined) {
    if (!iso) return "Unknown time";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "Unknown time";
    return d.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit", hour12: true });
  }

  function formatDate(iso: string) {
    const d = new Date(`${iso}T00:00`);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  }

  const sorted = [...locks].sort((a, b) => (b.lockedAt ?? "").localeCompare(a.lockedAt ?? ""));

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Locked Assessments</h2>
          <p className="mt-1 text-sm text-slate-500">Users whose priority assessment was locked because they switched apps or tabs mid-task. Unlock to allow them to retry.</p>
        </div>
        <button onClick={refresh} className="flex shrink-0 items-center gap-1.5 rounded-xl border border-[#DCE9E6] px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-[#0B4F4B] hover:text-[#0B4F4B] dark:border-slate-700 dark:text-slate-300">
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#DCE9E6] py-10 text-center dark:border-slate-700">
          <Lock className="mx-auto mb-3 h-8 w-8 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium text-slate-500">No locked assessments</p>
          <p className="mt-1 text-xs text-slate-400">All users are free to submit their assessments.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#DCE9E6] dark:border-slate-800">
          {sorted.map((lock, idx) => (
            <div key={`${lock.employeeId}-${lock.taskId}-${lock.date}`}
              className={`flex items-center gap-4 px-5 py-4 ${idx < sorted.length - 1 ? "border-b border-[#DCE9E6] dark:border-slate-800" : ""}`}>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950">
                <Lock className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {lock.employeeName || lock.employeeId}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {lock.taskLabel || lock.taskId} · {formatDate(lock.date)}
                </p>
                <p className="text-xs text-rose-500">
                  Left screen at {formatLockedAt(lock.lockedAt)}
                </p>
              </div>
              <button
                onClick={() => handleUnlock(lock)}
                className="flex shrink-0 items-center gap-1.5 rounded-xl border border-[#DCE9E6] bg-white px-3 py-1.5 text-xs font-semibold text-[#0B4F4B] transition hover:border-[#0B4F4B] hover:bg-[#E8F3F1] dark:border-slate-700 dark:bg-slate-900 dark:text-[#8FD4C6] dark:hover:border-[#2E7D76] dark:hover:bg-[#0B2927]"
              >
                <Unlock className="h-3 w-3" /> Unlock
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Meetings ── */
/* ── Knowledge Submissions ── */
function KnowledgeSubmissionsTab() {
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterEmp, setFilterEmp] = useState("all");
  const [filterDate, setFilterDate] = useState("");

  function refresh() {
    setTasks(loadDailyTasks().filter(t => t.taskType === "knowledge").sort((a, b) => b.completedAt.localeCompare(a.completedAt)));
  }

  useEffect(() => {
    refresh();
    return onCRMChanged(refresh);
  }, []);

  function fmtDate(iso: string) {
    const d = new Date(`${iso}T00:00`);
    return isNaN(d.getTime()) ? iso : d.toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  }

  function fmtTime(iso: string) {
    return new Date(iso).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" });
  }

  const empNames = Array.from(new Set(tasks.map(t => t.employeeName))).sort();
  const filtered = tasks.filter(t => {
    if (filterEmp !== "all" && t.employeeName !== filterEmp) return false;
    if (filterDate && t.date !== filterDate) return false;
    return true;
  });

  const FIELD_LABELS: [keyof import("@/lib/crm-store").ProjectAssessment, string][] = [
    ["projectName", "Project Name"],
    ["companyName", "Company Name"],
    ["previousWork", "Previous Projects / Owner History"],
    ["location", "Location"],
    ["projectArea", "Project Acres"],
    ["projectDetails", "Project Details & Facilities"],
    ["unitTypes", "Unit Types"],
    ["pricesAndAcres", "Prices & Acres"],
    ["paymentPlan", "Payment Plan"],
    ["finishingType", "Finishing Type"],
    ["construction", "Construction"],
    ["deliveryDate", "Delivery Date"],
    ["maintenance", "Maintenance"],
    ["investorType", "Engineering Consultant"],
    ["managementAndOperations", "Management & Operations"],
    ["termsOfContract", "Terms of Operating Contract"],
    ["sellingPoints", "Selling Points"],
    ["weaknessPoints", "Weakness Points"],
    ["additionalNotes", "Additional Notes"],
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Projects in Market — All Submissions</h2>
          <p className="mt-1 text-sm text-slate-500">{filtered.length} submission{filtered.length !== 1 ? "s" : ""} across all employees.</p>
        </div>
        <button onClick={refresh} className="flex shrink-0 items-center gap-1.5 rounded-xl border border-[#DCE9E6] px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-[#0B4F4B] hover:text-[#0B4F4B] dark:border-slate-700 dark:text-slate-300">
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterEmp}
          onChange={e => setFilterEmp(e.target.value)}
          className="rounded-xl border border-[#DCE9E6] bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="all">All employees</option>
          {empNames.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <input
          type="date"
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
          className="rounded-xl border border-[#DCE9E6] bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
        {filterDate && (
          <button onClick={() => setFilterDate("")} className="rounded-xl border border-[#DCE9E6] px-3 py-2 text-xs font-semibold text-slate-500 hover:text-[#0B4F4B] dark:border-slate-700">
            Clear date
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#DCE9E6] py-10 text-center dark:border-slate-700">
          <p className="text-sm font-medium text-slate-500">No submissions found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(task => {
            const kd = task.data as KnowledgeTaskData;
            const isOpen = expandedId === task.id;
            const isVoice = !!kd.voiceNoteTranscript;
            const rows = isVoice ? [] : FIELD_LABELS
              .map(([k, label]) => [label, kd.assessment?.[k]] as [string, string])
              .filter(([, v]) => v);

            return (
              <div key={task.id} className="overflow-hidden rounded-2xl border border-[#DCE9E6] bg-white dark:border-slate-700 dark:bg-slate-900">
                <button
                  onClick={() => setExpandedId(isOpen ? null : task.id)}
                  className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-[#F5F8F7] dark:hover:bg-slate-800/50"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900 dark:text-white">
                      {isVoice ? "Voice note" : (kd.assessment?.projectName || "—")}
                      {!isVoice && kd.assessment?.companyName && (
                        <span className="ml-2 font-normal text-slate-500">· {kd.assessment.companyName}</span>
                      )}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span>{task.employeeName}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{fmtDate(task.date)} · {fmtTime(task.completedAt)}</span>
                      {isVoice && <span className="rounded-full bg-blue-100 px-2 py-0.5 font-semibold text-blue-600 dark:bg-blue-950 dark:text-blue-300">Voice</span>}
                    </div>
                  </div>
                  {isOpen ? <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" /> : <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />}
                </button>

                {isOpen && (
                  <div className="border-t border-[#DCE9E6] px-5 py-4 dark:border-slate-700">
                    {isVoice ? (
                      <div>
                        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Voice note · {kd.voiceNoteLanguage === "ar" ? "Arabic" : "English"}
                        </p>
                        <p className="leading-6 text-slate-700 dark:text-slate-200" dir={kd.voiceNoteLanguage === "ar" ? "rtl" : "ltr"}>
                          {kd.voiceNoteTranscript}
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                        {rows.map(([label, value]) => (
                          <div key={label} className="flex gap-2">
                            <span className="shrink-0 font-semibold text-slate-500">{label}:</span>
                            <span className="text-slate-700 dark:text-slate-200">{value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MeetingsTab() {
  const [visits, setVisits] = useState<VisitRequest[]>([]);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  function refresh() { setVisits(loadRequests().visits); }

  useEffect(() => {
    refresh();
    return onRequestsChanged(refresh);
  }, []);

  function handleDelete(id: string) {
    deleteVisit(id);
    setConfirmId(null);
  }

  function fmtDate(iso: string) {
    const d = new Date(`${iso}T00:00`);
    return isNaN(d.getTime()) ? iso : d.toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" });
  }

  const sorted = [...visits].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">All Meetings</h2>
          <p className="mt-1 text-sm text-slate-500">View and delete submitted meeting records across all employees.</p>
        </div>
        <button onClick={refresh} className="flex shrink-0 items-center gap-1.5 rounded-xl border border-[#DCE9E6] px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-[#0B4F4B] hover:text-[#0B4F4B] dark:border-slate-700 dark:text-slate-300">
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#DCE9E6] py-10 text-center dark:border-slate-700">
          <p className="text-sm font-medium text-slate-500">No meetings recorded yet</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#DCE9E6] dark:border-slate-800">
          {sorted.map((v, idx) => (
            <div key={v.id}
              className={`flex items-start gap-4 px-5 py-4 ${idx < sorted.length - 1 ? "border-b border-[#DCE9E6] dark:border-slate-800" : ""}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{v.clientName}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${v.status === "approved" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : v.status === "rejected" ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"}`}>
                    {v.status === "approved" ? "Approved" : v.status === "rejected" ? "Rejected" : "Pending"}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{v.projectName}{v.meetingLocation ? ` · ${v.meetingLocation}` : ""}</p>
                <p className="mt-0.5 text-xs text-slate-400">{v.employeeName} · {fmtDate(v.date ?? "")} {v.time ? `· ${v.time}` : ""}</p>
                {v.notes && <p className="mt-1 text-xs text-slate-400 italic">{v.notes}</p>}
              </div>
              {confirmId === v.id ? (
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-slate-500">Delete?</span>
                  <button onClick={() => handleDelete(v.id)} className="rounded-lg bg-rose-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-600">Yes</button>
                  <button onClick={() => setConfirmId(null)} className="rounded-lg border border-[#DCE9E6] px-2.5 py-1 text-xs font-semibold text-slate-600 hover:border-slate-400 dark:border-slate-700 dark:text-slate-300">No</button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmId(v.id)}
                  className="shrink-0 rounded-xl border border-[#DCE9E6] p-1.5 text-slate-400 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-500 dark:border-slate-700 dark:hover:border-rose-700 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Office location ── */
const inputClass = "w-full rounded-xl border border-[#DCE9E6] bg-transparent px-3.5 py-2.5 text-sm outline-none transition focus:border-[#0B4F4B] dark:border-slate-700";

function OfficeTab() {
  const [name, setName] = useState("");
  const [radius, setRadius] = useState("150");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [link, setLink] = useState("");
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [isSet, setIsSet] = useState(false);

  useEffect(() => {
    const saved = loadOffice();
    setName(saved.name);
    setRadius(saved.radius);
    if (saved.mapsLink) setLink(saved.mapsLink);
    if (saved.lat !== undefined && saved.lng !== undefined) {
      setLat(String(saved.lat));
      setLng(String(saved.lng));
      setIsSet(true);
    }
  }, []);

  function readLink(value: string) {
    setLink(value);
    if (!value.trim()) return setMessage(null);
    const found = parseCoordinates(value);
    if (found) {
      setLat(found.lat.toFixed(6));
      setLng(found.lng.toFixed(6));
      setAccuracy(null);
      setMessage({ tone: "ok", text: "Coordinates found in the link. Check the point on the map, then save." });
    } else if (isShortMapsLink(value)) {
      setMessage({ tone: "error", text: "Short links hide the location. Open the link, then copy the full address from the browser's address bar and paste that here." });
    } else {
      setMessage({ tone: "error", text: "No coordinates found. Paste the full Google Maps link of the pinned office, or type latitude and longitude." });
    }
  }

  async function useHere() {
    setBusy(true);
    setMessage(null);
    try {
      const fix = await getPosition();
      setLat(fix.lat.toFixed(6));
      setLng(fix.lng.toFixed(6));
      setAccuracy(fix.accuracy);
      setMessage({ tone: "ok", text: "Location read. Check it on the map, then save." });
    } catch (failure) {
      const reason = failure as GeoFailure;
      setMessage({ tone: "error", text: reason === "denied" ? "Location is turned off for this site. Allow it in the browser, or type the coordinates." : "Could not read your location. Type the coordinates instead." });
    } finally {
      setBusy(false);
    }
  }

  function save() {
    const latitude = Number(lat);
    const longitude = Number(lng);
    const metres = Number(radius);
    if (!name.trim()) return setMessage({ tone: "error", text: "Enter a name for the office." });
    if (lat.trim() === "" || lng.trim() === "" || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return setMessage({ tone: "error", text: "Enter valid coordinates, for example 29.9285 and 30.9188." });
    if (!Number.isFinite(metres) || metres < 20 || metres > 2000) return setMessage({ tone: "error", text: "Radius must be between 20 and 2000 metres." });
    saveOffice({ name: name.trim(), radius: String(Math.round(metres)), lat: latitude, lng: longitude, mapsLink: link.trim() || undefined });
    setIsSet(true);
    setMessage({ tone: "ok", text: "Saved. Check-in now uses this location." });
  }

  const hasPoint = lat.trim() !== "" && lng.trim() !== "" && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));

  return (
    <div className="rounded-3xl border border-[#DCE9E6] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3 border-b border-[#DCE9E6] px-6 py-5 dark:border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-slate-950 dark:text-white">Office location</h2>
          <p className="mt-0.5 text-sm text-slate-500">Employees can check in only within this radius of the office.</p>
        </div>
        <Badge tone={isSet ? "success" : "warning"}>{isSet ? "Set" : "Not set"}</Badge>
      </div>

      <div className="space-y-5 p-6">
        <div>
          <label htmlFor="office-name" className="mb-1.5 block text-sm font-medium">Office name</label>
          <input id="office-name" className={inputClass} value={name} onChange={e => { setName(e.target.value); setMessage(null); }} placeholder="B Investment HQ, 6th of October" />
        </div>

        <div className="rounded-2xl border border-[#DCE9E6] bg-[#F5F8F7] p-4 dark:border-slate-800 dark:bg-slate-800/60">
          <p className="text-sm font-medium">Where is the office?</p>
          <p className="mt-0.5 text-xs text-slate-500">Stand inside the office and tap the button, or type the coordinates from Google Maps (right-click the office, then click the numbers to copy).</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button onClick={useHere} disabled={busy} className="bg-[#0B4F4B] text-white hover:bg-[#063C39]">
              <MapPin className="h-4 w-4" />{busy ? "Reading location…" : "Use my current location"}
            </Button>
            {name.trim() && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name.trim())}`} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[#0B4F4B] hover:underline dark:text-[#8FD4C6]">Find this address on Google Maps</a>}
          </div>
          <div className="mt-4">
            <label htmlFor="office-link" className="mb-1.5 block text-sm font-medium">Or paste a Google Maps link</label>
            <input id="office-link" className={inputClass} value={link} onChange={e => readLink(e.target.value)} placeholder="https://www.google.com/maps/place/…  or  29.9285, 30.9188" />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="office-lat" className="mb-1.5 block text-sm font-medium">Latitude</label>
              <input id="office-lat" inputMode="decimal" className={inputClass} value={lat} onChange={e => { setLat(e.target.value); setMessage(null); }} placeholder="29.9285" />
            </div>
            <div>
              <label htmlFor="office-lng" className="mb-1.5 block text-sm font-medium">Longitude</label>
              <input id="office-lng" inputMode="decimal" className={inputClass} value={lng} onChange={e => { setLng(e.target.value); setMessage(null); }} placeholder="30.9188" />
            </div>
          </div>
          {accuracy !== null && <p className="mt-2 text-xs text-slate-500">Device accuracy about {Math.round(accuracy)} m. Indoors it can be weaker, so a larger radius may help.</p>}
          {hasPoint && <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-[#0B4F4B] hover:underline dark:text-[#8FD4C6]">Check this point on Google Maps</a>}
        </div>

        <div className="max-w-xs">
          <label htmlFor="office-radius" className="mb-1.5 block text-sm font-medium">Allowed radius (metres)</label>
          <input id="office-radius" inputMode="numeric" className={inputClass} value={radius} onChange={e => { setRadius(e.target.value.replace(/[^0-9]/g, "")); setMessage(null); }} placeholder="150" />
          <p className="mt-1 text-xs text-slate-400">150 m works for most buildings.</p>
        </div>

        {message && <p role="status" className={`rounded-xl px-4 py-3 text-sm ${message.tone === "ok" ? "bg-[#E8F3F1] text-[#063C39] dark:bg-[#133E3C] dark:text-[#D7F1EC]" : "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200"}`}>{message.text}</p>}
      </div>

      <div className="border-t border-[#DCE9E6] px-6 py-4 dark:border-slate-800">
        <Button onClick={save} className="bg-[#0B4F4B] text-white hover:bg-[#063C39]"><Check className="h-4 w-4" />Save office location</Button>
        <span className="ml-3 text-xs text-slate-400">Demo only: saved in this browser.</span>
      </div>
    </div>
  );
}

/* ── Zones ── */
function ZonesTab() {
  const [zones, setZones] = useState(defaultZones);
  const [adding, setAdding] = useState(false);
  const [newZone, setNewZone] = useState("");
  const [saved, setSaved] = useState(false);

  const add = () => {
    if (!newZone.trim()) return;
    setZones([...zones, { id: `z-${Date.now()}`, name: newZone.trim(), active: true }]);
    setNewZone("");
    setAdding(false);
    setSaved(false);
  };

  const toggle = (id: string) => setZones(zones.map(z => z.id === id ? { ...z, active: !z.active } : z));
  const remove = (id: string) => setZones(zones.filter(z => z.id !== id));

  return (
    <div className="rounded-3xl border border-[#DCE9E6] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-[#DCE9E6] px-6 py-5 dark:border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-slate-950 dark:text-white">Meeting zones</h2>
          <p className="mt-0.5 text-sm text-slate-500">Zones available in the outside meeting request form.</p>
        </div>
        <div className="flex gap-2">
          {!adding && (
            <Button onClick={() => setAdding(true)} className="bg-[#0B4F4B] text-white hover:bg-[#063C39]">
              <Plus className="h-4 w-4" /> Add zone
            </Button>
          )}
        </div>
      </div>

      {adding && (
        <div className="flex items-center gap-3 border-b border-[#DCE9E6] bg-[#F5F8F7] px-6 py-4 dark:border-slate-800 dark:bg-slate-800">
          <MapPin className="h-4 w-4 shrink-0 text-[#0B4F4B]" />
          <input
            autoFocus
            value={newZone}
            onChange={e => setNewZone(e.target.value)}
            onKeyDown={e => e.key === "Enter" && add()}
            placeholder="e.g. Sheikh Zayed"
            className="flex-1 rounded-xl border border-[#DCE9E6] bg-white px-3.5 py-2 text-sm outline-none focus:border-[#0B4F4B] dark:border-slate-700 dark:bg-slate-900"
          />
          <Button onClick={add} className="bg-[#0B4F4B] text-white hover:bg-[#063C39]"><Check className="h-4 w-4" /></Button>
          <Button variant="outline" onClick={() => { setAdding(false); setNewZone(""); }}><X className="h-4 w-4" /></Button>
        </div>
      )}

      <div className="divide-y divide-[#DCE9E6] dark:divide-slate-800">
        {zones.map(zone => (
          <div key={zone.id} className="flex items-center gap-4 px-6 py-4">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#E8F3F1] dark:bg-[#133E3C]">
              <MapPin className="h-4 w-4 text-[#0B4F4B] dark:text-[#8FD4C6]" />
            </div>
            <span className="flex-1 text-sm font-medium text-slate-900 dark:text-white">{zone.name}</span>
            <Badge tone={zone.active ? "success" : "default"}>{zone.active ? "Active" : "Inactive"}</Badge>
            <button
              onClick={() => toggle(zone.id)}
              className="text-xs font-semibold text-slate-500 hover:text-[#0B4F4B] dark:hover:text-[#8FD4C6]"
            >
              {zone.active ? "Disable" : "Enable"}
            </button>
            <button onClick={() => remove(zone.id)} className="text-slate-300 hover:text-rose-500 dark:text-slate-600">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="border-t border-[#DCE9E6] px-6 py-4 dark:border-slate-800">
        <Button
          onClick={() => setSaved(true)}
          className="bg-[#0B4F4B] text-white hover:bg-[#063C39]"
        >
          {saved ? <><Check className="h-4 w-4" /> Saved</> : "Save changes"}
        </Button>
        <span className="ml-3 text-xs text-slate-400">Demo only — changes persist in this session.</span>
      </div>
    </div>
  );
}

/* ── Attendance locks ── */
function AttendanceTab() {
  const [unlocks, setUnlocks] = useState(defaultUnlocks);

  // Saved choices (shared with the Attendance screen in this browser) override the demo defaults.
  useEffect(() => {
    const saved = loadUnlocks();
    setUnlocks(list => list.map(u => u.employeeId in saved ? { ...u, unlocked: saved[u.employeeId] } : u));
  }, []);

  const toggle = (id: string) => {
    const next = unlocks.map(u =>
      u.employeeId === id
        ? { ...u, unlocked: !u.unlocked, updatedAt: !u.unlocked ? "Now" : "", reason: !u.unlocked ? u.reason : "" }
        : u
    );
    setUnlocks(next);
    saveUnlocks(Object.fromEntries(next.map(u => [u.employeeId, u.unlocked])));
  };

  return (
    <div className="rounded-3xl border border-[#DCE9E6] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-[#DCE9E6] px-6 py-5 dark:border-slate-800">
        <h2 className="text-base font-semibold text-slate-950 dark:text-white">Attendance location locks</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          By default, employees must be within the allowed radius to check in. Toggle the lock off to allow an employee to check in from any location.
        </p>
      </div>

      <div className="divide-y divide-[#DCE9E6] dark:divide-slate-800">
        {unlocks.map(u => (
          <div key={u.employeeId} className="flex items-center gap-4 px-6 py-4">
            <div className={`grid h-9 w-9 place-items-center rounded-xl ${u.unlocked ? "bg-amber-50 dark:bg-amber-950/40" : "bg-[#E8F3F1] dark:bg-[#133E3C]"}`}>
              {u.unlocked
                ? <Unlock className="h-4 w-4 text-amber-600" />
                : <Lock className="h-4 w-4 text-[#0B4F4B] dark:text-[#8FD4C6]" />
              }
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{u.employeeName}</p>
              {u.unlocked && u.reason && (
                <p className="text-xs text-amber-600 dark:text-amber-400">{u.reason}</p>
              )}
              {u.unlocked && u.updatedAt && !u.reason && (
                <p className="text-xs text-slate-400">Unlocked {u.updatedAt}</p>
              )}
            </div>
            <Badge tone={u.unlocked ? "warning" : "success"}>{u.unlocked ? "Unlocked" : "Locked"}</Badge>
            <button
              onClick={() => toggle(u.employeeId)}
              className={`relative h-6 w-11 rounded-full p-0.5 transition ${u.unlocked ? "bg-amber-400" : "bg-[#0B4F4B]"}`}
            >
              <span className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${u.unlocked ? "translate-x-5" : ""}`} />
            </button>
          </div>
        ))}
      </div>

      <div className="border-t border-[#DCE9E6] bg-[#F5F8F7] px-6 py-4 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800">
        <Shield className="mb-1 h-4 w-4 text-[#6C807C]" />
        Each unlock is logged with a timestamp. Unlocked employees can check in from any location; this is flagged in their attendance record. Changes here do not affect outside meeting GPS verification.
      </div>
    </div>
  );
}

/* ── Work schedule ── */
function toTimeString(h: number, m: number) { return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`; }
function fromTimeString(val: string): { hour: number; minute: number } {
  const [h, m] = val.split(":").map(Number);
  return { hour: isNaN(h) ? 11 : h, minute: isNaN(m) ? 0 : m };
}

const SAT_RULES: { value: SaturdayOffRule; label: string }[] = [
  { value: "2nd_4th", label: "2nd and 4th Saturdays off (default)" },
  { value: "1st_3rd", label: "1st and 3rd Saturdays off" },
  { value: "all",     label: "All Saturdays off" },
  { value: "none",    label: "No Saturdays off (all work)" },
];

function ScheduleTab() {
  const [schedule, setSchedule] = useState<WorkSchedule>(DEFAULT_SCHEDULE);
  const [saved, setSaved] = useState(false);
  const [newRule, setNewRule] = useState<Omit<DeductionRule, "label">>({ minutesLate: 45, deductFraction: 0.75 });

  useEffect(() => { setSchedule(loadWorkSchedule()); }, []);

  function updateDay(dow: number, patch: Partial<DaySchedule>) {
    setSchedule(s => ({ ...s, days: { ...s.days, [dow]: { ...s.days[dow], ...patch } } }));
    setSaved(false);
  }

  function handleStartTime(dow: number, val: string) {
    const { hour, minute } = fromTimeString(val);
    updateDay(dow, { startHour: hour, startMinute: minute });
  }
  function handleEndTime(dow: number, val: string) {
    const { hour, minute } = fromTimeString(val);
    updateDay(dow, { endHour: hour, endMinute: minute });
  }

  function addDeductionRule() {
    if (newRule.minutesLate <= 0 || newRule.deductFraction <= 0) return;
    const h = Math.floor(11 + newRule.minutesLate / 60);
    const m = (11 * 60 + newRule.minutesLate) % 60;
    const ampm = h < 12 ? "AM" : "PM"; const h12 = h % 12 === 0 ? 12 : h % 12;
    const label = `${h12}:${String(m).padStart(2,"0")} ${ampm} — ${newRule.deductFraction >= 1 ? "1 day" : newRule.deductFraction >= 0.5 ? "½ day" : "¼ day"}`;
    setSchedule(s => ({ ...s, deductionRules: [...s.deductionRules, { ...newRule, label }].sort((a,b)=>a.minutesLate-b.minutesLate) }));
    setSaved(false);
  }
  function removeDeductionRule(idx: number) {
    setSchedule(s => ({ ...s, deductionRules: s.deductionRules.filter((_, i) => i !== idx) }));
    setSaved(false);
  }

  function handleSave() {
    saveWorkSchedule(schedule);
    setSaved(true);
  }

  return (
    <div className="space-y-6">
      {/* Per-day hours */}
      <div className="rounded-3xl border border-[#DCE9E6] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-[#DCE9E6] px-6 py-5 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-950 dark:text-white">Office hours per day</h2>
          <p className="mt-0.5 text-sm text-slate-500">Set the shift start and end for each day of the week. The start time is used to calculate delays.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-[#DCE9E6] dark:border-slate-800">
                {["Day", "Start", "End", "Hours", "Day off"].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE9E6] dark:divide-slate-800">
              {[0,1,2,3,4,5,6].map(dow => {
                const day = schedule.days[dow];
                const isSat = dow === 6; const isFri = dow === 5;
                return (
                  <tr key={dow} className={`transition ${day.isOff ? "opacity-50" : "hover:bg-[#F5F8F7] dark:hover:bg-slate-800/50"}`}>
                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">{DAY_NAMES_FULL[dow]}{isSat ? " *" : ""}</td>
                    <td className="px-5 py-3">
                      <input type="time" value={toTimeString(day.startHour, day.startMinute)}
                        disabled={day.isOff}
                        onChange={e => handleStartTime(dow, e.target.value)}
                        className="rounded-lg border border-[#DCE9E6] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[#0B4F4B] disabled:opacity-40 dark:border-slate-700" />
                    </td>
                    <td className="px-5 py-3">
                      <input type="time" value={toTimeString(day.endHour, day.endMinute)}
                        disabled={day.isOff}
                        onChange={e => handleEndTime(dow, e.target.value)}
                        className="rounded-lg border border-[#DCE9E6] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[#0B4F4B] disabled:opacity-40 dark:border-slate-700" />
                    </td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{day.isOff ? "—" : formatDayHours(day)}</td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => updateDay(dow, { isOff: !day.isOff })}
                        title={isFri ? "Friday is off by default; toggle to make it a workday" : undefined}
                        className={`relative h-6 w-11 rounded-full p-0.5 transition ${day.isOff ? "bg-rose-400" : "bg-[#0B4F4B]"}`}
                      >
                        <span className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${day.isOff ? "translate-x-5" : ""}`} />
                      </button>
                      {isSat && <span className="ml-2 text-xs text-slate-400">see rule below</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="border-t border-[#DCE9E6] px-6 py-3 text-xs text-slate-400 dark:border-slate-800">* Saturday follows the Saturday rule below unless the row is toggled off (always off).</p>
      </div>

      {/* Saturday rule */}
      <div className="rounded-3xl border border-[#DCE9E6] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-[#DCE9E6] px-6 py-5 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-950 dark:text-white">Saturday off rule</h2>
          <p className="mt-0.5 text-sm text-slate-500">Which Saturdays are non-working days each month.</p>
        </div>
        <div className="space-y-3 p-6">
          {SAT_RULES.map(r => (
            <label key={r.value} className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${schedule.saturdayOffRule === r.value ? "border-[#0B4F4B] bg-[#E8F3F1] dark:border-[#8FD4C6] dark:bg-[#133E3C]" : "border-[#DCE9E6] hover:border-[#0B4F4B]/40 dark:border-slate-700"}`}>
              <input type="radio" name="satRule" value={r.value} checked={schedule.saturdayOffRule === r.value}
                onChange={() => { setSchedule(s => ({ ...s, saturdayOffRule: r.value })); setSaved(false); }}
                className="accent-[#0B4F4B]" />
              <span className="text-sm font-medium text-slate-900 dark:text-white">{r.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Deduction rules */}
      <div className="rounded-3xl border border-[#DCE9E6] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-[#DCE9E6] px-6 py-5 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-950 dark:text-white">Late arrival deductions</h2>
          <p className="mt-0.5 text-sm text-slate-500">When an employee checks in after the shift start, these thresholds determine the salary deduction. The highest matching rule applies.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b border-[#DCE9E6] dark:border-slate-800">
                {["Late by (min)", "Approx. check-in time", "Deduction", ""].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE9E6] dark:divide-slate-800">
              {schedule.deductionRules.map((rule, idx) => {
                const totalMin = 11 * 60 + rule.minutesLate;
                const h = Math.floor(totalMin / 60); const m = totalMin % 60;
                const ampm = h < 12 ? "AM" : "PM"; const h12 = h % 12 === 0 ? 12 : h % 12;
                return (
                  <tr key={idx} className="hover:bg-[#F5F8F7] dark:hover:bg-slate-800/50">
                    <td className="px-5 py-3">
                      <input type="number" min={1} max={480} value={rule.minutesLate}
                        onChange={e => {
                          const mins = parseInt(e.target.value, 10);
                          if (!isNaN(mins) && mins > 0) {
                            const updated = [...schedule.deductionRules];
                            updated[idx] = { ...rule, minutesLate: mins };
                            setSchedule(s => ({ ...s, deductionRules: updated.sort((a,b)=>a.minutesLate-b.minutesLate) }));
                            setSaved(false);
                          }
                        }}
                        className="w-20 rounded-lg border border-[#DCE9E6] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[#0B4F4B] dark:border-slate-700" />
                    </td>
                    <td className="px-5 py-3 text-slate-500">{h12}:{String(m).padStart(2,"0")} {ampm}</td>
                    <td className="px-5 py-3">
                      <select value={rule.deductFraction}
                        onChange={e => {
                          const frac = parseFloat(e.target.value);
                          const updated = [...schedule.deductionRules];
                          updated[idx] = { ...rule, deductFraction: frac };
                          setSchedule(s => ({ ...s, deductionRules: updated }));
                          setSaved(false);
                        }}
                        className="rounded-lg border border-[#DCE9E6] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[#0B4F4B] dark:border-slate-700">
                        <option value={0.25}>¼ day (0.25)</option>
                        <option value={0.50}>½ day (0.50)</option>
                        <option value={0.75}>¾ day (0.75)</option>
                        <option value={1.00}>1 day (1.00)</option>
                      </select>
                    </td>
                    <td className="px-5 py-3">
                      <button onClick={() => removeDeductionRule(idx)} className="text-slate-300 hover:text-rose-500 dark:text-slate-600"><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Add new rule */}
        <div className="flex flex-wrap items-end gap-3 border-t border-[#DCE9E6] p-5 dark:border-slate-800">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Minutes late</label>
            <input type="number" min={1} max={480} value={newRule.minutesLate}
              onChange={e => setNewRule(r => ({ ...r, minutesLate: parseInt(e.target.value,10)||0 }))}
              className="w-24 rounded-lg border border-[#DCE9E6] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[#0B4F4B] dark:border-slate-700" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Deduction</label>
            <select value={newRule.deductFraction}
              onChange={e => setNewRule(r => ({ ...r, deductFraction: parseFloat(e.target.value) }))}
              className="rounded-lg border border-[#DCE9E6] bg-transparent px-2 py-1.5 text-sm outline-none focus:border-[#0B4F4B] dark:border-slate-700">
              <option value={0.25}>¼ day</option>
              <option value={0.50}>½ day</option>
              <option value={0.75}>¾ day</option>
              <option value={1.00}>1 day</option>
            </select>
          </div>
          <Button onClick={addDeductionRule} className="bg-[#0B4F4B] text-white hover:bg-[#063C39]"><Plus className="h-4 w-4" />Add rule</Button>
        </div>

        <div className="rounded-b-3xl border-t border-[#DCE9E6] bg-[#F5F8F7] px-6 py-3 dark:border-slate-800 dark:bg-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5" />
            Delays covered by an employee&apos;s 4-hour monthly excuse balance reduce or eliminate the salary deduction. Unused balance resets on the 1st of each month.
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} className="bg-[#0B4F4B] text-white hover:bg-[#063C39]">
          {saved ? <><Check className="h-4 w-4" />Saved</> : "Save schedule"}
        </Button>
        <span className="text-xs text-slate-400">Demo only — saved in this browser. Changes affect all attendance and finance views immediately.</span>
      </div>
    </div>
  );
}

/* ── Role permissions ── */
function PermissionsTab() {
  const [perms, setPerms] = useState(DEFAULT_PERMISSIONS);
  const [saved, setSaved] = useState(false);

  const toggle = (role: string, perm: string) => {
    setPerms(p => ({ ...p, [role]: { ...p[role], [perm]: !p[role][perm] } }));
    setSaved(false);
  };

  return (
    <div className="rounded-3xl border border-[#DCE9E6] bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-[#DCE9E6] px-6 py-5 dark:border-slate-800">
        <h2 className="text-base font-semibold text-slate-950 dark:text-white">Role permissions</h2>
        <p className="mt-0.5 text-sm text-slate-500">Configure which roles can access each feature. Changes apply to all users with that role.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b border-[#DCE9E6] dark:border-slate-800">
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-widest text-slate-500">Permission</th>
              {ROLES.map(role => (
                <th key={role} className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-widest text-slate-500 whitespace-nowrap">
                  {role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DCE9E6] dark:divide-slate-800">
            {PERMISSIONS.map(perm => (
              <tr key={perm.key} className="transition hover:bg-[#F5F8F7] dark:hover:bg-slate-800/50">
                <td className="px-6 py-3.5 font-medium text-slate-900 dark:text-white">{perm.label}</td>
                {ROLES.map(role => (
                  <td key={role} className="px-3 py-3.5 text-center">
                    <button
                      onClick={() => toggle(role, perm.key)}
                      className={`mx-auto grid h-6 w-6 place-items-center rounded-lg transition ${
                        perms[role]?.[perm.key]
                          ? "bg-[#0B4F4B] text-white hover:bg-[#063C39]"
                          : "border border-[#DCE9E6] text-transparent hover:border-[#0B4F4B] dark:border-slate-700"
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-[#DCE9E6] px-6 py-4 dark:border-slate-800">
        <Button
          onClick={() => setSaved(true)}
          className="bg-[#0B4F4B] text-white hover:bg-[#063C39]"
        >
          {saved ? <><Check className="h-4 w-4" /> Saved</> : "Save permissions"}
        </Button>
        <span className="ml-3 text-xs text-slate-400">Demo only — changes persist in this session.</span>
      </div>
    </div>
  );
}
