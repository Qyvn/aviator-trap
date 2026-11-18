import { floorToCent } from "@/lib/format";

/** About 3% of every rand staked stays with the house. */
export const HOUSE_EDGE = 0.03;
export const PAYBACK = 1 - HOUSE_EDGE;
export const STARTING_BALANCE = 500;
export const MIN_BET = 5;
export const RIGGED_ROUNDS = 8;
export const MULTIPLIER_CAP = 1_000_000;

/**
 * Seconds-scale for the cartoon. 2x lands in about five seconds.
 * The picture is cosmetic: the crash point is chosen before this clock starts.
 */
export const GROWTH_PER_SECOND = 0.14;

export function sampleCrash(rng: () => number = Math.random): number {
  const u = rng();
  return crashFromUnit(u);
}

/**
 * crash = 0.97 / (1 - U), U uniform on [0, 1).
 * When that value is below 1, the flight is an instant crash at 1.00x.
 * Otherwise the shown crash is floored to the nearest 0.01x.
 * A cash-out at any fixed m >= 1.01 returns about 97 cents per rand.
 */
export function crashFromUnit(u: number): number {
  const unit = Math.min(Math.max(u, 0), 0.999999999999);
  const raw = PAYBACK / (1 - unit);
  if (!Number.isFinite(raw)) return MULTIPLIER_CAP;
  // U < 0.03 makes the raw value fall below 1. Those are the instant crashes.
  if (raw < 1) return 1;
  const floored = floorToCent(raw);
  // A raw value between 1.00 and 1.01 would floor to 1.00 and look instant. Keep it playable.
  if (floored <= 1) return 1.01;
  if (floored > MULTIPLIER_CAP) return MULTIPLIER_CAP;
  return floored;
}

/**
 * Easier crashes for the first flights of rigged onboarding.
 * Modest targets win much more often than the real formula allows.
 */
export function sampleRiggedCrash(rng: () => number = Math.random): number {
  const roll = rng();
  let raw: number;
  if (roll < 0.06) raw = 1.05 + rng() * 0.4;
  else if (roll < 0.62) raw = 1.7 + rng() * 1.6;
  else if (roll < 0.9) raw = 3.2 + rng() * 4;
  else raw = 8 + rng() * 18;
  return floorToCent(raw);
}

export function multiplierAt(elapsedMs: number, growth = GROWTH_PER_SECOND): number {
  const smooth = Math.exp(growth * (elapsedMs / 1000));
  if (!Number.isFinite(smooth)) return MULTIPLIER_CAP;
  return Math.min(smooth, MULTIPLIER_CAP);
}

/** Multiplier the player is allowed to take by tapping. Must be strictly before the crash. */
export function cashableMultiplier(smooth: number, crashPoint: number): number | null {
  const shown = floorToCent(smooth);
  if (shown < 1.01) return null;
  if (shown >= crashPoint) return null;
  return shown;
}

export function expectedValue(stake: number): number {
  return -HOUSE_EDGE * stake;
}

export function expectedBalance(totalWagered: number, starting = STARTING_BALANCE): number {
  return starting - HOUSE_EDGE * totalWagered;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
