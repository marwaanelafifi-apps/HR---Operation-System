"use client";

import { useEffect, useState } from "react";
import { getPosition, isShortMapsLink, loadOffice, parseCoordinates, loadUnlocks, saveOffice, saveUnlocks, type GeoFailure } from "@/lib/office-location";
import { Check, Lock, MapPin, Plus, Shield, Trash2, Unlock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { zones as defaultZones, attendanceUnlocks as defaultUnlocks } from "@/lib/mock-data";

type Tab = "office" | "zones" | "attendance" | "permissions";

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
  const [tab, setTab] = useState<Tab>("office");

  return (
    <div>
      {/* Tab bar */}
      <div className="mb-6 flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-[#DCE9E6] bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900 w-fit">
        {([["office", "Office location"], ["zones", "Zones"], ["attendance", "Attendance locks"], ["permissions", "Role permissions"]] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${tab === key ? "bg-[#0B4F4B] text-white shadow-sm" : "text-slate-500 hover:text-[#0B4F4B] dark:text-slate-400"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "office" && <OfficeTab />}
      {tab === "zones" && <ZonesTab />}
      {tab === "attendance" && <AttendanceTab />}
      {tab === "permissions" && <PermissionsTab />}
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
