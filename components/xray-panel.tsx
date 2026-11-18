"use client";

import { useEffect, useState } from "react";
import { BalanceChart } from "@/components/balance-chart";
import { SimulatorPanel } from "@/components/simulator-panel";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { HOUSE_EDGE, RIGGED_ROUNDS, STARTING_BALANCE, expectedBalance, expectedValue } from "@/lib/crash";
import { formatDuration, formatRand, roundMoney } from "@/lib/format";
import { giveBackLine, isChaseBet, type GameState } from "@/lib/game";

export function XrayPanel({
  state,
  onRigged,
  onDismissHook,
  onNewSession,
  onOpenEnd,
}: {
  state: GameState;
  onRigged: (on: boolean) => void;
  onDismissHook: () => void;
  onNewSession: () => void;
  onOpenEnd: () => void;
}) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);
  const expected = roundMoney(expectedBalance(state.totalWagered));
  const gap = roundMoney(state.balance - expected);
  const chasingNow = state.chasing || isChaseBet(state);
  const elapsed = state.startedAt > 0 && now > 0 ? now - state.startedAt : 0;
  const net = roundMoney(state.balance - STARTING_BALANCE);
  const averageCashout =
    state.cashoutCount > 0 ? state.sumCashoutMultipliers / state.cashoutCount : null;
  const giveBack = giveBackLine(state);

  return (
    <div className="space-y-3">
      <Lesson eyebrow="1 · House edge" title="Where the money goes">
        <p className="font-mono text-sm">crash = 0.97 / (1 − U)</p>
        <div
          className="flex h-4 overflow-hidden rounded-full border border-[#1c1730]"
          role="img"
          aria-label="About 97 cents of each rand comes back. About 3 cents stays with the house."
        >
          <div className="h-full bg-[#1c1730]" style={{ width: "97%" }} />
          <div className="h-full bg-[#c8432f]" style={{ width: "3%" }} />
        </div>
        <p>97 cents comes back, on average. The coral sliver stays. That is a {Math.round(HOUSE_EDGE * 100)}% edge, on every rule.</p>
        <p>
          This stake&apos;s expected value is {formatRand(expectedValue(state.bet))}. Staked so far:{" "}
          {formatRand(state.totalWagered)}. The balance the formula wants is {formatRand(expected)}. It is{" "}
          {formatRand(state.balance)}.
        </p>
        <p>
          {state.totalWagered === 0
            ? "Nothing has been staked yet. The leak starts when you tap BET."
            : gap === 0
              ? "You are exactly on the drain."
              : gap > 0
                ? `You are ${formatRand(gap)} ahead of the drain. That gap is variance, not a hot streak.`
                : `You are ${formatRand(Math.abs(gap))} behind the drain. Variance can be worse than the average. It does not reverse it.`}
        </p>
        <BalanceChart
          points={state.balanceTrail.map((point) => ({
            round: point.round,
            balance: point.balance,
            expected: point.expectedBalance,
          }))}
          label="Session balance against the expected 3% drain."
        />
      </Lesson>

      <Lesson eyebrow="2 · Illusion of control" title="Timing is not a strategy">
        {state.phase === "flying" && state.crashPoint !== null ? (
          <p>
            This flight&apos;s crash point is already {state.crashPoint.toFixed(2)}x. It was drawn when you tapped BET.
            Cashing out changes whether you get paid. It does not change the draw.
          </p>
        ) : (
          <p>
            While a flight is in the air, X-ray prints the crash point on the sky. The climb is a cartoon catching up.
          </p>
        )}
        <p>
          {state.cashoutCount === 0
            ? "You have not cashed out yet. When you do, the average exit will show up here. It still will not beat 3%."
            : `You cashed out ${state.cashoutCount} time${state.cashoutCount === 1 ? "" : "s"}, at an average of ${averageCashout?.toFixed(2)}x. Wins ${state.wins}, losses ${state.losses}. The return on money staked is still aimed at -3%.`}
        </p>
        <p>1.20x, 2x, and 10x all expect about 97 cents per rand. The simulator below runs the rules with nobody in the chair.</p>
      </Lesson>

      <Lesson eyebrow="3 · Near misses" title="Almost is the product">
        {state.nearMiss ? (
          <>
            <p className="font-semibold">{state.nearMiss.headline}</p>
            <p>{state.nearMiss.detail}</p>
          </>
        ) : (
          <p>No near miss on the last flight. When a crash lands within 0.35x of a cash-out, this card names it.</p>
        )}
        <p>Near misses flagged this session: {state.nearMissCount}.</p>
      </Lesson>

      <Lesson eyebrow="4 · Loss chasing" title={chasingNow ? "You're chasing losses." : "Loss-chasing detector"}>
        {chasingNow ? (
          <p>
            You lost, then raised the stake. The urge is to win it back in one flight. A bigger stake does not change
            the 3% edge. It multiplies it.
          </p>
        ) : (
          <p>
            Quiet for now. Lose a flight, then raise the stake, and this card says: You&apos;re chasing losses.
          </p>
        )}
        <p>Times you launched a bigger bet after a loss: {state.chaseCount}.</p>
      </Lesson>

      <Lesson eyebrow="5 · Fake crowd" title="The feed beside this column">
        <p>
          The live cashes are written by this page. With X-ray off, they look like other people winning. With X-ray on,
          each row is stamped fake, and a counter keeps the losses the feed refuses to show.
        </p>
      </Lesson>

      <Lesson eyebrow="6 · Rigged onboarding" title="Easy wins, then the hook sets">
        <label className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-[#1c1730] px-3">
          <span className="font-semibold">Rigged onboarding</span>
          <Switch checked={state.riggedOnboarding} onCheckedChange={onRigged} aria-label="Rigged onboarding" />
        </label>
        <p>
          The first {RIGGED_ROUNDS} flights pay modest cash-outs more often than crash = 0.97 / (1 − U) allows. Then
          the odds snap back. Early wins are a hook.
        </p>
        <p>
          When a reward comes on some tries and not others — a variable schedule — people keep tapping longer than when
          the result is predictable. Dopamine follows the maybe, not the maths.
        </p>
        <p>
          Hook flights used: {Math.min(state.riggedRoundsUsed, RIGGED_ROUNDS)} / {RIGGED_ROUNDS}.
          {state.riggedOnboarding && state.riggedRoundsUsed < RIGGED_ROUNDS
            ? ` The next bet is easy flight ${state.riggedRoundsUsed + 1}.`
            : state.riggedOnboarding
              ? " The easy set is finished. New bets use the real formula."
              : " The switch is off, so every flight uses the real formula."}
        </p>
        {state.hookJustEnded && (
          <div className="rounded-xl bg-[#1c1730] px-3 py-2 text-[#d6f25c]">
            <p>The easy part just ended. Same button, real odds. That shift is the trap.</p>
            <Button type="button" size="touch" variant="cash" className="mt-2 w-auto" onClick={onDismissHook}>
              Got it
            </Button>
          </div>
        )}
      </Lesson>

      <Lesson eyebrow="7 · Session" title="Time, stake, and the peak you gave back">
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-[#433e56]">Time played</dt>
            <dd className="font-semibold tabular-nums">{formatDuration(elapsed)}</dd>
          </div>
          <div>
            <dt className="text-[#433e56]">Rounds</dt>
            <dd className="font-semibold tabular-nums">{state.roundsPlayed}</dd>
          </div>
          <div>
            <dt className="text-[#433e56]">Total wagered</dt>
            <dd className="font-semibold tabular-nums">{formatRand(state.totalWagered)}</dd>
          </div>
          <div>
            <dt className="text-[#433e56]">Net</dt>
            <dd className="font-semibold tabular-nums">{formatRand(net)}</dd>
          </div>
          <div>
            <dt className="text-[#433e56]">Peak</dt>
            <dd className="font-semibold tabular-nums">{formatRand(state.peakBalance)}</dd>
          </div>
          <div>
            <dt className="text-[#433e56]">Now</dt>
            <dd className="font-semibold tabular-nums">{formatRand(state.balance)}</dd>
          </div>
        </dl>
        {giveBack ? (
          <p className="font-semibold">{giveBack}</p>
        ) : (
          <p>If the balance climbs and then falls, this line will say you were up, and that you gave it back.</p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" size="touch" variant="outline" onClick={onOpenEnd}>
            What just happened
          </Button>
          <Button type="button" size="touch" variant="outline" onClick={onNewSession}>
            New R500 bankroll
          </Button>
        </div>
      </Lesson>

      <Lesson eyebrow="8 · Auto-simulate" title="A thousand rounds, no hunches">
        <SimulatorPanel />
      </Lesson>
    </div>
  );
}

function Lesson({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border-2 border-[#1c1730] bg-[#f7f1e4] p-3 shadow-[4px_4px_0_#1c1730]">
      <p className="text-[0.68rem] font-semibold tracking-[0.14em] text-[#433e56] uppercase">{eyebrow}</p>
      <h2 className="font-display text-xl leading-tight">{title}</h2>
      <div className="mt-2 space-y-2 text-[0.95rem] leading-snug">{children}</div>
    </section>
  );
}
