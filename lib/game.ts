import {
  HOUSE_EDGE,
  MIN_BET,
  RIGGED_ROUNDS,
  STARTING_BALANCE,
  expectedBalance,
  sampleCrash,
  sampleRiggedCrash,
} from "@/lib/crash";
import { formatGap, formatRand, roundMoney, winnings } from "@/lib/format";

export type Phase = "idle" | "flying" | "resolved";

export interface NearMiss {
  kind: "held-too-long" | "left-too-soon" | "just-short";
  headline: string;
  detail: string;
}

export interface RoundRecord {
  round: number;
  bet: number;
  crash: number;
  cashedAt: number | null;
  profit: number;
  rigged: boolean;
}

export interface TrailPoint {
  round: number;
  balance: number;
  expectedBalance: number;
  crash: number;
}

export interface GameState {
  balance: number;
  peakBalance: number;
  bet: number;
  autoCashout: number | null;
  phase: Phase;
  flightId: number;
  lockedBet: number;
  crashPoint: number | null;
  riggedThisRound: boolean;
  cashedAt: number | null;
  lastProfit: number | null;
  previousBet: number | null;
  chasing: boolean;
  chaseCount: number;
  nearMiss: NearMiss | null;
  nearMissCount: number;
  history: RoundRecord[];
  balanceTrail: TrailPoint[];
  totalWagered: number;
  roundsPlayed: number;
  wins: number;
  losses: number;
  sumCashoutMultipliers: number;
  cashoutCount: number;
  startedAt: number;
  xray: boolean;
  riggedOnboarding: boolean;
  riggedRoundsUsed: number;
  hookJustEnded: boolean;
  showEnd: boolean;
  busted: boolean;
  fallacy: string | null;
}

export type Action =
  | { type: "set-bet"; bet: number }
  | { type: "nudge-bet"; direction: "up" | "down" | "half" | "double" }
  | { type: "set-auto"; auto: number | null }
  | { type: "set-xray"; on: boolean }
  | { type: "set-rigged"; on: boolean }
  | { type: "start"; crashPoint: number; rigged: boolean }
  | { type: "cash-out"; multiplier: number }
  | { type: "crash" }
  | { type: "dismiss-hook" }
  | { type: "show-end"; open: boolean }
  | { type: "new-session"; now: number }
  | { type: "stamp-start"; now: number };

export function createInitialState(): GameState {
  return {
    balance: STARTING_BALANCE,
    peakBalance: STARTING_BALANCE,
    bet: 25,
    autoCashout: null,
    phase: "idle",
    flightId: 0,
    lockedBet: 0,
    crashPoint: null,
    riggedThisRound: false,
    cashedAt: null,
    lastProfit: null,
    previousBet: null,
    chasing: false,
    chaseCount: 0,
    nearMiss: null,
    nearMissCount: 0,
    history: [],
    balanceTrail: [
      {
        round: 0,
        balance: STARTING_BALANCE,
        expectedBalance: STARTING_BALANCE,
        crash: 0,
      },
    ],
    totalWagered: 0,
    roundsPlayed: 0,
    wins: 0,
    losses: 0,
    sumCashoutMultipliers: 0,
    cashoutCount: 0,
    startedAt: 0,
    xray: true,
    riggedOnboarding: false,
    riggedRoundsUsed: 0,
    hookJustEnded: false,
    showEnd: false,
    busted: false,
    fallacy: null,
  };
}

export function clampBet(bet: number, balance: number): number {
  const affordable = Math.floor(balance);
  if (affordable < MIN_BET) return MIN_BET;
  const rounded = Math.round(Number.isFinite(bet) ? bet : MIN_BET);
  return Math.min(affordable, Math.max(MIN_BET, rounded));
}

export function canBet(state: GameState): boolean {
  return (
    state.phase !== "flying" &&
    state.balance >= MIN_BET &&
    state.bet >= MIN_BET &&
    state.bet <= state.balance + 0.001
  );
}

export function isChaseBet(state: Pick<GameState, "lastProfit" | "previousBet" | "bet">): boolean {
  return (
    state.lastProfit !== null &&
    state.lastProfit < 0 &&
    state.previousBet !== null &&
    state.bet > state.previousBet
  );
}

export function nextRoundAction(
  state: GameState,
  rng: () => number = Math.random,
): Extract<Action, { type: "start" }> | null {
  if (!canBet(state)) return null;
  const rigged = state.riggedOnboarding && state.riggedRoundsUsed < RIGGED_ROUNDS;
  return {
    type: "start",
    rigged,
    crashPoint: rigged ? sampleRiggedCrash(rng) : sampleCrash(rng),
  };
}

export function giveBackLine(state: GameState): string | null {
  if (state.peakBalance <= STARTING_BALANCE + 0.5) return null;
  if (state.balance >= state.peakBalance - 0.5) return null;
  const up = roundMoney(state.peakBalance - STARTING_BALANCE);
  return `You were up ${spokenRand(up)} and gave it back.`;
}

function spokenRand(value: number): string {
  const rounded = roundMoney(value);
  if (Math.abs(rounded - Math.round(rounded)) < 0.001) {
    const whole = Math.abs(Math.round(rounded));
    const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return `${rounded < 0 ? "-" : ""}R${grouped}`;
  }
  return formatRand(rounded);
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "stamp-start":
      if (state.startedAt !== 0) return state;
      return { ...state, startedAt: action.now };
    case "set-xray":
      return { ...state, xray: action.on };
    case "set-rigged":
      return {
        ...state,
        riggedOnboarding: action.on,
        riggedRoundsUsed: action.on ? 0 : state.riggedRoundsUsed,
        hookJustEnded: false,
      };
    case "set-auto":
      if (state.phase === "flying") return state;
      return { ...state, autoCashout: action.auto };
    case "set-bet":
      if (state.phase === "flying") return state;
      return retargetBet(state, action.bet);
    case "nudge-bet": {
      if (state.phase === "flying") return state;
      const next =
        action.direction === "up"
          ? state.bet + 5
          : action.direction === "down"
            ? state.bet - 5
            : action.direction === "half"
              ? Math.floor(state.bet / 2)
              : state.bet * 2;
      return retargetBet(state, next);
    }
    case "show-end":
      return { ...state, showEnd: action.open };
    case "dismiss-hook":
      return { ...state, hookJustEnded: false };
    case "new-session":
      return {
        ...createInitialState(),
        xray: state.xray,
        riggedOnboarding: state.riggedOnboarding,
        startedAt: action.now,
      };
    case "start":
      return startRound(state, action.crashPoint, action.rigged);
    case "cash-out":
      return cashOut(state, action.multiplier);
    case "crash":
      return crashRound(state);
    default:
      return state;
  }
}

function retargetBet(state: GameState, bet: number): GameState {
  const nextBet = clampBet(bet, state.balance);
  const draft = { ...state, bet: nextBet };
  return { ...draft, chasing: state.chasing && isChaseBet(draft) ? true : isChaseBet(draft) };
}

function startRound(state: GameState, crashPoint: number, rigged: boolean): GameState {
  if (!canBet(state)) return state;
  const chasing = isChaseBet(state);
  return {
    ...state,
    balance: roundMoney(state.balance - state.bet),
    phase: "flying",
    flightId: state.flightId + 1,
    lockedBet: state.bet,
    crashPoint,
    riggedThisRound: rigged,
    cashedAt: null,
    chasing,
    chaseCount: state.chaseCount + (chasing ? 1 : 0),
    totalWagered: roundMoney(state.totalWagered + state.bet),
    nearMiss: null,
    hookJustEnded: false,
    riggedRoundsUsed: state.riggedRoundsUsed + (rigged ? 1 : 0),
  };
}

function cashOut(state: GameState, multiplier: number): GameState {
  if (state.phase !== "flying" || state.crashPoint === null) return state;
  const taken = roundMoney(multiplier);
  if (taken < 1.01 || taken > state.crashPoint) return state;
  const payout = winnings(state.lockedBet, taken);
  const profit = roundMoney(payout - state.lockedBet);
  return finish(state, { cashedAt: taken, profit, balance: roundMoney(state.balance + payout) });
}

function crashRound(state: GameState): GameState {
  if (state.phase !== "flying" || state.crashPoint === null) return state;
  return finish(state, {
    cashedAt: null,
    profit: roundMoney(-state.lockedBet),
    balance: state.balance,
  });
}

function finish(
  state: GameState,
  outcome: { cashedAt: number | null; profit: number; balance: number },
): GameState {
  const crashPoint = state.crashPoint ?? 1;
  const balance = roundMoney(outcome.balance);
  const roundsPlayed = state.roundsPlayed + 1;
  const record: RoundRecord = {
    round: roundsPlayed,
    bet: state.lockedBet,
    crash: crashPoint,
    cashedAt: outcome.cashedAt,
    profit: outcome.profit,
    rigged: state.riggedThisRound,
  };
  const history = [...state.history, record].slice(-24);
  const nearMiss = detectNearMiss(state, outcome.cashedAt, crashPoint);
  const won = outcome.profit > 0;
  const busted = balance < MIN_BET;
  const trailPoint: TrailPoint = {
    round: roundsPlayed,
    balance,
    expectedBalance: roundMoney(expectedBalance(state.totalWagered)),
    crash: crashPoint,
  };
  return {
    ...state,
    balance,
    peakBalance: Math.max(state.peakBalance, balance),
    phase: "resolved",
    cashedAt: outcome.cashedAt,
    lastProfit: outcome.profit,
    previousBet: state.lockedBet,
    bet: clampBet(state.bet, balance),
    chasing: outcome.profit < 0 ? state.chasing : false,
    nearMiss,
    nearMissCount: state.nearMissCount + (nearMiss ? 1 : 0),
    history,
    balanceTrail: [...state.balanceTrail, trailPoint].slice(-240),
    roundsPlayed,
    wins: state.wins + (won ? 1 : 0),
    losses: state.losses + (won ? 0 : 1),
    sumCashoutMultipliers: state.sumCashoutMultipliers + (outcome.cashedAt ?? 0),
    cashoutCount: state.cashoutCount + (outcome.cashedAt !== null ? 1 : 0),
    hookJustEnded: state.riggedThisRound && state.riggedRoundsUsed >= RIGGED_ROUNDS,
    busted,
    showEnd: busted ? true : state.showEnd,
    fallacy: fallacyLine(history),
  };
}

function detectNearMiss(
  state: GameState,
  cashedAt: number | null,
  crash: number,
): NearMiss | null {
  const gapLimit = 0.35;
  if (cashedAt !== null) {
    const gap = roundMoney(crash - cashedAt);
    if (gap > 0 && gap <= gapLimit) {
      return {
        kind: "left-too-soon",
        headline: `It crashed ${formatGap(gap)}x after you cashed out.`,
        detail:
          "You got paid, then watched it fly a little further. That sting feels like you left money behind. It is not a signal to hold longer next time. The next crash is a new draw.",
      };
    }
    return null;
  }

  const personal = personalAnchor(state);
  const anchor = personal ?? 2;
  const gap = roundMoney(crash - anchor);
  if (crash > anchor && gap > 0 && gap <= gapLimit) {
    const who = personal
      ? state.autoCashout
        ? `Your auto cash-out was ${anchor.toFixed(2)}x.`
        : `Your last cash-out was ${anchor.toFixed(2)}x.`
      : "2.00x is the number these games train people to wait for.";
    return {
      kind: "held-too-long",
      headline: `It crashed ${formatGap(gap)}x after you would have cashed out.`,
      detail: `${who} The flight died ${formatGap(gap)}x later and the stake was already gone. A near miss is still a loss. The brain files it next to a win.`,
    };
  }

  const targets = [1.5, 2, 3, 5, 10];
  for (const target of targets) {
    const short = roundMoney(target - crash);
    if (short > 0 && short <= 0.25) {
      return {
        kind: "just-short",
        headline: `It crashed ${formatGap(short)}x before ${target.toFixed(2)}x.`,
        detail:
          "Stopping just short of a round number feels personal. The crash point was drawn before the plane moved. It was not aiming at your number.",
      };
    }
  }
  return null;
}

function personalAnchor(state: GameState): number | null {
  if (state.autoCashout) return state.autoCashout;
  for (let i = state.history.length - 1; i >= 0; i -= 1) {
    const cashed = state.history[i]?.cashedAt;
    if (cashed) return cashed;
  }
  return null;
}

export function fallacyLine(history: RoundRecord[]): string | null {
  const last = history.slice(-3).map((round) => round.crash);
  if (last.length < 3) return null;
  if (last.every((crash) => crash < 1.5)) {
    return "Three short flights in a row. A big one is due.";
  }
  if (last.every((crash) => crash >= 3)) {
    return "Hot streak. The next flight should run too.";
  }
  if (last.every((crash) => crash < 2)) {
    return "Nothing has cleared 2x lately. It has to break.";
  }
  return null;
}

export function sessionLines(state: GameState): string[] {
  const lines: string[] = [];
  if (state.roundsPlayed === 0) {
    lines.push("No flights yet. The notes below are the machinery, before it has a chance to feel like a hunch.");
    return lines;
  }
  const net = roundMoney(state.balance - STARTING_BALANCE);
  const expectedLoss = roundMoney(HOUSE_EDGE * state.totalWagered);
  lines.push(
    `You played ${state.roundsPlayed} flight${state.roundsPlayed === 1 ? "" : "s"} and wagered ${spokenRand(state.totalWagered)}.`,
  );
  lines.push(
    `The 3% edge on that stake is about ${spokenRand(expectedLoss)}. Your balance moved ${net >= 0 ? "up" : "down"} by ${spokenRand(Math.abs(net))} from the R500 start. The gap between those two numbers is luck around a drain, not a skill.`,
  );
  const gave = giveBackLine(state);
  if (gave) {
    lines.push(`${gave} Peak ${spokenRand(state.peakBalance)}, now ${spokenRand(state.balance)}.`);
  }
  if (state.chaseCount > 0) {
    lines.push(
      `You raised the stake after a loss ${state.chaseCount} time${state.chaseCount === 1 ? "" : "s"}.`,
    );
  }
  if (state.nearMissCount > 0) {
    lines.push(
      `The session flagged ${state.nearMissCount} near miss${state.nearMissCount === 1 ? "" : "es"}.`,
    );
  }
  if (state.riggedRoundsUsed > 0) {
    lines.push(
      `Rigged onboarding softened ${state.riggedRoundsUsed} flight${state.riggedRoundsUsed === 1 ? "" : "s"}. Those easier crashes were bait.`,
    );
  }
  return lines;
}
