"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LESSONS } from "@/lib/lessons";
import { sessionLines, type GameState } from "@/lib/game";

export function EndScreen({
  state,
  onOpenChange,
  onNewSession,
}: {
  state: GameState;
  onOpenChange: (open: boolean) => void;
  onNewSession: () => void;
}) {
  const lines = sessionLines(state);

  return (
    <Dialog open={state.showEnd} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg!">
        <DialogHeader>
          <p className="text-[0.68rem] font-semibold tracking-[0.14em] text-[#433e56] uppercase">Session notes</p>
          <DialogTitle className="font-display text-3xl leading-none text-[#1c1730]">
            What just happened to your mind
          </DialogTitle>
          <DialogDescription className="text-base text-[#1c1730]">
            Fake rands. No account. This is a lesson about crash games, not a place to bet.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-[0.95rem] leading-snug">
          {lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
          <ol className="space-y-3">
            {LESSONS.map((lesson, index) => (
              <li key={lesson.title}>
                <p className="font-semibold">
                  {index + 1}. {lesson.title}
                </p>
                <p>{lesson.body}</p>
              </li>
            ))}
          </ol>
          <div className="rounded-2xl border-2 border-[#1c1730] bg-[#d6f25c] p-4">
            <p className="text-xs font-semibold tracking-wide uppercase">If this felt familiar with real money</p>
            <p className="font-display mt-1 text-2xl leading-tight">South African Responsible Gambling Foundation</p>
            <p className="mt-2">Free, confidential counselling, 24 hours a day.</p>
            <a href="tel:0800006008" className="mt-2 inline-flex min-h-12 items-center text-3xl font-semibold">
              0800 006 008
            </a>
            <p className="mt-1 text-sm">
              <a className="underline" href="https://responsiblegambling.org.za/contact-us-sargf/">
                responsiblegambling.org.za
              </a>
            </p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button type="button" size="touch" variant="bet" onClick={onNewSession}>
            New fake R500
          </Button>
          <Button type="button" size="touch" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
