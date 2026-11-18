"use client";

import { useEffect, useRef } from "react";
import { GROWTH_PER_SECOND, cashableMultiplier, multiplierAt } from "@/lib/crash";
import { drawFlight } from "@/lib/draw-flight";
import { floorToCent, formatRand, winnings } from "@/lib/format";
import type { Phase } from "@/lib/game";
import { sound } from "@/lib/sound";

interface FlightStageProps {
  phase: Phase;
  flightId: number;
  crashPoint: number | null;
  cashedAt: number | null;
  autoCashout: number | null;
  stake: number;
  xray: boolean;
  riggedThisRound: boolean;
  settledRef: React.RefObject<boolean>;
  readMultiplierRef: React.RefObject<() => number>;
  multRef: React.RefObject<HTMLParagraphElement | null>;
  cashLabelRef: React.RefObject<HTMLSpanElement | null>;
  onCrash: () => void;
  onCash: (multiplier: number) => void;
  onSkyCash: () => void;
}

export function FlightStage({
  phase,
  flightId,
  crashPoint,
  cashedAt,
  autoCashout,
  stake,
  xray,
  riggedThisRound,
  settledRef,
  readMultiplierRef,
  multRef,
  cashLabelRef,
  onCrash,
  onCash,
  onSkyCash,
}: FlightStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clock = useRef({ flightId: -1, started: 0, instantDue: 0 });
  const smooth = useRef(1);
  const onCrashRef = useRef(onCrash);
  const onCashRef = useRef(onCash);

  useEffect(() => {
    onCrashRef.current = onCrash;
    onCashRef.current = onCash;
  }, [onCrash, onCash]);

  useEffect(() => {
    readMultiplierRef.current = () => smooth.current;
  }, [readMultiplierRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let raf = 0;
    let timer = 0;
    let dead = false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fontFamily = getComputedStyle(canvas).fontFamily || "sans-serif";

    const paint = (multiplier: number, fall: number, crashed: boolean) => {
      const fitted = fitCanvas(canvas);
      if (!fitted) return;
      drawFlight(fitted.ctx, fitted.width, fitted.height, multiplier, {
        crashPoint,
        showCrashLine: xray && phase === "flying",
        crashed,
        fall,
        time: reduced ? 0 : performance.now(),
        fontFamily,
      });
    };

    const writeMultiplier = (multiplier: number) => {
      const shown = Math.max(1, floorToCent(Math.min(multiplier, crashPoint && phase === "flying" ? crashPoint - 0.01 : multiplier)));
      const printed = phase === "flying" ? Math.max(1, shown) : Math.max(1, floorToCent(multiplier));
      if (multRef.current) multRef.current.textContent = `${printed.toFixed(2)}x`;
      if (phase === "flying" && cashLabelRef.current && crashPoint) {
        const cashable = cashableMultiplier(multiplier, crashPoint);
        cashLabelRef.current.textContent = cashable
          ? `CASH OUT ${formatRand(winnings(stake, cashable))}`
          : "CASH OUT";
      }
    };

    if (phase !== "flying") {
      const crashed = phase === "resolved" && cashedAt === null && crashPoint !== null;
      const end = cashedAt ?? (crashed ? (crashPoint ?? 1) : 1);
      smooth.current = end;
      if (!crashed || reduced) {
        paint(end, crashed ? 1 : 0, crashed);
        writeMultiplier(end);
        return () => {
          dead = true;
        };
      }
      const started = performance.now();
      const fallTick = (now: number) => {
        if (dead) return;
        const fall = Math.min(1, (now - started) / 700);
        paint(end, fall, true);
        writeMultiplier(end);
        if (fall < 1) raf = requestAnimationFrame(fallTick);
      };
      raf = requestAnimationFrame(fallTick);
      return () => {
        dead = true;
        cancelAnimationFrame(raf);
      };
    }

    if (clock.current.flightId !== flightId) {
      const delay = reduced ? 200 : 480;
      clock.current = { flightId, started: performance.now(), instantDue: performance.now() + delay };
      settledRef.current = false;
      smooth.current = 1;
    }

    const growth = reduced ? GROWTH_PER_SECOND * 4 : GROWTH_PER_SECOND;
    if ((crashPoint ?? 1) <= 1) {
      paint(1, 0, false);
      writeMultiplier(1);
      const wait = Math.max(0, clock.current.instantDue - performance.now());
      timer = window.setTimeout(() => {
        if (dead || settledRef.current) return;
        settledRef.current = true;
        onCrashRef.current();
      }, wait);
      return () => {
        dead = true;
        window.clearTimeout(timer);
      };
    }

    const tick = (now: number) => {
      if (dead || settledRef.current) return;
      const value = multiplierAt(now - clock.current.started, growth);
      const crash = crashPoint ?? 1;
      if (autoCashout && value >= autoCashout && autoCashout <= crash && autoCashout >= 1.01) {
        settledRef.current = true;
        smooth.current = autoCashout;
        paint(autoCashout, 0, false);
        writeMultiplier(autoCashout);
        onCashRef.current(autoCashout);
        return;
      }
      if (value >= crash) {
        settledRef.current = true;
        smooth.current = crash;
        onCrashRef.current();
        return;
      }
      smooth.current = value;
      sound.setEngine(value);
      paint(value, 0, false);
      writeMultiplier(value);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      sound.stopEngine();
    };
  }, [
    autoCashout,
    cashLabelRef,
    cashedAt,
    crashPoint,
    flightId,
    multRef,
    phase,
    settledRef,
    stake,
    xray,
  ]);

  const resolvedCrash = phase === "resolved" && cashedAt === null && crashPoint !== null;
  const resolvedCash = phase === "resolved" && cashedAt !== null;
  const shown = resolvedCash ? cashedAt : resolvedCrash ? crashPoint : 1;

  return (
    <div>
      <div
        className="relative h-[42dvh] min-h-[230px] max-h-[460px] overflow-hidden rounded-2xl border-2 border-[#1c1730] shadow-[6px_6px_0_#1c1730]"
        onClick={() => {
          if (phase === "flying") onSkyCash();
        }}
      >
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center px-3 pt-[7%]">
          <p
            ref={multRef}
            data-testid="multiplier"
            className="font-display text-6xl leading-none text-[#fff8ee] tabular-nums drop-shadow-[0_3px_0_#1c1730] sm:text-7xl"
          >
            {shown.toFixed(2)}x
          </p>
          {phase === "flying" && xray && crashPoint !== null && (
            <p className="mt-2 max-w-[18rem] rounded-md bg-[#d6f25c] px-2 py-1 text-center text-xs font-semibold text-[#1c1730]">
              X-ray: crash already set at {crashPoint.toFixed(2)}x
              {riggedThisRound ? " — easy hook round, not the real formula" : ""}
            </p>
          )}
          {resolvedCrash && (
            <p className="mt-3 rounded-full bg-[#c8432f] px-4 py-1 text-sm font-bold tracking-wide text-[#fff8ee]">
              CRASHED {crashPoint.toFixed(2)}x
            </p>
          )}
          {resolvedCash && (
            <p className="mt-3 rounded-full bg-[#d6f25c] px-4 py-1 text-sm font-bold text-[#1c1730]">
              CASHED {cashedAt.toFixed(2)}x
            </p>
          )}
          {phase === "flying" && (
            <p className="mt-auto mb-3 rounded-full bg-[#1c1730]/55 px-3 py-1 text-xs font-semibold text-[#fff8ee]">
              Tap the sky to cash out
            </p>
          )}
        </div>
      </div>
      <p className="mt-2 text-sm leading-snug text-[#433e56]">
        {xray
          ? "Fig. 1. The plane does not fly. A number was drawn when you bet, and this chart climbs until it gets there."
          : "Fig. 1. The flight window."}
      </p>
    </div>
  );
}

function fitCanvas(canvas: HTMLCanvasElement): { ctx: CanvasRenderingContext2D; width: number; height: number } | null {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const pixelW = Math.floor(width * dpr);
  const pixelH = Math.floor(height * dpr);
  if (canvas.width !== pixelW || canvas.height !== pixelH) {
    canvas.width = pixelW;
    canvas.height = pixelH;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width, height };
}
