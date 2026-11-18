"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { createInitialFeed, makeFeedItem, type FeedItem } from "@/lib/feed";
import { formatRand } from "@/lib/format";

export function LiveFeed({ xray }: { xray: boolean }) {
  const [items, setItems] = useState<FeedItem[]>(() => createInitialFeed());
  const [hiddenLosses, setHiddenLosses] = useState(86);
  const [watching, setWatching] = useState(168);
  const counter = useRef(20);

  useEffect(() => {
    const id = window.setInterval(() => {
      counter.current += 1;
      const serial = counter.current;
      setItems((current) => {
        const next = makeFeedItem(Math.random, serial);
        next.id = `${next.id}-${serial}`;
        return [next, ...current].slice(0, 7);
      });
      setHiddenLosses((count) => count + 12 + Math.floor(Math.random() * 28));
      setWatching((count) => Math.min(420, Math.max(70, count + Math.round((Math.random() - 0.48) * 16))));
    }, 2400);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section
      aria-label={xray ? "Fabricated winner feed" : "Live cashes"}
      className="rounded-2xl border-2 border-[#1c1730] bg-[#f7f1e4] p-3 shadow-[4px_4px_0_#1c1730]"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-xl leading-none">{xray ? "Fabricated winners" : "Live cashes"}</h2>
        <p className="flex items-center gap-1.5 text-xs font-semibold">
          <span className="inline-block size-2 rounded-full bg-[#1d6b45]" aria-hidden="true" />
          {watching} watching
        </p>
      </div>
      {xray ? (
        <p className="mt-2 text-sm leading-snug">
          <span className="font-semibold">Fake.</span> These pilots are not real. The feed only keeps big wins and
          drops the rest. Wins shown: {items.length} on screen. Losses not shown: {hiddenLosses}. That is survivorship
          bias, dressed up as social proof.
        </p>
      ) : (
        <p className="mt-1 text-xs text-[#433e56]">Other players cashing out right now</p>
      )}
      {xray && (
        <p className="mt-1 text-xs font-semibold text-[#433e56]">
          The watching count is invented too. It jitters so the room feels full.
        </p>
      )}
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="min-w-0 truncate">
              <span className="font-semibold">{item.callsign}</span>{" "}
              <span className="tabular-nums">{item.multiplier.toFixed(2)}x</span>
            </span>
            <span className="flex shrink-0 items-center gap-1.5">
              <span className="font-semibold tabular-nums text-[#1d6b45]">+{formatRand(item.profit)}</span>
              {xray && <Badge className="bg-[#d6f25c] text-[#1c1730]">Fake</Badge>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
