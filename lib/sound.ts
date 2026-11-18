const STORAGE_KEY = "crash-course-muted";

export interface SoundSnapshot {
  muted: boolean;
  unlocked: boolean;
  humming: boolean;
}

type Listener = (snapshot: SoundSnapshot) => void;

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private humOsc: OscillatorNode | null = null;
  private humOsc2: OscillatorNode | null = null;
  private humGain: GainNode | null = null;
  private humFilter: BiquadFilterNode | null = null;
  private muted = false;
  private unlocked = false;
  private listeners = new Set<Listener>();

  snapshot(): SoundSnapshot {
    return { muted: this.muted, unlocked: this.unlocked, humming: this.humOsc !== null };
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  readStoredMute(): boolean {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  }

  /** Call from the first tap or key press. Mobile browsers ignore audio before that. */
  unlock(): void {
    if (typeof window.AudioContext !== "function") return;
    if (!this.ctx) {
      this.ctx = new window.AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.9;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    this.unlocked = true;
    this.emit();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    try {
      window.localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
    } catch {
      // Private mode can reject storage. The toggle still works for this visit.
    }
    if (this.master) this.master.gain.value = muted ? 0 : 0.9;
    if (muted) this.stopEngine();
    this.emit();
  }

  click(): void {
    const nodes = this.ready();
    if (!nodes) return;
    const { ctx, master } = nodes;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.value = 210;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.07, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  /** Pitch climbs with the multiplier. Safe to call on every frame. */
  setEngine(multiplier: number): void {
    const nodes = this.ready();
    if (!nodes) return;
    if (!this.humOsc || !this.humOsc2 || !this.humFilter) this.startEngine(nodes);
    const freq = Math.min(480, 88 * Math.pow(Math.max(multiplier, 1), 0.58));
    const now = nodes.ctx.currentTime;
    this.humOsc?.frequency.setTargetAtTime(freq, now, 0.06);
    this.humOsc2?.frequency.setTargetAtTime(freq * 0.5, now, 0.06);
    this.humFilter?.frequency.setTargetAtTime(260 + Math.log2(Math.max(multiplier, 1)) * 140, now, 0.08);
  }

  stopEngine(): void {
    if (!this.ctx || !this.humGain || !this.humOsc) {
      this.humOsc = null;
      this.humOsc2 = null;
      this.humGain = null;
      this.humFilter = null;
      return;
    }
    const now = this.ctx.currentTime;
    const gain = this.humGain;
    const osc = this.humOsc;
    const osc2 = this.humOsc2;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
    osc.stop(now + 0.09);
    osc2?.stop(now + 0.09);
    this.humOsc = null;
    this.humOsc2 = null;
    this.humGain = null;
    this.humFilter = null;
    window.setTimeout(() => gain.disconnect(), 160);
    this.emit();
  }

  win(): void {
    const nodes = this.ready();
    if (!nodes) return;
    const { ctx, master } = nodes;
    const now = ctx.currentTime;
    this.noiseBurst(ctx, master, now, 0.12, 3400, 0.16);
    [1318.5, 1568, 2093].forEach((freq, index) => {
      this.tone(ctx, master, freq, now + index * 0.065, 0.26, 0.08);
    });
  }

  crash(): void {
    const nodes = this.ready();
    if (!nodes) return;
    const { ctx, master } = nodes;
    const now = ctx.currentTime;
    const duration = 0.48;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.11));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1600, now);
    filter.frequency.exponentialRampToValueAtTime(140, now + 0.36);
    const gain = ctx.createGain();
    gain.gain.value = 0.32;
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    noise.start(now);

    const thud = ctx.createOscillator();
    thud.type = "sine";
    thud.frequency.setValueAtTime(130, now);
    thud.frequency.exponentialRampToValueAtTime(40, now + 0.34);
    const thudGain = ctx.createGain();
    thudGain.gain.setValueAtTime(0.2, now);
    thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    thud.connect(thudGain);
    thudGain.connect(master);
    thud.start(now);
    thud.stop(now + 0.42);
  }

  nearMiss(): void {
    const nodes = this.ready();
    if (!nodes) return;
    const { ctx, master } = nodes;
    const now = ctx.currentTime + 0.28;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.03, now + 0.07);
    gain.gain.linearRampToValueAtTime(0.0001, now + 0.52);
    gain.connect(master);
    for (const [start, end] of [
      [392, 523],
      [415, 554],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(start, now);
      osc.frequency.linearRampToValueAtTime(end, now + 0.46);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.54);
    }
  }

  private startEngine(nodes: { ctx: AudioContext; master: GainNode }): void {
    const { ctx, master } = nodes;
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc.type = "sawtooth";
    osc2.type = "triangle";
    osc.frequency.value = 88;
    osc2.frequency.value = 44;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 280;
    filter.Q.value = 0.7;
    const gain = ctx.createGain();
    gain.gain.value = 0.04;
    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    osc.start();
    osc2.start();
    this.humOsc = osc;
    this.humOsc2 = osc2;
    this.humFilter = filter;
    this.humGain = gain;
    this.emit();
  }

  private tone(
    ctx: AudioContext,
    master: GainNode,
    freq: number,
    when: number,
    length: number,
    peak: number,
  ): void {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(peak, when + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + length);
    osc.connect(gain);
    gain.connect(master);
    osc.start(when);
    osc.stop(when + length + 0.02);
  }

  private noiseBurst(
    ctx: AudioContext,
    master: GainNode,
    when: number,
    length: number,
    center: number,
    peak: number,
  ): void {
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * length), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.025));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = center;
    filter.Q.value = 0.8;
    const gain = ctx.createGain();
    gain.gain.value = peak;
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    noise.start(when);
  }

  private ready(): { ctx: AudioContext; master: GainNode } | null {
    if (!this.unlocked || this.muted || !this.ctx || !this.master) return null;
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return { ctx: this.ctx, master: this.master };
  }

  private emit(): void {
    const snapshot = this.snapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  }
}

export const sound = new SoundEngine();
