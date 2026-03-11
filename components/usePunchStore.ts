"use client";

import { useState, useEffect, useRef } from "react";
import {
  PunchRecord,
  User,
  Settings,
  DEFAULT_SETTINGS,
  DEFAULT_WORK_HOURS,
  STORAGE_USER,
  STORAGE_RECORDS,
  STORAGE_SETTINGS,
} from "./types";
import {
  localDateStr,
  getDistanceMeters,
  sendNotif,
  currentTimeStr,
} from "./utils";

export function usePunchStore() {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const u = localStorage.getItem(STORAGE_USER);
      return u ? (JSON.parse(u) as User) : null;
    } catch { return null; }
  });

  const [records, setRecords] = useState<PunchRecord[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const r = localStorage.getItem(STORAGE_RECORDS);
      return r ? (JSON.parse(r) as PunchRecord[]) : [];
    } catch { return []; }
  });

  const [settings, setSettings] = useState<Settings>(() => {
    if (typeof window === "undefined") return DEFAULT_SETTINGS;
    try {
      const s = localStorage.getItem(STORAGE_SETTINGS);
      return s
        ? { ...DEFAULT_SETTINGS, ...(JSON.parse(s) as Partial<Settings>) }
        : DEFAULT_SETTINGS;
    } catch { return DEFAULT_SETTINGS; }
  });

  const [now, setNow] = useState(new Date());
  const [nameInput, setNameInput] = useState("");
  const [workHoursInput, setWorkHoursInput] = useState(String(DEFAULT_WORK_HOURS));
  const [customMode, setCustomMode] = useState(false);
  const [customTime, setCustomTime] = useState(currentTimeStr);
  const [editingPunchIn, setEditingPunchIn] = useState(false);
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
          pos.coords.latitude,
          pos.coords.longitude,
          settings.geofenceLat!,
          settings.geofenceLng!,
        );
        setCurrentDistance(dist);
        setLocationError(null);

        if (dist > settings.geofenceRadius) {
          geofenceTriggeredRef.current = false;
          return;
        }
        if (geofenceTriggeredRef.current) return;

        let recs: PunchRecord[] = [];
        try {
          const saved = localStorage.getItem(STORAGE_RECORDS);
          recs = saved ? (JSON.parse(saved) as PunchRecord[]) : [];
        } catch { recs = []; }

        const todayStr = localDateStr();
        if (recs.find((r) => r.date === todayStr)) return;

        geofenceTriggeredRef.current = true;
        const newRecord: PunchRecord = {
          id: crypto.randomUUID(),
          date: todayStr,
          punchIn: new Date().toISOString(),
          punchOut: null,
          customEntry: false,
        };
        const updated = [...recs, newRecord];
        try { localStorage.setItem(STORAGE_RECORDS, JSON.stringify(updated)); } catch { /* quota */ }
        setRecords(updated);
        workDoneNotifiedRef.current = false;
        if (settings.notificationsEnabled) {
          sendNotif("📍 Auto Punch In!", "You entered your office zone. Automatically punched in!");
        }
      },
      (err) => {
        if (err.code !== 2) setLocationError(err.message);
      },
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 30000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [
    settings.geofenceEnabled,
    settings.geofenceLat,
    settings.geofenceLng,
    settings.geofenceRadius,
    settings.notificationsEnabled,
  ]);

  // ── Save helpers ────────────────────────────────────────────────
  const saveRecords = (r: PunchRecord[]) => {
    try { localStorage.setItem(STORAGE_RECORDS, JSON.stringify(r)); } catch { /* quota */ }
    setRecords(r);
  };
  const saveSettings = (s: Settings) => {
    try { localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(s)); } catch { /* quota */ }
    setSettings(s);
  };
  const saveUser = (u: User) => {
    try { localStorage.setItem(STORAGE_USER, JSON.stringify(u)); } catch { /* quota */ }
    setUser(u);
  };

  // ── Derived ─────────────────────────────────────────────────────
  const today = localDateStr();
  const todayRecord = records.find((r) => r.date === today) ?? null;
  const isPunchedIn = !!(todayRecord && !todayRecord.punchOut);
  const isCompleted = !!todayRecord?.punchOut;

  const getProgress = () => {
    if (!todayRecord || !user)
      return { pct: 0, elapsed: 0, expectedEnd: null, remaining: 0 };
    const start = new Date(todayRecord.punchIn).getTime();
    const current = todayRecord.punchOut
      ? new Date(todayRecord.punchOut).getTime()
      : now.getTime();
    if (isNaN(start) || isNaN(current))
      return { pct: 0, elapsed: 0, expectedEnd: null, remaining: 0 };
    const elapsed = Math.max(0, current - start);
    const total = user.workHours * 3600000;
    return {
      pct: Math.min(100, (elapsed / total) * 100),
      elapsed,
      expectedEnd: new Date(start + total).toISOString(),
      remaining: Math.max(0, total - elapsed),
    };
  };
  const { pct, elapsed, expectedEnd, remaining } = getProgress();

  const pastRecords = records
    .filter((r) => r.punchOut !== null)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 30);

  const insideZone =
    currentDistance !== null &&
    settings.geofenceLat !== null &&
    currentDistance <= settings.geofenceRadius;

  // ── Notification effects ────────────────────────────────────────
  useEffect(() => {
    if (isPunchedIn && pct >= 100 && !workDoneNotifiedRef.current && user && settings.notificationsEnabled) {
      workDoneNotifiedRef.current = true;
      sendNotif("✅ Work day complete!", `You've finished your ${user.workHours}h. Time to punch out!`);
    }
  }, [isPunchedIn, pct, user, settings.notificationsEnabled]);

  useEffect(() => {
    if (!user || isPunchedIn || isCompleted || !settings.notificationsEnabled) return;
    const [rh, rm] = settings.punchInReminderTime.split(":").map(Number);
    const h = now.getHours(), mins = now.getMinutes(), day = now.getDay();
    const key = `punch_reminder_${today}`;
    if (day >= 1 && day <= 5 && h === rh && mins >= rm && mins < rm + 5) {
      try {
        if (!localStorage.getItem(key)) {
          localStorage.setItem(key, "1");
          sendNotif("⏰ Don't forget to punch in!", `Hey ${user.name}, you haven't punched in yet!`);
        }
      } catch { /* quota */ }
    }
  }, [now, user, isPunchedIn, isCompleted, today, settings.notificationsEnabled, settings.punchInReminderTime]);

  // ── Actions ─────────────────────────────────────────────────────
  const timeStrToIso = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.getTime() > Date.now() ? new Date().toISOString() : d.toISOString();
  };

  const handleLogin = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    const name = nameInput.trim();
    if (!name) return;
    saveUser({ name, workHours: Math.max(1, parseFloat(workHoursInput) || DEFAULT_WORK_HOURS) });
  };

  const doPunchIn = (customTimeStr?: string) => {
    const punchInIso = customTimeStr ? timeStrToIso(customTimeStr) : new Date().toISOString();
    const newRecord: PunchRecord = {
      id: crypto.randomUUID(),
      date: today,
      punchIn: punchInIso,
      punchOut: null,
      customEntry: !!customTimeStr,
      workHours: user?.workHours ?? DEFAULT_WORK_HOURS,
    };
    saveRecords([...records.filter((r) => r.date !== today), newRecord]);
    setCustomMode(false);
    setEditingPunchIn(false);
    workDoneNotifiedRef.current = false;
  };

  const doPunchOut = () => {
    if (!todayRecord) return;
    saveRecords(records.map((r) =>
      r.id === todayRecord.id ? { ...r, punchOut: new Date().toISOString() } : r,
    ));
  };

  const doEditPunchIn = (t: string) => {
    if (!todayRecord) return;
    saveRecords(records.map((r) =>
      r.id === todayRecord.id ? { ...r, punchIn: timeStrToIso(t), customEntry: true } : r,
    ));
    setEditingPunchIn(false);
    workDoneNotifiedRef.current = false;
  };

  const doResetDay = () => {
    saveRecords(records.filter((r) => r.date !== today));
    workDoneNotifiedRef.current = false;
    geofenceTriggeredRef.current = false;
  };

  const handleLogout = () => {
    try { localStorage.removeItem(STORAGE_USER); } catch { /* ignore */ }
    setUser(null);
  };

  const handleSetLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocationError("Geolocation not supported.");
      return;
    }
    setGettingLocation(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        saveSettings({ ...settings, geofenceLat: pos.coords.latitude, geofenceLng: pos.coords.longitude });
        setGettingLocation(false);
      },
      (err) => { setLocationError(err.message); setGettingLocation(false); },
      { enableHighAccuracy: true },
    );
  };

  return {
    // state
    user, settings, now,
    nameInput, setNameInput,
    workHoursInput, setWorkHoursInput,
    customMode, setCustomMode,
    customTime, setCustomTime,
    editingPunchIn, setEditingPunchIn,
    showSettings, setShowSettings,
    notifPermission, setNotifPermission,
    currentDistance, locationError, gettingLocation,
    // derived
    today, todayRecord, isPunchedIn, isCompleted,
    pct, elapsed, expectedEnd, remaining,
    pastRecords, insideZone,
    // actions
    saveUser, saveSettings,
    handleLogin, doPunchIn, doPunchOut, doEditPunchIn, doResetDay,
    handleLogout, handleSetLocation,
  };
}
