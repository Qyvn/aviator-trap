import type { RoundRecord } from "@/lib/game";

export function HistoryStrip({
  history,
  fallacy,
  xray,
}: {
  history: RoundRecord[];
  fallacy: string | null;
  xray: boolean;
}) {
  return (
    <section aria-label="Recent crash points">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold">Recent crashes</h2>
        <p className="text-xs text-[#433e56]">Latest on the left</p>
      </div>
      {history.length === 0 ? (
        <p className="mt-2 text-sm text-[#433e56]">
          No flights yet. The strip will fill with crashes, and it will start to look like a pattern.
        </p>
      ) : (
        <ul className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
          {history
            .slice()
            .reverse()
            .map((round) => (
              <li key={round.round}>
                <span
                  className={`inline-flex min-h-11 min-w-14 items-center justify-center rounded-full px-2.5 text-sm font-semibold tabular-nums ${tone(round.crash)}`}
                >
                  {round.crash.toFixed(2)}x
                </span>
              </li>
            ))}
        </ul>
      )}
      {!xray && fallacy && (
        <p className="mt-1 text-sm italic text-[#1c1730]">Tip: {fallacy}</p>
      )}
      {xray && (
        <div className="mt-2 rounded-xl border-2 border-[#1c1730] bg-[#d6f25c] px-3 py-2 text-sm leading-snug">
          <p className="font-semibold">The patterns myth</p>
          {fallacy ? (
            <p className="mt-1">
              <span className="line-through">{fallacy}</span> False. That is the gambler&apos;s fallacy.
            </p>
          ) : (
            <p className="mt-1">No streak to misread right now.</p>
          )}
          <p className="mt-1">
            Each flight draws a new number. The strip is a prop. Past crashes do not make the next one due, hot, or cold.
          </p>
        </div>
      )}
    </section>
  );
}

function tone(crash: number): string {
  if (crash < 2) return "bg-[#c8432f] text-[#fff8ee]";
  if (crash < 10) return "bg-[#1c1730] text-[#fff8ee]";
  return "bg-[#1d6b45] text-[#f3ffe8]";
}
