"use client";

import { useState, useEffect, useRef } from "react";

// ── Storage keys ───────────────────────────────────────────────────
const STORAGE_USER = "punch_user";
const STORAGE_RECORDS = "punch_records";
const STORAGE_SETTINGS = "punch_settings";
const DEFAULT_WORK_HOURS = 9;

// ── Interfaces ─────────────────────────────────────────────────────
interface PunchRecord {
  id: string;
  date: string;
  punchIn: string;
  punchOut: string | null;
  customEntry: boolean;
}
interface User { name: string; workHours: number; }
interface Settings {
  notificationsEnabled: boolean;
  geofenceEnabled: boolean;
  geofenceLat: number | null;
  geofenceLng: number | null;
  geofenceRadius: number;
}

const DEFAULT_SETTINGS: Settings = {
  notificationsEnabled: true,
  geofenceEnabled: false,
  geofenceLat: 28.49685,
  geofenceLng: 77.15953,
  geofenceRadius: 100,
};

// ── Utilities ──────────────────────────────────────────────────────
function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
}
function fmtDuration(ms: number) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}
function fmtDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}
function currentTimeStr() {
  const n = new Date();
  return `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
}
function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function sendNotif(title: string, body: string) {
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body, icon: "/favicon.ico" });
  }
}

// ── Checkpoints ────────────────────────────────────────────────────
const CHECKPOINTS = [
  { pct: 25, icon: "🪙", collected: "⭐", label: "¼" },
  { pct: 50, icon: "🍄", collected: "🌟", label: "½" },
  { pct: 75, icon: "🪙", collected: "⭐", label: "¾" },
];

// ── Motivating sayings ─────────────────────────────────────────────
const SAYINGS: Array<{ max: number; messages: string[] }> = [
  { max: 5,        messages: ["Clock in, zone in. Let's go! ⚡", "Every great day starts with step one. 🚀", "The grind begins — you got this! 💪"] },
  { max: 25,       messages: ["Warming up nicely! First coins incoming 🪙", "Morning momentum loading… ☕", "Off to a solid start, keep rolling! 🔥"] },
  { max: 50,       messages: ["First checkpoint cleared! You're on fire 🔥", "Quarter done — mushroom power activated! 🍄", "25% in the bag, the rhythm is real 🎯"] },
  { max: 75,       messages: ["HALFWAY! Absolutely crushing it 🏆", "Over the hump — all downhill from here ⬇️", "50% done. The second half is yours 💥"] },
  { max: 90,       messages: ["Three quarters done! Finish line is close 🏁", "Final star collected — just a bit more! ⭐", "75% in. Legendary pace 🌟"] },
  { max: 100,      messages: ["Final stretch! You can taste the finish 🏃", "Almost there — don't stop now! 💨", "So close! One last push! 🔥"] },
  { max: Infinity, messages: ["Full day DONE! Absolute legend 🏆", "Conquered! Punch out and rest up 😎", "Day complete — you earned every second 🎉"] },
];
function getMotivation(pct: number): string {
  const bucket = SAYINGS.find((b) => pct < b.max) ?? SAYINGS[SAYINGS.length - 1];
  return bucket.messages[new Date().getDate() % bucket.messages.length];
}

// ── Toggle switch ──────────────────────────────────────────────────
function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 ${enabled ? "bg-blue-600" : "bg-zinc-600"}`}
    >
      <div
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${enabled ? "translate-x-5" : "translate-x-0"}`}
      />
    </button>
  );
}

// ── Animated Progress Bar ──────────────────────────────────────────
function AnimatedProgressBar({
  pct, isPunchedIn, isCompleted, punchInIso, workHours,
}: {
  pct: number; isPunchedIn: boolean; isCompleted: boolean; punchInIso: string; workHours: number;
}) {
  const clampedPct = Math.min(pct, 97);
  const barColor = isCompleted
    ? "from-green-600 to-green-400"
    : pct >= 80 ? "from-yellow-600 to-yellow-400" : "from-blue-700 to-blue-400";

  const getCheckpointTime = (cpPct: number) => {
    const start = new Date(punchInIso).getTime();
    return fmtTime(new Date(start + (cpPct / 100) * workHours * 3600000).toISOString());
  };

  return (
    <div className="relative">
      {/* Mario / cat */}
      <div className="h-10 relative">
        <div
          className="absolute bottom-0 transition-[left] duration-1000 ease-in-out select-none z-10"
          style={{ left: `${clampedPct}%`, transform: "translateX(-50%)" }}
        >
          {isCompleted ? (
            <div className="relative">
              <span className="animate-cat-breathe text-2xl inline-block">😺</span>
              <span className="animate-zzz-1 absolute text-blue-300 font-bold" style={{ right: "-10px", top: "-2px", fontSize: "10px" }}>z</span>
              <span className="animate-zzz-2 absolute text-blue-300 font-bold" style={{ right: "-16px", top: "-10px", fontSize: "13px" }}>z</span>
              <span className="animate-zzz-3 absolute text-blue-300 font-bold" style={{ right: "-22px", top: "-20px", fontSize: "16px" }}>Z</span>
            </div>
          ) : isPunchedIn ? (
            <span className="animate-mario-run text-2xl">🏃</span>
          ) : (
            <span className="text-2xl">🚶</span>
          )}
        </div>
        <div className="absolute bottom-0 right-0 text-xl select-none opacity-70">🏁</div>
      </div>

      {/* Checkpoint icons */}
      <div className="relative h-6">
        {CHECKPOINTS.map((cp) => (
          <div key={cp.pct} className="absolute bottom-0 select-none transition-all duration-500" style={{ left: `${cp.pct}%`, transform: "translateX(-50%)" }}>
            {pct >= cp.pct ? (
              <span className="text-base inline-block" style={{ animation: "mario-run 0.6s ease-in-out infinite", filter: "drop-shadow(0 0 4px gold)" }}>{cp.collected}</span>
            ) : (
              <span className="text-base opacity-30">{cp.icon}</span>
            )}
          </div>
        ))}
      </div>

      {/* Track */}
      <div className="relative">
        <div className="h-3 bg-zinc-800 rounded-full overflow-hidden relative">
          <div
            className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-[width] duration-1000 relative overflow-hidden`}
            style={{ width: `${pct}%` }}
          >
            {isPunchedIn && !isCompleted && (
              <div className="animate-shimmer absolute inset-0 opacity-40" style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.7) 50%, transparent 100%)", width: "40%" }} />
            )}
          </div>
        </div>
        {/* Start / Mid / End labels */}
        <div className="relative mt-1">
          <span className="absolute left-0 text-xs text-zinc-400">{getCheckpointTime(0)}</span>
          <span className="absolute text-xs text-zinc-400" style={{ left: "50%", transform: "translateX(-50%)" }}>{getCheckpointTime(50)}</span>
          <span className="absolute right-0 text-xs text-zinc-400">{getCheckpointTime(100)}</span>
        </div>
        <div className="h-5" />
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────
export default function PunchApp() {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === "undefined") return null;
    const u = localStorage.getItem(STORAGE_USER);
    return u ? (JSON.parse(u) as User) : null;
  });
  const [records, setRecords] = useState<PunchRecord[]>(() => {
    if (typeof window === "undefined") return [];
    const r = localStorage.getItem(STORAGE_RECORDS);
    return r ? (JSON.parse(r) as PunchRecord[]) : [];
  });
  const [settings, setSettings] = useState<Settings>(() => {
    if (typeof window === "undefined") return DEFAULT_SETTINGS;
    const s = localStorage.getItem(STORAGE_SETTINGS);
    return s ? { ...DEFAULT_SETTINGS, ...(JSON.parse(s) as Partial<Settings>) } : DEFAULT_SETTINGS;
  });
  const [now, setNow] = useState(new Date());
  const [nameInput, setNameInput] = useState("");
  const [workHoursInput, setWorkHoursInput] = useState(String(DEFAULT_WORK_HOURS));
  const [customMode, setCustomMode] = useState(false);
  const [customTime, setCustomTime] = useState(currentTimeStr);
  const [editingPunchIn, setEditingPunchIn] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notifPermission, setNotifPermission] = useState("default");
  const [currentDistance, setCurrentDistance] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  const workDoneNotifiedRef = useRef(false);
  const geofenceTriggeredRef = useRef(false);

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Notification permission
  useEffect(() => {
    if (!user || typeof window === "undefined" || !("Notification" in window)) return;
    setNotifPermission(Notification.permission);
    if (Notification.permission === "default") {
      Notification.requestPermission().then((p) => setNotifPermission(p));
    }
  }, [user]);

  // Geofence watcher
  useEffect(() => {
    if (!settings.geofenceEnabled || settings.geofenceLat === null || settings.geofenceLng === null) {
      setCurrentDistance(null);
      return;
    }
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setLocationError("Geolocation not supported by this browser.");
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const dist = getDistanceMeters(
          pos.coords.latitude, pos.coords.longitude,
          settings.geofenceLat!, settings.geofenceLng!
        );
        setCurrentDistance(dist);
        setLocationError(null);

        if (dist > settings.geofenceRadius) {
          geofenceTriggeredRef.current = false;
          return;
        }
        if (geofenceTriggeredRef.current) return;

        // Read fresh from localStorage to avoid stale closure
        const saved = localStorage.getItem(STORAGE_RECORDS);
        const recs: PunchRecord[] = saved ? (JSON.parse(saved) as PunchRecord[]) : [];
        const todayStr = localDateStr();
        const todayRec = recs.find((r) => r.date === todayStr);
        if (todayRec) return; // already punched in or completed today

        geofenceTriggeredRef.current = true;
        const newRecord: PunchRecord = {
          id: crypto.randomUUID(),
          date: todayStr,
          punchIn: new Date().toISOString(),
          punchOut: null,
          customEntry: false,
        };
        const updated = [...recs, newRecord];
        localStorage.setItem(STORAGE_RECORDS, JSON.stringify(updated));
        setRecords(updated);
        workDoneNotifiedRef.current = false;
        if (settings.notificationsEnabled) {
          sendNotif("📍 Auto Punch In!", "You entered your office zone. Automatically punched in!");
        }
      },
      (err) => {
        // code 2 = POSITION_UNAVAILABLE (includes kCLErrorLocationUnknown — temporary, keep trying)
        if (err.code !== 2) setLocationError(err.message);
      },
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 30000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [settings.geofenceEnabled, settings.geofenceLat, settings.geofenceLng, settings.geofenceRadius, settings.notificationsEnabled]);

  const saveRecords = (r: PunchRecord[]) => {
    localStorage.setItem(STORAGE_RECORDS, JSON.stringify(r));
    setRecords(r);
  };
  const saveSettings = (s: Settings) => {
    localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(s));
    setSettings(s);
  };
  const saveUser = (u: User) => {
    localStorage.setItem(STORAGE_USER, JSON.stringify(u));
    setUser(u);
  };

  const today = localDateStr();
  const todayRecord = records.find((r) => r.date === today) ?? null;
  const isPunchedIn = !!(todayRecord && !todayRecord.punchOut);
  const isCompleted = !!(todayRecord?.punchOut);

  const handleLogin = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    const name = nameInput.trim();
    if (!name) return;
    saveUser({ name, workHours: Math.max(1, parseFloat(workHoursInput) || DEFAULT_WORK_HOURS) });
  };

  const timeStrToIso = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const d = new Date(); d.setHours(h, m, 0, 0); return d.toISOString();
  };

  const doPunchIn = (customTimeStr?: string) => {
    const punchInIso = customTimeStr ? timeStrToIso(customTimeStr) : new Date().toISOString();
    const newRecord: PunchRecord = { id: crypto.randomUUID(), date: today, punchIn: punchInIso, punchOut: null, customEntry: !!customTimeStr };
    saveRecords([...records.filter((r) => r.date !== today), newRecord]);
    setCustomMode(false);
    setEditingPunchIn(false);
    workDoneNotifiedRef.current = false;
  };

  const doPunchOut = () => {
    if (!todayRecord) return;
    saveRecords(records.map((r) => r.id === todayRecord.id ? { ...r, punchOut: new Date().toISOString() } : r));
  };

  const doEditPunchIn = (t: string) => {
    if (!todayRecord) return;
    saveRecords(records.map((r) => r.id === todayRecord.id ? { ...r, punchIn: timeStrToIso(t), customEntry: true } : r));
    setEditingPunchIn(false);
    workDoneNotifiedRef.current = false;
  };

  const doResetDay = () => {
    saveRecords(records.filter((r) => r.date !== today));
    workDoneNotifiedRef.current = false;
    geofenceTriggeredRef.current = false;
  };

  const handleLogout = () => { localStorage.removeItem(STORAGE_USER); setUser(null); };

  const getProgress = () => {
    if (!todayRecord || !user) return { pct: 0, elapsed: 0, expectedEnd: null, remaining: 0 };
    const start = new Date(todayRecord.punchIn).getTime();
    const current = todayRecord.punchOut ? new Date(todayRecord.punchOut).getTime() : now.getTime();
    const elapsed = current - start;
    const total = user.workHours * 3600000;
    return { pct: Math.min(100, (elapsed / total) * 100), elapsed, expectedEnd: new Date(start + total).toISOString(), remaining: Math.max(0, total - elapsed) };
  };
  const { pct, elapsed, expectedEnd, remaining } = getProgress();

  // Work done notification
  useEffect(() => {
    if (isPunchedIn && pct >= 100 && !workDoneNotifiedRef.current && user && settings.notificationsEnabled) {
      workDoneNotifiedRef.current = true;
      sendNotif("✅ Work day complete!", `You've finished your ${user.workHours}h. Time to punch out!`);
    }
  }, [isPunchedIn, pct, user, settings.notificationsEnabled]);

  // Morning reminder
  useEffect(() => {
    if (!user || isPunchedIn || isCompleted || !settings.notificationsEnabled) return;
    const h = now.getHours(), mins = now.getMinutes(), day = now.getDay();
    const key = `punch_reminder_${today}`;
    if (day >= 1 && day <= 5 && h >= 9 && h < 10 && mins < 5 && !localStorage.getItem(key)) {
      localStorage.setItem(key, "1");
      sendNotif("⏰ Don't forget to punch in!", `Good morning, ${user.name}! You haven't punched in yet.`);
    }
  }, [now, user, isPunchedIn, isCompleted, today, settings.notificationsEnabled]);

  const pastRecords = records.filter((r) => r.date !== today).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);

  // ── Set office location helper ─────────────────────────────────
  const handleSetLocation = () => {
    if (!("geolocation" in navigator)) { setLocationError("Geolocation not supported."); return; }
    setGettingLocation(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        saveSettings({ ...settings, geofenceLat: pos.coords.latitude, geofenceLng: pos.coords.longitude });
        setGettingLocation(false);
      },
      (err) => { setLocationError(err.message); setGettingLocation(false); },
      { enableHighAccuracy: true }
    );
  };

  const insideZone = currentDistance !== null && settings.geofenceLat !== null && currentDistance <= settings.geofenceRadius;

  // ── Login ──────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">⏱</div>
            <h1 className="text-2xl font-bold text-white">Punch Timer</h1>
            <p className="text-zinc-400 text-sm mt-1">Track your office hours</p>
          </div>
          <form onSubmit={handleLogin} className="bg-zinc-900 rounded-2xl p-6 space-y-4 border border-zinc-800">
            <div>
              <label className="text-xs font-medium text-zinc-400 block mb-1.5 uppercase tracking-wide">Your Name</label>
              <input type="text" value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="Enter your name" className="w-full bg-zinc-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-zinc-600 text-sm" required autoFocus />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400 block mb-1.5 uppercase tracking-wide">Work Hours per Day</label>
              <input type="number" value={workHoursInput} onChange={(e) => setWorkHoursInput(e.target.value)} min="1" max="24" step="0.5" className="w-full bg-zinc-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg py-3 transition-colors text-sm">Get Started</button>
          </form>
        </div>
      </div>
    );
  }

  // ── Main App ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Settings backdrop */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setShowSettings(false)} />
      )}

      {/* Settings bottom sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 rounded-t-3xl border-t border-zinc-700 transition-transform duration-300 ease-in-out max-h-[85vh] overflow-y-auto ${showSettings ? "translate-y-0" : "translate-y-full"}`}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-zinc-600 rounded-full" />
        </div>

        <div className="px-6 pb-10 pt-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Settings</h2>
            <button onClick={() => setShowSettings(false)} className="text-zinc-400 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-800 transition-colors text-lg">✕</button>
          </div>

          {/* Notifications section */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Notifications</p>
            <div className="bg-zinc-800 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Push Notifications</p>
                  <p className="text-xs text-zinc-400 mt-0.5">Punch-in reminders & work complete alerts</p>
                </div>
                <Toggle
                  enabled={settings.notificationsEnabled}
                  onChange={(v) => {
                    if (v && "Notification" in window && Notification.permission !== "granted") {
                      Notification.requestPermission().then((p) => {
                        setNotifPermission(p);
                        if (p === "granted") saveSettings({ ...settings, notificationsEnabled: true });
                      });
                    } else {
                      saveSettings({ ...settings, notificationsEnabled: v });
                    }
                  }}
                />
              </div>
              {notifPermission === "denied" && (
                <p className="text-xs text-yellow-400 mt-2">⚠ Blocked by browser — enable in system settings.</p>
              )}
              {notifPermission === "granted" && settings.notificationsEnabled && (
                <p className="text-xs text-green-400 mt-2">✓ Notifications are active</p>
              )}
            </div>
          </div>

          {/* Geofencing section */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Geofencing</p>
            <div className="bg-zinc-800 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Auto Punch In</p>
                  <p className="text-xs text-zinc-400 mt-0.5">Punch in automatically when you arrive</p>
                </div>
                <Toggle
                  enabled={settings.geofenceEnabled}
                  onChange={(v) => saveSettings({ ...settings, geofenceEnabled: v })}
                />
              </div>

              {/* Office location setup */}
              <div className="space-y-3 border-t border-zinc-700 pt-3">
                <p className="text-xs font-medium text-zinc-400">Office Location</p>
                <button
                  onClick={handleSetLocation}
                  disabled={gettingLocation}
                  className="w-full bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {gettingLocation ? (
                    <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Getting location…</>
                  ) : (
                    <>📍 {settings.geofenceLat ? "Update Current Location" : "Set Current Location"}</>
                  )}
                </button>

                {settings.geofenceLat !== null && settings.geofenceLng !== null && (
                  <div className="text-xs text-zinc-400 bg-zinc-900 rounded-xl px-3 py-2 font-mono">
                    {settings.geofenceLat.toFixed(5)}, {settings.geofenceLng.toFixed(5)}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-zinc-400">Detection Radius</p>
                    <span className="text-xs font-bold text-white">{settings.geofenceRadius}m</span>
                  </div>
                  <input
                    type="range"
                    min={10} max={100} step={5}
                    value={settings.geofenceRadius}
                    onChange={(e) => saveSettings({ ...settings, geofenceRadius: Number(e.target.value) })}
                    className="w-full accent-blue-500"
                  />
                  <div className="flex justify-between text-xs text-zinc-600 mt-1">
                    <span>10m</span><span>100m</span>
                  </div>
                </div>

                {/* Live distance status */}
                {settings.geofenceEnabled && settings.geofenceLat !== null && (
                  <div className={`flex items-center gap-2 text-sm font-medium rounded-xl px-3 py-2 ${insideZone ? "bg-green-500/15 text-green-400" : "bg-zinc-900 text-zinc-400"}`}>
                    <span>{insideZone ? "📍" : "🔵"}</span>
                    {currentDistance !== null
                      ? insideZone
                        ? `Inside zone — ${Math.round(currentDistance)}m from office`
                        : `Outside zone — ${Math.round(currentDistance)}m from office`
                      : "Waiting for location…"}
                  </div>
                )}

                {locationError && (
                  <p className="text-xs text-red-400">⚠ {locationError}</p>
                )}
              </div>
            </div>
          </div>

          {/* Account */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Account</p>
            <div className="bg-zinc-800 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{user.name}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{user.workHours}h work day</p>
                </div>
                <button onClick={() => { setShowSettings(false); handleLogout(); }} className="text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors">
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between max-w-2xl mx-auto">
        <div>
          <h1 className="font-bold text-base">⏱ Punch Timer</h1>
          <p className="text-zinc-500 text-xs mt-0.5">{fmtDate(today)}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Geofence badge */}
          {settings.geofenceEnabled && settings.geofenceLat !== null && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${insideZone ? "bg-green-500/20 text-green-400" : "bg-zinc-800 text-zinc-500"}`}>
              {insideZone ? "📍 In Zone" : "📍"}
            </span>
          )}
          <span className="text-sm text-zinc-300 font-medium">{user.name}</span>
          {/* Settings / menu button */}
          <button
            onClick={() => setShowSettings(true)}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white"
            aria-label="Settings"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-4 pb-8">
        {/* Status Card */}
        <div className="bg-zinc-900 rounded-2xl p-4 sm:p-6 border border-zinc-800">
          {/* Live Clock */}
          <div className="text-center mb-6">
            <div className="text-4xl sm:text-5xl font-mono font-bold tracking-tight text-white tabular-nums">
              {now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true })}
            </div>
            <div className={`text-xs font-medium mt-2 px-3 py-1 rounded-full inline-block ${isCompleted ? "bg-green-500/20 text-green-400" : isPunchedIn ? "bg-blue-500/20 text-blue-400" : "bg-zinc-800 text-zinc-400"}`}>
              {isCompleted ? "Session Complete" : isPunchedIn ? "Currently Working" : "Not Punched In"}
            </div>
          </div>

          {/* Progress bar + stats */}
          {todayRecord && (
            <div className="mb-4">
              <div className="flex justify-between text-xs mb-1">
                <div>
                  <div className="font-semibold text-white">{fmtTime(todayRecord.punchIn)}</div>
                  <div className="text-zinc-500 mt-0.5">Punch In{todayRecord.customEntry ? " (custom)" : ""}</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-white">{fmtDuration(elapsed)}</div>
                  <div className="text-zinc-500 mt-0.5">Elapsed</div>
                </div>
                <div className="text-right">
                  {expectedEnd && (<><div className="font-semibold text-white">{fmtTime(expectedEnd)}</div><div className="text-zinc-500 mt-0.5">Expected End</div></>)}
                </div>
              </div>
              <AnimatedProgressBar pct={pct} isPunchedIn={isPunchedIn} isCompleted={isCompleted} punchInIso={todayRecord.punchIn} workHours={user.workHours} />
              {(isPunchedIn || isCompleted) && (
                <div className="mt-1 mb-3 text-center">
                  <span className="text-xs text-zinc-400 italic">{getMotivation(pct)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs mt-1">
                <span className="text-zinc-600">{Math.round(pct)}% complete</span>
                {!isCompleted && remaining > 0 && <span className="text-zinc-400">{fmtDuration(remaining)} remaining</span>}
                {todayRecord.punchOut && <span className="text-zinc-400">Out: {fmtTime(todayRecord.punchOut)}</span>}
              </div>
            </div>
          )}

          {/* Not punched in */}
          {!todayRecord && !customMode && (
            <div className="space-y-2.5">
              <button onClick={() => doPunchIn()} className="w-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold py-4 rounded-xl text-base transition-all">Punch In</button>
              <button onClick={() => { setCustomMode(true); setCustomTime(currentTimeStr()); }} className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-medium py-3 rounded-xl text-sm transition-colors">Set Custom Punch-In Time</button>
            </div>
          )}

          {/* Custom time entry */}
          {!todayRecord && customMode && (
            <div className="space-y-3">
              <label className="text-xs font-medium text-zinc-400 block uppercase tracking-wide">When did you arrive?</label>
              <input type="time" value={customTime} onChange={(e) => setCustomTime(e.target.value)} className="w-full bg-zinc-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-lg font-mono" />
              <div className="flex gap-2">
                <button onClick={() => doPunchIn(customTime)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors">Set Punch-In Time</button>
                <button onClick={() => setCustomMode(false)} className="px-5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl transition-colors text-sm">Cancel</button>
              </div>
            </div>
          )}

          {/* Punched in */}
          {isPunchedIn && !editingPunchIn && (
            <div className="space-y-2.5">
              <button onClick={doPunchOut} className="w-full bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold py-4 rounded-xl text-base transition-all">Punch Out</button>
              <button onClick={() => { const pi = new Date(todayRecord!.punchIn); setCustomTime(`${String(pi.getHours()).padStart(2, "0")}:${String(pi.getMinutes()).padStart(2, "0")}`); setEditingPunchIn(true); }} className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-500 text-sm py-2.5 rounded-xl transition-colors">Edit punch-in time</button>
            </div>
          )}

          {/* Edit punch-in */}
          {editingPunchIn && (
            <div className="space-y-3">
              <label className="text-xs font-medium text-zinc-400 block uppercase tracking-wide">Correct your punch-in time</label>
              <input type="time" value={customTime} onChange={(e) => setCustomTime(e.target.value)} className="w-full bg-zinc-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-lg font-mono" />
              <div className="flex gap-2">
                <button onClick={() => doEditPunchIn(customTime)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors">Update</button>
                <button onClick={() => setEditingPunchIn(false)} className="px-5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl transition-colors text-sm">Cancel</button>
              </div>
            </div>
          )}

          {/* Completed */}
          {isCompleted && (
            <div className="mt-2 p-4 bg-zinc-800/60 rounded-xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">Total time worked</span>
                <span className="font-bold text-white text-lg">{fmtDuration(elapsed)}</span>
              </div>
              {elapsed >= user.workHours * 3600000
                ? <div className="text-green-400 text-sm font-medium">✓ Full day completed!</div>
                : <div className="text-yellow-400 text-sm">{fmtDuration(user.workHours * 3600000 - elapsed)} short of full day</div>}
              <button onClick={doResetDay} className="w-full mt-1 bg-zinc-700 hover:bg-zinc-600 active:scale-95 text-zinc-200 text-sm font-medium py-2.5 rounded-lg transition-all">↺ Reset & Punch In Again</button>
            </div>
          )}
        </div>

        {/* History */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
          <button onClick={() => setShowHistory(!showHistory)} className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-zinc-800/50 transition-colors">
            <span className="font-semibold text-sm">History</span>
            <span className="text-zinc-500 text-xs">{showHistory ? "▲ Hide" : `▼ Show (${pastRecords.length})`}</span>
          </button>
          {showHistory && (
            <div className="divide-y divide-zinc-800">
              {pastRecords.length === 0 ? (
                <div className="px-5 py-5 text-zinc-500 text-sm text-center">No history yet</div>
              ) : pastRecords.map((r) => {
                const dur = r.punchOut ? new Date(r.punchOut).getTime() - new Date(r.punchIn).getTime() : null;
                const dayPct = dur ? Math.min(100, (dur / (user.workHours * 3600000)) * 100) : 0;
                return (
                  <div key={r.id} className="px-5 py-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-zinc-200">{fmtDate(r.date)}</span>
                      {r.customEntry && <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">custom</span>}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-zinc-500">
                      <span>In: <span className="text-zinc-300 font-medium">{fmtTime(r.punchIn)}</span></span>
                      <span>Out: <span className="text-zinc-300 font-medium">{r.punchOut ? fmtTime(r.punchOut) : "—"}</span></span>
                      {dur && <span>Duration: <span className="text-zinc-300 font-medium">{fmtDuration(dur)}</span></span>}
                    </div>
                    {dur && (
                      <div className="mt-2 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${dayPct >= 100 ? "bg-green-500" : "bg-yellow-500"}`} style={{ width: `${dayPct}%` }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
