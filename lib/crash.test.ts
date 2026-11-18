import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  crashFromUnit,
  expectedValue,
  mulberry32,
  sampleCrash,
  sampleRiggedCrash,
} from "./crash";
import { winnings } from "./format";
import { createInitialState, giveBackLine, isChaseBet, reducer } from "./game";
import { describeResult, simulate } from "./simulate";

describe("crash formula", () => {
  it("instant-crashes when 0.97/(1-U) is below 1", () => {
    assert.equal(crashFromUnit(0), 1);
    assert.equal(crashFromUnit(0.029), 1);
    assert.equal(crashFromUnit(0.5), 1.94);
    assert.equal(crashFromUnit(0.515), 2);
  });

  it("keeps about a 3% edge and a 3% instant-crash rate", () => {
    const rng = mulberry32(11);
    const samples = 80_000;
    let instant = 0;
    let profit = 0;
    const stake = 10;
    for (let i = 0; i < samples; i += 1) {
      const crash = sampleCrash(rng);
      if (crash === 1) instant += 1;
      profit += crash >= 2 ? winnings(stake, 2) - stake : -stake;
    }
    const roi = profit / (samples * stake);
    assert.ok(Math.abs(instant / samples - 0.03) < 0.006, `instant rate ${instant / samples}`);
    assert.ok(Math.abs(roi + 0.03) < 0.012, `roi ${roi}`);
    assert.equal(expectedValue(100), -3);
  });

  it("makes early rigged flights much kinder than the formula", () => {
    const rng = mulberry32(7);
    let wins = 0;
    const samples = 8_000;
    for (let i = 0; i < samples; i += 1) {
      if (sampleRiggedCrash(rng) >= 2) wins += 1;
    }
    assert.ok(wins / samples > 0.75, `rigged win rate ${wins / samples}`);
  });
});

describe("session rules", () => {
  it("flags a raised stake after a loss, then a near miss", () => {
    let state = reducer(createInitialState(), { type: "set-bet", bet: 10 });
    state = reducer(state, { type: "start", crashPoint: 1.4, rigged: false });
    state = reducer(state, { type: "crash" });
    assert.equal(state.balance, 490);
    assert.equal(state.nearMiss?.kind, "just-short");

    state = reducer(state, { type: "set-bet", bet: 20 });
    assert.equal(isChaseBet(state), true);
    state = reducer(state, { type: "set-auto", auto: 2 });
    state = reducer(state, { type: "start", crashPoint: 2.2, rigged: false });
    assert.equal(state.chasing, true);
    assert.equal(state.chaseCount, 1);
    state = reducer(state, { type: "crash" });
    assert.equal(state.nearMiss?.headline, "It crashed 0.2x after you would have cashed out.");
    assert.match(state.nearMiss?.detail ?? "", /auto cash-out was 2\.00x/);
  });

  it("pays a cash-out at or below the predetermined crash and ignores a late one", () => {
    let state = reducer(createInitialState(), { type: "set-bet", bet: 25 });
    state = reducer(state, { type: "start", crashPoint: 2, rigged: false });
    const paid = reducer(state, { type: "cash-out", multiplier: 2 });
    assert.equal(paid.balance, 525);
    assert.equal(paid.lastProfit, 25);
    const ignored = reducer(state, { type: "cash-out", multiplier: 2.01 });
    assert.equal(ignored.phase, "flying");
  });

  it("says when a peak was given back", () => {
    let state = reducer(createInitialState(), { type: "set-bet", bet: 100 });
    state = reducer(state, { type: "start", crashPoint: 4, rigged: false });
    state = reducer(state, { type: "cash-out", multiplier: 4 });
    assert.equal(state.balance, 800);
    state = reducer(state, { type: "start", crashPoint: 1, rigged: false });
    state = reducer(state, { type: "crash" });
    assert.equal(giveBackLine(state), "You were up R300 and gave it back.");
  });

  it("ends a busted session on the lesson screen", () => {
    let state = reducer(createInitialState(), { type: "set-bet", bet: 500 });
    state = reducer(state, { type: "start", crashPoint: 1, rigged: false });
    state = reducer(state, { type: "crash" });
    assert.equal(state.busted, true);
    assert.equal(state.showEnd, true);
    assert.equal(state.balance, 0);
  });
});

describe("auto simulate", () => {
  it("walks a fixed 2x rule toward the house edge without a human", () => {
    const result = simulate({
      rounds: 40_000,
      strategy: "cash-2",
      startingBalance: 2_000_000,
      baseBet: 10,
      rng: mulberry32(99),
    });
    const roi = (result.finalBalance - result.startingBalance) / result.totalWagered;
    assert.equal(result.ruinedAt, null);
    assert.ok(Math.abs(roi + 0.03) < 0.012, `roi ${roi}`);
    assert.match(describeResult(result).join(" "), /97 cents/);
  });

  it("ruins a small bankroll under martingale", () => {
    const result = simulate({
      rounds: 2_000,
      strategy: "martingale-2",
      startingBalance: 500,
      baseBet: 10,
      rng: mulberry32(3),
    });
    assert.equal(result.finalBalance, 0);
    assert.ok(result.ruinedAt !== null && result.ruinedAt < 2_000);
    assert.ok(result.maxStakeAsked > 500);
  });
});
