"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { sound, type SoundSnapshot } from "@/lib/sound";

export function MuteToggle() {
  const [snapshot, setSnapshot] = useState<SoundSnapshot>({
    muted: false,
    unlocked: false,
    humming: false,
  });

  useEffect(() => {
    const unsubscribe = sound.subscribe(setSnapshot);
    sound.setMuted(sound.readStoredMute());
    return unsubscribe;
  }, []);

  const muted = snapshot.muted;

  return (
    <Button
      type="button"
      size="touch"
      variant="outline"
      data-testid="mute-toggle"
      data-muted={muted ? "true" : "false"}
      data-unlocked={snapshot.unlocked ? "true" : "false"}
      data-humming={snapshot.humming ? "true" : "false"}
      aria-pressed={muted}
      aria-label={muted ? "Unmute sound" : "Mute sound"}
      onClick={() => {
        sound.unlock();
        sound.setMuted(!muted);
      }}
    >
      {muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
      {muted ? "Muted" : "Sound"}
    </Button>
  );
}
