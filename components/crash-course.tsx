"use client";

import { useCallback, useEffect, useReducer, useRef, type ReactNode } from "react";
import React from "react";
import { BetDock } from "@/components/bet-dock";
import { EndScreen } from "@/components/end-screen";
import { FlightStage } from "@/components/flight-stage";
import { HistoryStrip } from "@/components/history-strip";
import { LiveFeed } from "@/components/live-feed";
import { MuteToggle } from "@/components/mute-toggle";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { XrayPanel } from "@/components/xray-panel";
import { cashableMultiplier } from "@/lib/crash";
import { formatRand } from "@/lib/format";
import { sound } from "@/lib/sound";
import {
  createInitialState,
  isChaseBet,
  nextRoundAction,
  reducer,
  type GameState,
} from "@/lib/game";

export function CrashCourse() {
  return (
    <GameBoundary>
      <Game />
    </GameBoundary>
  );
}

function Game() {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const settledRef = useRef(false);
  const readMultiplier = useRef<() => number>(() => 1);
  const multRef = useRef<HTMLParagraphElement>(null);
  const cashLabelRef = useRef<HTMLSpanElement>(null);
  const stateRef = useRef(state);
  const actions = useRef({ betNow: () => {}, cashNow: () => {} });

  useEffect(() => {
    dispatch({ type: "stamp-start", now: Date.now() });
  }, []);

  useEffect(() => {
    const unlock = () => sound.unlock();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const onCrash = useCallback(() => {
    sound.stopEngine();
    sound.crash();
    dispatch({ type: "crash" });
  }, []);

  const onCash = useCallback((multiplier: number) => {
    sound.stopEngine();
    sound.click();
    sound.win();
    dispatch({ type: "cash-out", multiplier });
  }, []);

  function cashNow() {
    sound.unlock();
    const current = stateRef.current;
    if (current.phase !== "flying" || current.crashPoint === null || settledRef.current) return;
    const multiplier = cashableMultiplier(readMultiplier.current(), current.crashPoint);
    if (multiplier === null) return;
    settledRef.current = true;
    sound.stopEngine();
    sound.click();
    sound.win();
    dispatch({ type: "cash-out", multiplier });
  }

  function betNow() {
    sound.unlock();
    sound.click();
    const current = stateRef.current;
    if (current.busted) {
      dispatch({ type: "show-end", open: true });
      return;
    }
    const action = nextRoundAction(current);
    if (!action) return;
    settledRef.current = false;
    dispatch(action);
  }

  useEffect(() => {
    stateRef.current = state;
    actions.current = { betNow, cashNow };
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      event.preventDefault();
      if (stateRef.current.phase === "flying") actions.current.cashNow();
      else actions.current.betNow();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (state.nearMiss) sound.nearMiss();
  }, [state.flightId, state.nearMiss]);

  const chasing = state.chasing || isChaseBet(state);

  return (
    <div className="min-h-dvh bg-[#efe6d4] text-[#1c1730]">
      <p
        role="note"
        className="bg-[#1c1730] px-4 py-2.5 text-center text-sm font-semibold leading-snug text-[#d6f25c]"
      >
        Simulation only. Fake money. Built to show how crash games trick you.
      </p>
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-3">
        <div>
          <p className="text-[0.68rem] font-semibold tracking-[0.16em] uppercase">Crash Course</p>
          <h1 className="font-display text-2xl leading-none">The Aviator Trap</h1>
        </div>
        <div className="text-right">
          <p className="text-[0.68rem] font-semibold tracking-wide text-[#433e56] uppercase">Fake balance</p>
          <p data-testid="balance" className="font-display text-3xl leading-none tabular-nums">
            {formatRand(state.balance)}
          </p>
        </div>
      </header>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 pb-3">
        <label className="flex min-h-12 items-center gap-3 text-sm font-semibold">
          <Switch
            checked={state.xray}
            onCheckedChange={(on) => dispatch({ type: "set-xray", on })}
            aria-label="X-ray mode"
            data-testid="xray-switch"
          />
          X-ray mode
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <MuteToggle />
          <Button type="button" size="touch" variant="outline" onClick={() => dispatch({ type: "show-end", open: true })}>
            What happened
          </Button>
        </div>
      </div>
      {state.xray ? (
        <p className="mx-auto max-w-6xl px-3 pb-3 text-sm leading-snug">
          <span className="mr-2 inline-block rounded bg-[#d6f25c] px-1.5 py-0.5 text-xs font-bold">X-RAY</span>
          The machinery is visible. Turn it off to feel the trap without the labels.
        </p>
      ) : (
        <p className="mx-auto max-w-6xl px-3 pb-3 text-sm leading-snug text-[#433e56]">
          X-ray is off. The winner feed and the crash strip are part of the pitch. Switch X-ray on to see how they work.
        </p>
      )}
      <p className="sr-only" aria-live="polite">
        {announce(state)}
      </p>
      <main className="mx-auto grid max-w-6xl gap-4 px-3 pb-72 lg:grid-cols-[minmax(0,1fr)_22rem] lg:px-5">
        <div className="space-y-3">
          <FlightStage
            phase={state.phase}
            flightId={state.flightId}
            crashPoint={state.crashPoint}
            cashedAt={state.cashedAt}
            autoCashout={state.autoCashout}
            stake={state.lockedBet || state.bet}
            xray={state.xray}
            riggedThisRound={state.riggedThisRound}
            settledRef={settledRef}
            readMultiplierRef={readMultiplier}
            multRef={multRef}
            cashLabelRef={cashLabelRef}
            onCrash={onCrash}
            onCash={onCash}
            onSkyCash={cashNow}
          />
          <HistoryStrip history={state.history} fallacy={state.fallacy} xray={state.xray} />
          {state.xray && chasing && (
            <div role="status" className="rounded-2xl border-2 border-[#c8432f] bg-[#fff8ee] px-3 py-3">
              <p className="font-display text-2xl leading-none">You&apos;re chasing losses.</p>
              <p className="mt-2 text-sm leading-snug">
                You lost, then raised the stake. It feels like a way to get even. It is the same edge, faster.
              </p>
            </div>
          )}
          {state.xray && state.nearMiss && (
            <div role="status" className="rounded-2xl border-2 border-[#1c1730] bg-[#d6f25c] px-3 py-3">
              <p className="font-semibold">{state.nearMiss.headline}</p>
              <p className="mt-1 text-sm leading-snug">{state.nearMiss.detail}</p>
            </div>
          )}
          {state.busted && (
            <div className="rounded-2xl border-2 border-[#1c1730] bg-[#fff8ee] px-3 py-3">
              <p className="font-semibold">The fake bankroll is gone.</p>
              <p className="mt-1 text-sm">
                That is the long run, sped up. Open the notes, or take another R500 and watch it again.
              </p>
              <Button
                type="button"
                size="touch"
                variant="outline"
                className="mt-2"
                onClick={() => dispatch({ type: "new-session", now: Date.now() })}
              >
                New R500 bankroll
              </Button>
            </div>
          )}
        </div>
        <aside className="space-y-3">
          <LiveFeed xray={state.xray} />
          {state.xray ? (
            <XrayPanel
              state={state}
              onRigged={(on) => dispatch({ type: "set-rigged", on })}
              onDismissHook={() => dispatch({ type: "dismiss-hook" })}
              onNewSession={() => dispatch({ type: "new-session", now: Date.now() })}
              onOpenEnd={() => dispatch({ type: "show-end", open: true })}
            />
          ) : (
            <p className="rounded-2xl border-2 border-dashed border-[#1c1730] px-3 py-3 text-sm leading-snug">
              Turn on X-ray for the house-edge meter, the near-miss callouts, the loss-chasing detector, and a button
              that plays thousands of rounds until the balance is gone.
            </p>
          )}
          <footer className="pb-4 text-sm leading-snug text-[#433e56]">
            <p>Fake rands only. This page does not take bets and does not link to betting sites.</p>
            <p className="mt-1">
              South African Responsible Gambling Foundation helpline{" "}
              <a className="font-semibold text-[#1c1730] underline" href="tel:0800006008">
                0800 006 008
              </a>
            </p>
          </footer>
        </aside>
      </main>
      <BetDock
        state={state}
        cashLabelRef={cashLabelRef}
        xray={state.xray}
        onBet={betNow}
        onCash={cashNow}
        onSetBet={(bet) => dispatch({ type: "set-bet", bet })}
        onNudge={(direction) => dispatch({ type: "nudge-bet", direction })}
        onAuto={(auto) => dispatch({ type: "set-auto", auto })}
      />
      <EndScreen
        state={state}
        onOpenChange={(open) => dispatch({ type: "show-end", open })}
        onNewSession={() => dispatch({ type: "new-session", now: Date.now() })}
      />
    </div>
  );
}

function announce(state: GameState): string {
  if (state.phase === "flying") {
    return "Flying. The multiplier is climbing. Cash out before it crashes.";
  }
  if (state.phase === "resolved" && state.cashedAt !== null && state.lastProfit !== null) {
    return `Cashed out at ${state.cashedAt.toFixed(2)}x. Net ${formatRand(state.lastProfit)}. Balance ${formatRand(state.balance)}.`;
  }
  if (state.phase === "resolved" && state.crashPoint !== null && state.lastProfit !== null) {
    return `Crashed at ${state.crashPoint.toFixed(2)}x. Result ${formatRand(state.lastProfit)}. Balance ${formatRand(state.balance)}.`;
  }
  return `Ready. Fake balance ${formatRand(state.balance)}. Stake ${formatRand(state.bet)}.`;
}

class GameBoundary extends React.Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };

  static getDerivedStateFromError(): { error: boolean } {
    return { error: true };
  }

  render() {
    if (this.state.error) {
      return (
        <div role="alert" className="mx-auto max-w-lg px-4 py-10">
          <p className="bg-[#1c1730] px-3 py-2 text-sm font-semibold text-[#d6f25c]">
            Simulation only. Fake money. Built to show how crash games trick you.
          </p>
          <h1 className="font-display mt-4 text-3xl">The flight window hit a snag.</h1>
          <p className="mt-2">Refresh the page for a new fake session. Nothing was deposited. There is no account.</p>
          <button
            type="button"
            className="mt-4 min-h-12 rounded-2xl bg-[#1c1730] px-4 font-semibold text-[#fff8ee]"
            onClick={() => window.location.reload()}
          >
            Refresh
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
