"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { expectedValue } from "@/lib/crash";
import { formatRand } from "@/lib/format";
import { canBet, type GameState } from "@/lib/game";

const PRESETS = [10, 25, 50, 100, 250];
const AUTOS: { label: string; value: number | null }[] = [
  { label: "Off", value: null },
  { label: "1.50x", value: 1.5 },
  { label: "2x", value: 2 },
  { label: "3x", value: 3 },
  { label: "5x", value: 5 },
];

export function BetDock({
  state,
  cashLabelRef,
  xray,
  onBet,
  onCash,
  onSetBet,
  onNudge,
  onAuto,
}: {
  state: GameState;
  cashLabelRef: React.RefObject<HTMLSpanElement | null>;
  xray: boolean;
  onBet: () => void;
  onCash: () => void;
  onSetBet: (bet: number) => void;
  onNudge: (direction: "up" | "down" | "half" | "double") => void;
  onAuto: (auto: number | null) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const flying = state.phase === "flying";
  const locked = flying;
  const shownStake = draft ?? String(state.bet);
  const primaryLabel = state.busted ? "See what happened" : `BET ${formatRand(state.bet)}`;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-[#1c1730] bg-[#efe6d4]/95 backdrop-blur">
      <div className="mx-auto flex max-w-xl flex-col gap-2 px-3 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))]">
        {xray && !flying && (
          <p className="text-center text-xs font-semibold">
            Expected value of this bet: {formatRand(expectedValue(state.bet))}. The button is ready again on purpose.
          </p>
        )}
        <div className="flex gap-1.5 overflow-x-auto">
          {PRESETS.map((preset) => (
            <Button
              key={preset}
              type="button"
              size="touch"
              variant={state.bet === preset && draft === null ? "default" : "outline"}
              className="min-w-14 flex-1"
              disabled={locked || preset > state.balance}
              onClick={() => {
                setDraft(null);
                onSetBet(preset);
              }}
            >
              R{preset}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <Button type="button" size="touch" variant="outline" className="w-12 px-0" aria-label="Decrease stake by 5 rands" disabled={locked} onClick={() => onNudge("down")}>
            −
          </Button>
          <Input
            aria-label="Stake in rands"
            inputMode="numeric"
            disabled={locked}
            value={shownStake}
            onValueChange={(value) => setDraft(value.replace(/[^\d]/g, "").slice(0, 6))}
            onBlur={() => {
              if (draft !== null && draft !== "") onSetBet(Number(draft));
              setDraft(null);
            }}
            className="h-12! text-center text-lg! font-semibold tabular-nums"
          />
          <Button type="button" size="touch" variant="outline" className="w-12 px-0" aria-label="Increase stake by 5 rands" disabled={locked} onClick={() => onNudge("up")}>
            +
          </Button>
          <Button type="button" size="touch" variant="outline" disabled={locked} onClick={() => onNudge("half")}>
            ½
          </Button>
          <Button type="button" size="touch" variant="outline" disabled={locked} onClick={() => onNudge("double")}>
            2×
          </Button>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="shrink-0 text-xs font-semibold uppercase tracking-wide">Auto</span>
          {AUTOS.map((option) => {
            const selected = state.autoCashout === option.value;
            return (
              <Button
                key={option.label}
                type="button"
                size="touch"
                variant={selected ? "default" : "outline"}
                aria-pressed={selected}
                disabled={locked}
                onClick={() => onAuto(option.value)}
              >
                {option.label}
              </Button>
            );
          })}
        </div>
        <Button
          type="button"
          data-testid="bet-button"
          size="bet"
          variant={flying ? "cash" : "bet"}
          disabled={!flying && !state.busted && !canBet(state)}
          onClick={() => {
            if (flying) onCash();
            else onBet();
          }}
        >
          {flying ? <span ref={cashLabelRef}>CASH OUT</span> : primaryLabel}
        </Button>
      </div>
    </div>
  );
}
