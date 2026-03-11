import { useState } from "react";
import { PunchRecord, User } from "./types";
import { fmtDate, fmtTime, fmtDuration } from "./utils";

export default function HistoryList({
  records,
  user,
}: {
  records: PunchRecord[];
  user: User;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-zinc-800/50 transition-colors"
      >
        <span className="font-semibold text-sm">History</span>
        <span className="text-zinc-500 text-xs">
          {open ? "▲ Hide" : `▼ Show (${records.length})`}
        </span>
      </button>
      {open && (
        <div className="divide-y divide-zinc-800">
          {records.length === 0 ? (
            <div className="px-5 py-5 text-zinc-500 text-sm text-center">
              No history yet
            </div>
          ) : (
            records.map((r) => {
              const dur = r.punchOut
                ? new Date(r.punchOut).getTime() - new Date(r.punchIn).getTime()
                : null;
              const dayPct = dur
                ? Math.min(
                    100,
                    (dur / ((r.workHours ?? user.workHours) * 3600000)) * 100,
                  )
                : 0;
              return (
                <div key={r.id} className="px-5 py-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-zinc-200">
                      {fmtDate(r.date)}
                    </span>
                    {r.customEntry && (
                      <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
                        custom
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-zinc-500">
                    <span>
                      In:{" "}
                      <span className="text-zinc-300 font-medium">
                        {fmtTime(r.punchIn)}
                      </span>
                    </span>
                    <span>
                      Out:{" "}
                      <span className="text-zinc-300 font-medium">
                        {r.punchOut ? fmtTime(r.punchOut) : "—"}
                      </span>
                    </span>
                    {dur && (
                      <span>
                        Duration:{" "}
                        <span className="text-zinc-300 font-medium">
                          {fmtDuration(dur)}
                        </span>
                      </span>
                    )}
                  </div>
                  {dur && (
                    <div className="mt-2 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${dayPct >= 100 ? "bg-green-500" : "bg-yellow-500"}`}
                        style={{ width: `${dayPct}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
