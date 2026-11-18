export interface ChartPoint {
  round: number;
  balance: number;
  expected: number;
}

export function BalanceChart({
  points,
  label,
}: {
  points: ChartPoint[];
  label: string;
}) {
  if (points.length < 2) {
    return (
      <p className="text-sm text-[#433e56]">
        The line appears after a round. Ink is the balance. Coral is where the 3% edge says it should be.
      </p>
    );
  }

  const width = 640;
  const height = 220;
  const pad = { left: 52, right: 12, top: 14, bottom: 28 };
  const last = points[points.length - 1];
  const maxRound = Math.max(last?.round ?? 1, 1);
  let minY = 0;
  let maxY = 1;
  for (const point of points) {
    minY = Math.min(minY, point.balance, point.expected);
    maxY = Math.max(maxY, point.balance, point.expected);
  }
  if (maxY - minY < 1) maxY = minY + 1;
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const xOf = (round: number) => pad.left + (round / maxRound) * innerW;
  const yOf = (value: number) => pad.top + ((maxY - value) / (maxY - minY)) * innerH;
  const path = (key: "balance" | "expected") =>
    points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${xOf(point.round).toFixed(1)} ${yOf(point[key]).toFixed(1)}`)
      .join(" ");
  const ticks = [minY, (minY + maxY) / 2, maxY];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label={label}>
      {ticks.map((tick) => (
        <g key={tick}>
          <line
            x1={pad.left}
            x2={width - pad.right}
            y1={yOf(tick)}
            y2={yOf(tick)}
            stroke="#e4dcc8"
            strokeWidth="1"
          />
          <text x={pad.left - 6} y={yOf(tick) + 4} textAnchor="end" fill="#433e56" fontSize="11">
            {compactTick(tick)}
          </text>
        </g>
      ))}
      <path d={path("expected")} fill="none" stroke="#c8432f" strokeWidth="2" strokeDasharray="5 4" />
      <path d={path("balance")} fill="none" stroke="#1c1730" strokeWidth="2.5" />
      <text x={pad.left} y={height - 8} fill="#433e56" fontSize="11">
        Round 0
      </text>
      <text x={width - pad.right} y={height - 8} textAnchor="end" fill="#433e56" fontSize="11">
        {maxRound.toLocaleString("en-ZA")}
      </text>
    </svg>
  );
}

function compactTick(value: number): string {
  const rounded = Math.round(value);
  const abs = Math.abs(rounded);
  const body = abs >= 1000 ? `${Math.round(abs / 100) / 10}k` : String(abs);
  return `${rounded < 0 ? "-" : ""}R${body}`;
}
