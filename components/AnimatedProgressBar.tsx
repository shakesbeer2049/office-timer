import { fmtTime } from "./utils";

export default function AnimatedProgressBar({
  pct,
  isPunchedIn,
  isCompleted,
  punchInIso,
  workHours,
}: {
  pct: number;
  isPunchedIn: boolean;
  isCompleted: boolean;
  punchInIso: string;
  workHours: number;
}) {
  const barColor = isCompleted
    ? "from-green-600 to-green-400"
    : pct >= 80
      ? "from-yellow-600 to-yellow-400"
      : "from-blue-700 to-blue-400";

  const getCheckpointTime = (cpPct: number) => {
    const start = new Date(punchInIso).getTime();
    return fmtTime(
      new Date(start + (cpPct / 100) * workHours * 3600000).toISOString(),
    );
  };

  return (
    <div className="relative">
      <div className="relative">
        <div className="h-3 bg-zinc-800 rounded-full overflow-hidden relative">
          <div
            className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-[width] duration-1000 relative overflow-hidden`}
            style={{ width: `${pct}%` }}
          >
            {isPunchedIn && !isCompleted && (
              <div
                className="animate-shimmer absolute inset-0 opacity-40"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.7) 50%, transparent 100%)",
                  width: "40%",
                }}
              />
            )}
          </div>
        </div>
        <div className="relative mt-1">
          <span className="absolute left-0 text-xs text-zinc-400">
            {getCheckpointTime(0)}
          </span>
          <span
            className="absolute text-xs text-zinc-400"
            style={{ left: "50%", transform: "translateX(-50%)" }}
          >
            {getCheckpointTime(50)}
          </span>
          <span className="absolute right-0 text-xs text-zinc-400">
            {getCheckpointTime(100)}
          </span>
        </div>
        <div className="h-5" />
      </div>
    </div>
  );
}
