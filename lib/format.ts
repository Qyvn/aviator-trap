export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function floorToCent(value: number): number {
  return Math.floor(value * 100 + 1e-9) / 100;
}

/** Whole-rand stake times a 2-decimal multiplier, in rands. */
export function winnings(stake: number, multiplier: number): number {
  const cents = Math.round(multiplier * 100);
  return Math.round(stake * cents) / 100;
}

export function formatRand(value: number): string {
  const negative = value < 0;
  const [whole, frac] = Math.abs(value).toFixed(2).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${negative ? "-" : ""}R${grouped}.${frac}`;
}

export function formatGap(value: number): string {
  return value.toFixed(2).replace(/0$/, "").replace(/\.0$/, "");
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

export function formatCount(value: number): string {
  return Math.round(value).toLocaleString("en-ZA");
}
