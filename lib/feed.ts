import { mulberry32, sampleCrash } from "@/lib/crash";
import { roundMoney, winnings } from "@/lib/format";

export interface FeedItem {
  id: string;
  callsign: string;
  multiplier: number;
  stake: number;
  profit: number;
}

const STEMS = [
  "Kite",
  "Gull",
  "Dust",
  "Moth",
  "Reed",
  "Veld",
  "Coot",
  "Lark",
  "Puff",
  "Soot",
  "Quill",
  "Haze",
  "Bram",
  "Skip",
  "Nene",
];
const STAKES = [20, 50, 100, 200, 250, 500];

function callsign(rng: () => number): string {
  const stem = STEMS[Math.floor(rng() * STEMS.length)] ?? "Kite";
  const tag = String(10 + Math.floor(rng() * 89));
  return `${stem}-${tag}`;
}

/** A win kept only because it looks big. Draws under 5x are thrown away. */
export function sampleShownWin(rng: () => number): { multiplier: number; stake: number } {
  let multiplier = 8;
  for (let i = 0; i < 40; i += 1) {
    const crash = sampleCrash(rng);
    if (crash >= 5) {
      multiplier = crash;
      break;
    }
  }
  const stake = STAKES[Math.floor(rng() * STAKES.length)] ?? 50;
  return { multiplier, stake };
}

export function makeFeedItem(rng: () => number, n: number): FeedItem {
  const shown = sampleShownWin(rng);
  const gross = winnings(shown.stake, shown.multiplier);
  return {
    id: `feed-${n}-${shown.multiplier.toFixed(2)}`,
    callsign: callsign(rng),
    multiplier: shown.multiplier,
    stake: shown.stake,
    profit: roundMoney(gross - shown.stake),
  };
}

export function createInitialFeed(seed = 481516): FeedItem[] {
  const rng = mulberry32(seed);
  return Array.from({ length: 5 }, (_, index) => makeFeedItem(rng, index));
}
