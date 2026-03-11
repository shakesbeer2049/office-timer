"use client";

import { useState } from "react";
import Toggle from "./Toggle";
import { User, Settings } from "./types";

export default function SettingsSheet({
  open,
  onClose,
  user,
  saveUser,
  settings,
  saveSettings,
  notifPermission,
  setNotifPermission,
  handleSetLocation,
  gettingLocation,
  locationError,
  currentDistance,
  insideZone,
  handleLogout,
}: {
  open: boolean;
  onClose: () => void;
  user: User;
  saveUser: (u: User) => void;
  settings: Settings;
  saveSettings: (s: Settings) => void;
  notifPermission: string;
  setNotifPermission: (p: string) => void;
  handleSetLocation: () => void;
  gettingLocation: boolean;
  locationError: string | null;
  currentDistance: number | null;
  insideZone: boolean;
  handleLogout: () => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [editingHours, setEditingHours] = useState(false);
  const [hoursInput, setHoursInput] = useState("");

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 rounded-t-3xl border-t border-zinc-700 transition-transform duration-300 ease-in-out max-h-[85vh] overflow-y-auto ${open ? "translate-y-0" : "translate-y-full"}`}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-zinc-600 rounded-full" />
        </div>

        <div className="px-6 pb-10 pt-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Settings</h2>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-800 transition-colors text-lg"
            >
              ✕
            </button>
          </div>

          {/* Notifications */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
              Notifications
            </p>
            <div className="bg-zinc-800 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Push Notifications</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Punch-in reminders & work complete alerts
                  </p>
                </div>
                <Toggle
                  enabled={settings.notificationsEnabled}
                  onChange={(v) => {
                    if (v && "Notification" in window && Notification.permission !== "granted") {
                      Notification.requestPermission().then((p) => {
                        setNotifPermission(p);
                        if (p === "granted")
                          saveSettings({ ...settings, notificationsEnabled: true });
                      });
                    } else {
                      saveSettings({ ...settings, notificationsEnabled: v });
                    }
                  }}
                />
              </div>
              {notifPermission === "denied" && (
                <p className="text-xs text-yellow-400 mt-2">
                  ⚠ Blocked by browser — enable in system settings.
                </p>
              )}
              {settings.notificationsEnabled && notifPermission === "granted" && (
                <div className="mt-3 space-y-2 border-t border-zinc-700 pt-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-zinc-300">Punch-in reminder</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Weekdays only, if not punched in</p>
                    </div>
                    <input
                      type="time"
                      value={settings.punchInReminderTime}
                      onChange={(e) =>
                        saveSettings({ ...settings, punchInReminderTime: e.target.value })
                      }
                      className="bg-zinc-700 text-white text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-zinc-300">Work day complete alert</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Notifies when you hit your work hours</p>
                    </div>
                    <span className="text-xs text-green-400 font-medium">✓ On</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Geofencing */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
              Geofencing
            </p>
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

              <div className="space-y-3 border-t border-zinc-700 pt-3">
                <p className="text-xs font-medium text-zinc-400">Office Location</p>
                <button
                  onClick={handleSetLocation}
                  disabled={gettingLocation}
                  className="w-full bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {gettingLocation ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Getting location…
                    </>
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
                    min={10}
                    max={100}
                    step={5}
                    value={settings.geofenceRadius}
                    onChange={(e) =>
                      saveSettings({ ...settings, geofenceRadius: Number(e.target.value) })
                    }
                    className="w-full accent-blue-500"
                  />
                  <div className="flex justify-between text-xs text-zinc-600 mt-1">
                    <span>10m</span>
                    <span>100m</span>
                  </div>
                </div>

                {settings.geofenceEnabled && settings.geofenceLat !== null && (
                  <div
                    className={`flex items-center gap-2 text-sm font-medium rounded-xl px-3 py-2 ${insideZone ? "bg-green-500/15 text-green-400" : "bg-zinc-900 text-zinc-400"}`}
                  >
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
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
              Account
            </p>
            <div className="bg-zinc-800 rounded-2xl p-4 space-y-3">
              {editingName ? (
                <div className="flex gap-2">
                  <input
                    autoFocus
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const n = nameInput.trim();
                        if (n) saveUser({ ...user, name: n });
                        setEditingName(false);
                      }
                      if (e.key === "Escape") setEditingName(false);
                    }}
                    className="flex-1 bg-zinc-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Your name"
                  />
                  <button
                    onClick={() => {
                      const n = nameInput.trim();
                      if (n) saveUser({ ...user, name: n });
                      setEditingName(false);
                    }}
                    className="text-xs text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-2 rounded-lg transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingName(false)}
                    className="text-xs text-zinc-400 bg-zinc-700 hover:bg-zinc-600 px-3 py-2 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{user.name}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{user.workHours}h work day</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setNameInput(user.name); setEditingName(true); }}
                      className="text-xs text-zinc-400 hover:text-white bg-zinc-700 hover:bg-zinc-600 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Edit name
                    </button>
                    <button
                      onClick={() => { setHoursInput(String(user.workHours)); setEditingHours(true); }}
                      className="text-xs text-zinc-400 hover:text-white bg-zinc-700 hover:bg-zinc-600 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Edit hours
                    </button>
                  </div>
                </div>
              )}
              {editingHours && (
                <div className="flex gap-2 items-center">
                  <input
                    autoFocus
                    type="number"
                    min="1"
                    max="24"
                    step="0.5"
                    value={hoursInput}
                    onChange={(e) => setHoursInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const h = parseFloat(hoursInput);
                        if (h > 0) saveUser({ ...user, workHours: h });
                        setEditingHours(false);
                      }
                      if (e.key === "Escape") setEditingHours(false);
                    }}
                    className="flex-1 bg-zinc-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Work hours"
                  />
                  <button
                    onClick={() => {
                      const h = parseFloat(hoursInput);
                      if (h > 0) saveUser({ ...user, workHours: h });
                      setEditingHours(false);
                    }}
                    className="text-xs text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-2 rounded-lg transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingHours(false)}
                    className="text-xs text-zinc-400 bg-zinc-700 hover:bg-zinc-600 px-3 py-2 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
              <div className="border-t border-zinc-700 pt-3">
                <button
                  onClick={() => { onClose(); handleLogout(); }}
                  className="text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
