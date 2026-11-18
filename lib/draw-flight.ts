export interface DrawFlightOptions {
  crashPoint: number | null;
  showCrashLine: boolean;
  crashed: boolean;
  fall: number;
  time: number;
  fontFamily: string;
}

export function yForMultiplier(multiplier: number, height: number): number {
  const capped = Math.min(Math.max(multiplier, 1), 20);
  const t = Math.log(capped) / Math.log(20);
  return height * 0.74 - t * height * 0.58;
}

export function progressForMultiplier(multiplier: number): number {
  return Math.min(1, Math.log(Math.max(multiplier, 1)) / Math.log(20));
}

export function drawFlight(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  multiplier: number,
  options: DrawFlightOptions,
): void {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#1a1640");
  sky.addColorStop(0.48, "#3c3478");
  sky.addColorStop(0.78, "#e07a4c");
  sky.addColorStop(1, "#f3c98a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  const sunX = width * 0.8;
  const sunY = height * 0.7;
  const glow = ctx.createRadialGradient(sunX, sunY, 6, sunX, sunY, width * 0.34);
  glow.addColorStop(0, "rgba(255, 228, 176, 0.95)");
  glow.addColorStop(1, "rgba(255, 228, 176, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
  ctx.beginPath();
  ctx.fillStyle = "#ffe7c2";
  ctx.arc(sunX, sunY, Math.max(16, width * 0.042), 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(247, 241, 228, 0.16)";
  for (let i = 0; i < 4; i += 1) {
    const drift = ((options.time / 9000 + i * 0.23) % 1) * (width + 180) - 90;
    const cy = height * (0.16 + (i % 3) * 0.1);
    ctx.beginPath();
    ctx.ellipse(drift, cy, 54 + i * 10, 16, 0, 0, Math.PI * 2);
    ctx.ellipse(drift + 36, cy + 4, 34, 14, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#6d3a4a";
  ctx.beginPath();
  ctx.moveTo(0, height);
  ctx.quadraticCurveTo(width * 0.25, height * 0.86, width * 0.5, height * 0.94);
  ctx.quadraticCurveTo(width * 0.78, height * 1.02, width, height * 0.88);
  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.fill();

  ctx.save();
  ctx.strokeStyle = "rgba(247, 241, 228, 0.22)";
  ctx.fillStyle = "rgba(247, 241, 228, 0.78)";
  ctx.lineWidth = 1;
  ctx.font = `12px ${options.fontFamily}`;
  for (const mark of [1, 2, 5, 10]) {
    const y = yForMultiplier(mark, height);
    ctx.beginPath();
    ctx.moveTo(38, y);
    ctx.lineTo(width - 14, y);
    ctx.stroke();
    ctx.fillText(`${mark}x`, 8, y + 4);
  }
  ctx.restore();

  if (options.showCrashLine && options.crashPoint && options.crashPoint > 1) {
    const y = yForMultiplier(options.crashPoint, height);
    ctx.save();
    ctx.strokeStyle = "#d6f25c";
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(38, y);
    ctx.lineTo(width - 12, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#1c1730";
    ctx.font = `600 12px ${options.fontFamily}`;
    const label = `chosen ${options.crashPoint.toFixed(2)}x`;
    const labelWidth = ctx.measureText(label).width + 12;
    const labelX = width - 16 - labelWidth;
    ctx.fillStyle = "#d6f25c";
    roundRect(ctx, labelX, y - 18, labelWidth, 16, 6);
    ctx.fill();
    ctx.fillStyle = "#1c1730";
    ctx.fillText(label, labelX + 6, y - 6);
    ctx.restore();
  }

  const end = Math.max(1, multiplier);
  ctx.beginPath();
  ctx.strokeStyle = "rgba(247, 241, 228, 0.9)";
  ctx.lineWidth = 2.5;
  ctx.lineJoin = "round";
  const steps = 28;
  for (let i = 0; i <= steps; i += 1) {
    const step = 1 + ((end - 1) * i) / steps;
    const point = planePoint(step, width, height);
    if (i === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  }
  ctx.stroke();

  const plane = planePoint(end, width, height);
  const ahead = planePoint(end * 1.04 + 0.02, width, height);
  const rotation = Math.atan2(ahead.y - plane.y, ahead.x - plane.x);
  const fallenY = plane.y + options.fall * height * 0.22;
  const fallenRot = rotation + options.fall * 1.35;
  drawPlane(ctx, plane.x, fallenY, options.crashed ? fallenRot : rotation);

  if (options.crashed && options.fall < 1) {
    ctx.fillStyle = `rgba(200, 67, 47, ${0.28 * (1 - options.fall)})`;
    ctx.fillRect(0, 0, width, height);
  }
}

function planePoint(multiplier: number, width: number, height: number): { x: number; y: number } {
  const t = progressForMultiplier(multiplier);
  return {
    x: 46 + t * (width - 92),
    y: yForMultiplier(multiplier, height),
  };
}

function drawPlane(ctx: CanvasRenderingContext2D, x: number, y: number, rotation: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = "#1c1730";
  ctx.beginPath();
  ctx.moveTo(22, 0);
  ctx.lineTo(-16, -11);
  ctx.lineTo(-7, 0);
  ctx.closePath();
  ctx.fillStyle = "#f7f1e4";
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(22, 0);
  ctx.lineTo(-16, 9);
  ctx.lineTo(-7, 0);
  ctx.closePath();
  ctx.fillStyle = "#e7d3ae";
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-7, 0);
  ctx.lineTo(-16, 14);
  ctx.lineTo(-2, 2);
  ctx.closePath();
  ctx.fillStyle = "#fff8ee";
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
