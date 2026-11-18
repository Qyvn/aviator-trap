import {
  HOUSE_EDGE,
  STARTING_BALANCE,
  expectedBalance,
  sampleCrash,
} from "@/lib/crash";
import { formatCount, formatRand, roundMoney } from "@/lib/format";

export type StrategyId = "cash-1.5" | "cash-2" | "cash-10" | "martingale-2";

export const SIM_BANKROLL = STARTING_BALANCE;
export const SIM_FLAT_BET = 50;
export const SIM_MARTINGALE_BASE = 10;

export const STRATEGIES: { id: StrategyId; label: string; note: string }[] = [
  {
    id: "cash-1.5",
    label: "Cash out at 1.50x",
    note: "Wins often. Pays little. Same 3% leak.",
  },
  {
    id: "cash-2",
    label: "Cash out at 2.00x",
    note: "The popular rule. Still about 97 cents per rand.",
  },
  {
    id: "cash-10",
    label: "Cash out at 10.00x",
    note: "Rare wins, long stretches of nothing. Same leak, rougher ride.",
  },
  {
    id: "martingale-2",
    label: "Martingale, cash at 2.00x",
    note: "Double the stake after every loss. Small recoveries, then a hole.",
  },
];

export interface SimPoint {
  round: number;
  balance: number;
  expected: number;
}

export interface SimResult {
  strategy: StrategyId;
  startingBalance: number;
  baseBet: number;
  points: SimPoint[];
  finalBalance: number;
  roundsPlayed: number;
  ruinedAt: number | null;
  totalWagered: number;
  peak: number;
  maxStakeAsked: number;
  longestLossStreak: number;
  theoreticalLoss: number;
}

export interface CompareRow {
  strategy: StrategyId;
  finalBalance: number;
  ruinedAt: number | null;
  totalWagered: number;
  theoreticalLoss: number;
}

export function targetFor(strategy: StrategyId): number {
  if (strategy === "cash-1.5") return 1.5;
  if (strategy === "cash-10") return 10;
  return 2;
}

export function defaultBaseBet(strategy: StrategyId): number {
  return strategy === "martingale-2" ? SIM_MARTINGALE_BASE : SIM_FLAT_BET;
}

export function simulate(options: {
  rounds: number;
  strategy: StrategyId;
  startingBalance?: number;
  baseBet?: number;
  crashes?: number[];
  rng?: () => number;
}): SimResult {
  const strategy = options.strategy;
  const rounds = options.rounds;
  const startingBalance = options.startingBalance ?? SIM_BANKROLL;
  const baseBet = options.baseBet ?? defaultBaseBet(strategy);
  const rng = options.rng ?? Math.random;
  const crashes =
    options.crashes ?? Array.from({ length: rounds }, () => sampleCrash(rng));
  const target = targetFor(strategy);
  const martingale = strategy === "martingale-2";

  let balance = startingBalance;
  let intended = baseBet;
  let wagered = 0;
  let peak = startingBalance;
  let maxStakeAsked = baseBet;
  let lossStreak = 0;
  let longestLossStreak = 0;
  let ruinedAt: number | null = null;
  let played = 0;
  const stride = Math.max(1, Math.ceil(rounds / 360));
  const points: SimPoint[] = [{ round: 0, balance, expected: startingBalance }];

  for (let round = 1; round <= rounds; round += 1) {
    maxStakeAsked = Math.max(maxStakeAsked, intended);
    if (balance < 0.01) {
      ruinedAt = Math.max(played, 1);
      balance = 0;
      break;
    }
    const crash = crashes[round - 1] ?? sampleCrash(rng);
    const stake = roundMoney(Math.min(intended, balance));
    if (stake < 0.01) {
      ruinedAt = round;
      balance = 0;
      break;
    }
    wagered = roundMoney(wagered + stake);
    balance = roundMoney(balance - stake);
    const won = crash >= target;
    if (won) {
      balance = roundMoney(balance + roundMoney(stake * target));
      lossStreak = 0;
      if (martingale) intended = baseBet;
    } else {
      lossStreak += 1;
      longestLossStreak = Math.max(longestLossStreak, lossStreak);
      if (martingale) {
        intended = roundMoney(intended * 2);
        maxStakeAsked = Math.max(maxStakeAsked, intended);
      }
    }
    peak = Math.max(peak, balance);
    played = round;
    if (balance < 0.01) {
      balance = 0;
      ruinedAt = round;
    }
    if (round % stride === 0 || balance === 0 || round === rounds) {
      points.push({
        round,
        balance,
        expected: roundMoney(expectedBalance(wagered, startingBalance)),
      });
    }
    if (balance === 0) break;
  }

  if (points[points.length - 1]?.round !== played) {
    points.push({
      round: played,
      balance,
      expected: roundMoney(expectedBalance(wagered, startingBalance)),
    });
  }

  return {
    strategy,
    startingBalance,
    baseBet,
    points,
    finalBalance: balance,
    roundsPlayed: played,
    ruinedAt,
    totalWagered: wagered,
    peak,
    maxStakeAsked,
    longestLossStreak,
    theoreticalLoss: roundMoney(HOUSE_EDGE * wagered),
  };
}

export function compareStrategies(rounds: number, rng: () => number = Math.random): CompareRow[] {
  const crashes = Array.from({ length: rounds }, () => sampleCrash(rng));
  return STRATEGIES.map(({ id }) => {
    const result = simulate({
      rounds,
      strategy: id,
      crashes,
      startingBalance: SIM_BANKROLL,
      baseBet: defaultBaseBet(id),
    });
    return {
      strategy: id,
      finalBalance: result.finalBalance,
      ruinedAt: result.ruinedAt,
      totalWagered: result.totalWagered,
      theoreticalLoss: result.theoreticalLoss,
    };
  });
}

export function describeResult(result: SimResult): string[] {
  const lines = [
    result.ruinedAt
      ? `The balance hit zero on round ${formatCount(result.ruinedAt)}.`
      : `After ${formatCount(result.roundsPlayed)} rounds the balance is ${formatRand(result.finalBalance)}. It has not hit zero yet.`,
    `Money pushed across the table: ${formatRand(result.totalWagered)}. The 3% edge on that is ${formatRand(result.theoreticalLoss)}.`,
  ];
  if (!result.ruinedAt) {
    lines.push(
      "A short run can stay alive. That survival is variance. Ten thousand rounds is the more honest picture.",
    );
  } else if (result.finalBalance === 0 && result.theoreticalLoss < result.startingBalance) {
    lines.push(
      "This path went broke sooner than the average 3% drain. Variance can finish you before the mean does. The dashed line is the average, not a floor.",
    );
  }
  if (result.strategy === "martingale-2") {
    lines.push(
      `Biggest stake the system asked for: ${formatRand(result.maxStakeAsked)}. Longest losing streak: ${result.longestLossStreak}. Doubling after losses does not cancel the edge. It saves the loss up and takes it in one hole.`,
    );
  } else {
    lines.push(
      "A fixed cash-out does not create an edge. It only chooses the shape of the ride. Every rule here expects about 97 cents back per rand.",
    );
  }
  return lines;
}

export function strategyLabel(id: StrategyId): string {
  return STRATEGIES.find((item) => item.id === id)?.label ?? id;
}
