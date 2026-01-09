import * as Tone from 'tone';
import {
  BPM,
  ENERGY_THRESHOLD_GROOVE,
  ENERGY_THRESHOLD_PEAK
} from '../constants';

// ==========================================
// 1. 核心配置 (Configuration)
// ==========================================
const CHORD_ROOTS = ["C2", "Ab1", "F1", "G1"];
const SCALES = [
  ["C", "Eb", "F", "G", "Bb"],
  ["Ab", "Bb", "C", "Eb", "F"],
  ["F", "Ab", "Bb", "C", "Eb"],
  ["G", "Bb", "C", "D", "F"]
];

class AudioEngine {
  private kick: Tone.MembraneSynth | null = null;
  private bass: Tone.MonoSynth | null = null;
  private hihat: Tone.NoiseSynth | null = null;
  private snare: Tone.NoiseSynth | null = null;
  private lead: Tone.PolySynth | null = null;

  // 效果链
  private leadFilter: Tone.Filter | null = null;
  private sidechainNode: Tone.Volume | null = null;
  private reverb: Tone.Reverb | null = null;
  private delay: Tone.PingPongDelay | null = null;
  private bassDistort: Tone.Distortion | null = null;

  private isInitialized = false;
  private currentEnergy = 0;

  private hihatVolume: Tone.Volume | null = null;
  private snareVolume: Tone.Volume | null = null;

  public async init() {
    if (this.isInitialized) return;
    await Tone.start();

    // Ensure audio context is running
    if (Tone.context.state !== 'running') {
      await Tone.context.resume();
    }

    const masterVol = new Tone.Volume(-2).toDestination();
    const limiter = new Tone.Limiter(-1).connect(masterVol);

    this.reverb = new Tone.Reverb({ decay: 6, wet: 0.5 }).connect(limiter);
    this.delay = new Tone.PingPongDelay("8n.", 0.3).connect(limiter);

    // Lead 链路
    this.sidechainNode = new Tone.Volume(0).connect(this.delay).connect(this.reverb);
    this.leadFilter = new Tone.Filter(100, "lowpass", -24).connect(this.sidechainNode);
    this.lead = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "fatsawtooth", count: 3, spread: 35 },
      envelope: { attack: 0.1, decay: 0.1, sustain: 0.3, release: 1 },
      volume: -6
    }).connect(this.leadFilter);

    // Rhythm Section
    this.kick = new Tone.MembraneSynth({
      pitchDecay: 0.06, octaves: 8,
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 },
      volume: 4
    }).connect(limiter);

    // Bass 链路
    this.bassDistort = new Tone.Distortion(0).connect(limiter);
    this.bass = new Tone.MonoSynth({
      oscillator: { type: "square" },
      envelope: { attack: 0.05, decay: 0.3, sustain: 0.6, release: 0.8 },
      filterEnvelope: { attack: 0.001, decay: 0.5, sustain: 0, baseFrequency: 40, octaves: 4 }
    }).connect(this.bassDistort);

    // Volume Nodes
    this.hihat = new Tone.NoiseSynth({ envelope: { attack: 0.001, decay: 0.1 } });
    this.hihatVolume = new Tone.Volume(-80);
    this.hihat.connect(this.hihatVolume).connect(this.reverb);

    this.snare = new Tone.NoiseSynth({ envelope: { attack: 0.001, decay: 0.2 } });
    this.snareVolume = new Tone.Volume(-80);
    this.snare.connect(this.snareVolume).connect(this.reverb);

    Tone.Transport.bpm.value = BPM;
    this.startDirectorLoop();
    this.isInitialized = true;
  }

  private startDirectorLoop() {
    Tone.Transport.scheduleRepeat((time) => {
      // Energy state is managed by the main React loop via `updateEnergy`.
      // No decay here to avoid double-decay bug.

      const position = Tone.Transport.position as string;
      const [bar, beat, sixteenth] = position.split(":").map(s => parseFloat(s));
      const safeSixteenth = Math.floor(sixteenth);
      const chordIndex = Math.floor(bar / 4) % CHORD_ROOTS.length;
      const currentRoot = CHORD_ROOTS[chordIndex];

      // --- KICK Logic ---
      let kickTriggered = false;
      if (this.currentEnergy < ENERGY_THRESHOLD_GROOVE) {
        if (beat === 0 && safeSixteenth === 0) {
          this.kick?.triggerAttackRelease("C1", "4n", time);
          kickTriggered = true;
        }
      } else if (this.currentEnergy < ENERGY_THRESHOLD_PEAK) {
        if (safeSixteenth === 0) {
          this.kick?.triggerAttackRelease("C1", "8n", time);
          kickTriggered = true;
        }
      } else {
        if (safeSixteenth === 0) {
          this.kick?.triggerAttackRelease("C1", "8n", time, 1.2);
          kickTriggered = true;
        }
        if (safeSixteenth === 0) this.snare?.triggerAttackRelease("32n", time, 0.2);
      }

      // --- SIDECHAIN Logic ---
      if (kickTriggered && this.currentEnergy > 0.3 && this.sidechainNode) {
        const depth = this.currentEnergy > ENERGY_THRESHOLD_PEAK ? -40 : -20;

        // Use setTargetAtTime for robust envelope generation (avoids "strictly greater" errors)
        this.sidechainNode.volume.cancelScheduledValues(time);
        this.sidechainNode.volume.setValueAtTime(depth, time);
        // Exponential approach back to 0 (unity gain)
        // Time constant 0.04 ~= reaches target in approx 0.15s
        this.sidechainNode.volume.setTargetAtTime(0, time, 0.04);
      }

      // --- BASS Logic ---
      if (this.currentEnergy > ENERGY_THRESHOLD_PEAK) {
        if (safeSixteenth === 2 || safeSixteenth === 3) {
          this.bass?.triggerAttackRelease(currentRoot, "16n", time);
        }
      } else if (this.currentEnergy > ENERGY_THRESHOLD_GROOVE) {
        if (safeSixteenth === 2) this.bass?.triggerAttackRelease(currentRoot, "8n", time);
      } else {
        if (beat === 0 && safeSixteenth === 0) this.bass?.triggerAttackRelease(currentRoot, "1n", time);
      }

      // --- Rhythm Helpers ---
      if (safeSixteenth % 2 === 0) this.hihat?.triggerAttackRelease("16n", time);
      if (this.currentEnergy > 0.7 && safeSixteenth % 2 !== 0) this.hihat?.triggerAttackRelease("32n", time, 0.6);
      if (this.currentEnergy > 0.6 && (beat === 1 || beat === 3) && safeSixteenth === 0) {
        this.snare?.triggerAttackRelease("8n", time);
      }
    }, "16n");
  }

  private syncParamsToEnergy(time: number) {
    if (!this.leadFilter || !this.hihatVolume || !this.snareVolume || !this.bassDistort) return;
    const e = this.currentEnergy;

    // Filter Frequency - Use setTargetAtTime for smooth, conflict-free updates
    const targetFreq = 100 + (13000 * Math.pow(e, 3));
    this.leadFilter.frequency.setTargetAtTime(targetFreq, time, 0.1);

    // Distortion - Set value directly (Signal property)
    const distortAmount = e > ENERGY_THRESHOLD_PEAK ? (e - ENERGY_THRESHOLD_PEAK) * 2 : 0;
    this.bassDistort.distortion = distortAmount;

    // Volume Buses (Mixing) - Use setTargetAtTime
    const targetHihatVol = e > 0.2 ? -15 + (e * 8) : -80;
    this.hihatVolume.volume.setTargetAtTime(targetHihatVol, time, 0.1);

    const targetSnareVol = e > 0.6 ? -6 : -80;
    this.snareVolume.volume.setTargetAtTime(targetSnareVol, time, 0.1);
  }

  public triggerQuantizedNote() {
    if (!this.lead || Tone.Transport.state !== 'started') return;

    // Energy is managed by App.tsx to avoid double-increment bug
    const pos = Tone.Transport.position as string;
    const bar = parseFloat(pos.split(":")[0]);
    const currentScale = SCALES[Math.floor(bar / 4) % SCALES.length];

    let notes = [];
    let dur = "8n";

    if (this.currentEnergy < ENERGY_THRESHOLD_GROOVE) {
      this.lead.set({ envelope: { attack: 0.4, release: 2 } });
      notes = [currentScale[0] + "2"];
      dur = "1n";
    } else if (this.currentEnergy < ENERGY_THRESHOLD_PEAK) {
      this.lead.set({ envelope: { attack: 0.02, release: 0.5 } });
      notes = [currentScale[Math.floor(Math.random() * currentScale.length)] + "3"];
    } else {
      this.lead.set({ envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.2 } });
      const rootNote = currentScale[Math.floor(Math.random() * currentScale.length)] + "4";
      const fifth = Tone.Frequency(rootNote).transpose(7).toNote();
      notes = [rootNote, fifth];
      dur = "16n";
    }

    this.lead.triggerAttackRelease(notes, dur, Tone.Transport.nextSubdivision("16n"));
  }

  public start() { if (Tone.Transport.state !== 'started') Tone.Transport.start(); }
  public stop() { Tone.Transport.stop(); }

  public updateEnergy(v: number) {
    this.currentEnergy = Math.max(0, Math.min(1, v));
    // Safe update using Tone.now()
    this.syncParamsToEnergy(Tone.now());
  }

  public getEnergy(): number { return this.currentEnergy; }
}

export const audioEngine = new AudioEngine();