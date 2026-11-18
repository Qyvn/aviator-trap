"use client";

import { useState } from "react";
import { BalanceChart } from "@/components/balance-chart";
import { Button } from "@/components/ui/button";
import { formatRand } from "@/lib/format";
import {
  SIM_BANKROLL,
  SIM_FLAT_BET,
  SIM_MARTINGALE_BASE,
  STRATEGIES,
  compareStrategies,
  describeResult,
  simulate,
  strategyLabel,
  type CompareRow,
  type SimResult,
  type StrategyId,
} from "@/lib/simulate";

export function SimulatorPanel() {
  const [strategy, setStrategy] = useState<StrategyId>("cash-2");
  const [result, setResult] = useState<SimResult | null>(null);
  const [compare, setCompare] = useState<CompareRow[] | null>(null);
  const [running, setRunning] = useState<"one" | "all" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run(rounds: number) {
    setRunning("one");
    setError(null);
    window.setTimeout(() => {
      try {
        setResult(simulate({ rounds, strategy }));
        setCompare(null);
      } catch {
        setError("The run failed. Try again.");
      } finally {
        setRunning(null);
      }
    }, 30);
  }

  function runAll() {
    setRunning("all");
    setError(null);
    window.setTimeout(() => {
      try {
        setCompare(compareStrategies(2_000));
      } catch {
        setError("The comparison failed. Try again.");
      } finally {
        setRunning(null);
      }
    }, 30);
  }

  return (
    <div className="space-y-3">
      <p>
        No finger on the button. A robot cashes out on a rule, from a fresh R500, thousands of times. Flat rules stake
        R{SIM_FLAT_BET}. Martingale starts at R{SIM_MARTINGALE_BASE} and doubles after a loss.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {STRATEGIES.map((item) => (
          <Button
            key={item.id}
            type="button"
            size="touch"
            variant={strategy === item.id ? "default" : "outline"}
            aria-pressed={strategy === item.id}
            className="h-auto! min-h-12! whitespace-normal py-2 text-left"
            onClick={() => setStrategy(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>
      <p className="text-sm text-[#433e56]">{STRATEGIES.find((item) => item.id === strategy)?.note}</p>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" size="touch" variant="bet" className="w-full" disabled={running !== null} onClick={() => run(1_000)}>
          {running === "one" ? "Running…" : "Run 1,000"}
        </Button>
        <Button type="button" size="touch" variant="outline" disabled={running !== null} onClick={() => run(10_000)}>
          Run 10,000
        </Button>
      </div>
      <Button type="button" size="touch" variant="outline" className="w-full" disabled={running !== null} onClick={runAll}>
        {running === "all" ? "Comparing…" : "Same 2,000 crashes, all four rules"}
      </Button>
      {error && (
        <p role="alert" className="rounded-xl border-2 border-[#c8432f] px-3 py-2">
          {error}
        </p>
      )}
      {!result && !compare && !error && (
        <p className="text-sm text-[#433e56]">
          Pick a rule and run it. The chart is one life of that rule. Another draw would wiggle. The slope stays down.
        </p>
      )}
      {result && (
        <div className="space-y-2">
          <BalanceChart
            points={result.points}
            label={`${strategyLabel(result.strategy)}. Final balance ${formatRand(result.finalBalance)}. Expected loss ${formatRand(result.theoreticalLoss)}.`}
          />
          <p className="text-xs text-[#433e56]">Ink: balance. Dashed coral: the 3% drain. Bankroll {formatRand(SIM_BANKROLL)}.</p>
          {describeResult(result).map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      )}
      {compare && (
        <ul className="space-y-2">
          {compare.map((row) => (
            <li key={row.strategy} className="rounded-xl border border-[#1c1730] px-3 py-2">
              <p className="font-semibold">{strategyLabel(row.strategy)}</p>
              <p className="text-sm">
                Ended at {formatRand(row.finalBalance)}
                {row.ruinedAt ? ` · broke on round ${row.ruinedAt.toLocaleString("en-ZA")}` : " · still solvent"}
                . Edge on what it wagered: {formatRand(row.theoreticalLoss)}.
              </p>
            </li>
          ))}
          <p>Same crashes, four rules, none of them with an edge. Cash-out timing changed the shape, not the direction.</p>
        </ul>
      )}
    </div>
  );
}
