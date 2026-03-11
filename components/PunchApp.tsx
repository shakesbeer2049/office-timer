"use client";

import { usePunchStore } from "./usePunchStore";
import { fmtDate, fmtTime, fmtDuration, currentTimeStr } from "./utils";
import CatLottie from "./CatLottie";
import AnimatedProgressBar from "./AnimatedProgressBar";
import SettingsSheet from "./SettingsSheet";
import HistoryList from "./HistoryList";

export default function PunchApp() {
  const store = usePunchStore();
  const {
    user, settings, now,
    nameInput, setNameInput, workHoursInput, setWorkHoursInput,
    customMode, setCustomMode, customTime, setCustomTime,
    editingPunchIn, setEditingPunchIn,
    showSettings, setShowSettings,
    notifPermission, setNotifPermission,
    currentDistance, locationError, gettingLocation,
    today, todayRecord, isPunchedIn, isCompleted,
    pct, elapsed, expectedEnd, remaining,
    pastRecords, insideZone,
    saveUser, saveSettings,
    handleLogin, doPunchIn, doPunchOut, doEditPunchIn, doResetDay,
    handleLogout, handleSetLocation,
  } = store;

  const nowMaxTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  // ── Login screen ───────────────────────────────────────────────
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">⏱</div>
            <h1 className="text-2xl font-bold text-white">Timebox</h1>
            <p className="text-zinc-400 text-sm mt-1">Track your office hours</p>
          </div>
          <form
            onSubmit={handleLogin}
            className="bg-zinc-900 rounded-2xl p-6 space-y-4 border border-zinc-800"
          >
            <div>
              <label className="text-xs font-medium text-zinc-400 block mb-1.5 uppercase tracking-wide">
                Your Name
              </label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Enter your name"
                className="w-full bg-zinc-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-zinc-600 text-sm"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400 block mb-1.5 uppercase tracking-wide">
                Work Hours per Day
              </label>
              <input
                type="number"
                value={workHoursInput}
                onChange={(e) => setWorkHoursInput(e.target.value)}
                min="1"
                max="24"
                step="0.5"
                className="w-full bg-zinc-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg py-3 transition-colors text-sm"
            >
              Get Started
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Main app ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <SettingsSheet
        open={showSettings}
        onClose={() => setShowSettings(false)}
        user={user}
        saveUser={saveUser}
        settings={settings}
        saveSettings={saveSettings}
        notifPermission={notifPermission}
        setNotifPermission={setNotifPermission}
        handleSetLocation={handleSetLocation}
        gettingLocation={gettingLocation}
        locationError={locationError}
        currentDistance={currentDistance}
        insideZone={insideZone}
        handleLogout={handleLogout}
      />

      {/* Header */}
      <header className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between max-w-2xl mx-auto">
        <div>
          <h1 className="font-bold text-base">⏱ Timebox</h1>
          <p className="text-zinc-500 text-xs mt-0.5">{fmtDate(today)}</p>
        </div>
        <div className="flex items-center gap-2">
          {settings.geofenceEnabled && settings.geofenceLat !== null && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${insideZone ? "bg-green-500/20 text-green-400" : "bg-zinc-800 text-zinc-500"}`}>
              {insideZone ? "📍 In Zone" : "📍"}
            </span>
          )}
          <span className="text-sm text-zinc-300 font-medium">{user.name}</span>
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
        {/* Status card */}
        <div className="bg-zinc-900 rounded-2xl p-4 sm:p-6 border border-zinc-800">
          {/* Big display */}
          <div className="text-center mb-6">
            <div className={`text-4xl sm:text-5xl font-mono font-bold tracking-tight tabular-nums ${isCompleted ? "text-green-400" : isPunchedIn && remaining === 0 ? "text-green-400" : isPunchedIn ? "text-white" : "text-zinc-500"}`}>
              {isCompleted
                ? fmtDuration(elapsed)
                : isPunchedIn
                  ? (() => {
                      const h = Math.floor(remaining / 3600000);
                      const m = Math.floor((remaining % 3600000) / 60000);
                      const s = Math.floor((remaining % 60000) / 1000);
                      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
                    })()
                  : now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true })}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              {isCompleted ? "worked today — well done!" : isPunchedIn ? "remaining" : now.toLocaleDateString([], { weekday: "short", hour: "numeric", minute: "2-digit", hour12: true })}
            </div>
            <div className={`text-xs font-medium mt-2 px-3 py-1 rounded-full inline-block ${isCompleted ? "bg-green-500/20 text-green-400" : isPunchedIn ? "bg-blue-500/20 text-blue-400" : "bg-zinc-800 text-zinc-400"}`}>
              {isCompleted ? "Punched Out" : isPunchedIn ? "Currently Working" : "Not Punched In"}
            </div>
          </div>

          {/* Cat */}
          <div className="flex justify-center mb-4">
            <CatLottie isPunchedIn={isPunchedIn} pct={pct} isCompleted={isCompleted} />
          </div>

          {/* Progress */}
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
                  {expectedEnd && (
                    <>
                      <div className="font-semibold text-white">{fmtTime(expectedEnd)}</div>
                      <div className="text-zinc-500 mt-0.5">Expected End</div>
                    </>
                  )}
                </div>
              </div>
              <AnimatedProgressBar
                pct={pct}
                isPunchedIn={isPunchedIn}
                isCompleted={isCompleted}
                punchInIso={todayRecord.punchIn}
                workHours={user.workHours}
              />
              <div className="flex justify-between text-xs mt-4">
                <span className="text-zinc-600">{Math.round(pct)}% complete</span>
                {!isCompleted && remaining > 0 && (
                  <span className="text-zinc-400">{fmtDuration(remaining)} remaining</span>
                )}
                {todayRecord.punchOut && (
                  <span className="text-zinc-400">Out: {fmtTime(todayRecord.punchOut)}</span>
                )}
              </div>
            </div>
          )}

          {/* Not punched in */}
          {!todayRecord && !customMode && (
            <div className="space-y-2.5">
              <button
                onClick={() => doPunchIn()}
                className="w-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold py-4 rounded-xl text-base transition-all"
              >
                Punch In
              </button>
              <button
                onClick={() => { setCustomMode(true); setCustomTime(currentTimeStr()); }}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-medium py-3 rounded-xl text-sm transition-colors"
              >
                Set Custom Punch-In Time
              </button>
            </div>
          )}

          {/* Custom time entry */}
          {!todayRecord && customMode && (
            <div className="space-y-3">
              <label className="text-xs font-medium text-zinc-400 block uppercase tracking-wide">
                When did you arrive?
              </label>
              <input
                type="time"
                value={customTime}
                max={nowMaxTime}
                onChange={(e) => setCustomTime(e.target.value)}
                className="w-full bg-zinc-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-lg font-mono"
              />
              {customTime > nowMaxTime && (
                <p className="text-xs text-yellow-400">⚠ Future time — will be set to now on confirm.</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => doPunchIn(customTime)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors"
                >
                  Set Punch-In Time
                </button>
                <button
                  onClick={() => setCustomMode(false)}
                  className="px-5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Punched in */}
          {isPunchedIn && !editingPunchIn && (
            <div className="space-y-2.5">
              <button
                onClick={doPunchOut}
                className="w-full bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold py-4 rounded-xl text-base transition-all"
              >
                Punch Out
              </button>
              <button
                onClick={() => {
                  const pi = new Date(todayRecord!.punchIn);
                  setCustomTime(`${String(pi.getHours()).padStart(2, "0")}:${String(pi.getMinutes()).padStart(2, "0")}`);
                  setEditingPunchIn(true);
                }}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-500 text-sm py-2.5 rounded-xl transition-colors"
              >
                Edit punch-in time
              </button>
            </div>
          )}

          {/* Edit punch-in */}
          {editingPunchIn && (
            <div className="space-y-3">
              <label className="text-xs font-medium text-zinc-400 block uppercase tracking-wide">
                Correct your punch-in time
              </label>
              <input
                type="time"
                value={customTime}
                max={nowMaxTime}
                onChange={(e) => setCustomTime(e.target.value)}
                className="w-full bg-zinc-800 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-lg font-mono"
              />
              {customTime > nowMaxTime && (
                <p className="text-xs text-yellow-400">⚠ Future time — will be set to now on confirm.</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => doEditPunchIn(customTime)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors"
                >
                  Update
                </button>
                <button
                  onClick={() => setEditingPunchIn(false)}
                  className="px-5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl transition-colors text-sm"
                >
                  Cancel
                </button>
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
              {elapsed >= user.workHours * 3600000 ? (
                <div className="text-green-400 text-sm font-medium">✓ Full day completed!</div>
              ) : (
                <div className="text-yellow-400 text-sm">
                  {fmtDuration(user.workHours * 3600000 - elapsed)} short of full day
                </div>
              )}
              <button
                onClick={doResetDay}
                className="w-full mt-1 bg-zinc-700 hover:bg-zinc-600 active:scale-95 text-zinc-200 text-sm font-medium py-2.5 rounded-lg transition-all"
              >
                ↺ Reset & Punch In Again
              </button>
            </div>
          )}
        </div>

        <HistoryList records={pastRecords} user={user} />
      </main>
    </div>
  );
}
