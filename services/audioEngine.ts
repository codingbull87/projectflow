import * as Tone from 'tone';
import {
  BPM,
  ENERGY_THRESHOLD_GROOVE,
  ENERGY_THRESHOLD_BUILDING,
  ENERGY_THRESHOLD_PEAK,
  ENERGY_THRESHOLD_ULTRA
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
  // Rhythm Section
  private kick: Tone.MembraneSynth | null = null;
  private bass: Tone.MonoSynth | null = null;
  private hihat: Tone.NoiseSynth | null = null;
  private snare: Tone.NoiseSynth | null = null;

  // Melodic Layers
  private lead: Tone.PolySynth | null = null;           // Layer 1: Core (Pad -> Pluck)
  private bellLayer: Tone.PolySynth | null = null;      // Layer 2: Bell/Glimmer
  private fmLayer: Tone.PolySynth | null = null;        // Layer 3: Metallic/Aggressive

  // Effect Chain
  private leadFilter: Tone.Filter | null = null;
  private sidechainNode: Tone.Volume | null = null;
  private reverb: Tone.Reverb | null = null;
  private delay: Tone.PingPongDelay | null = null;

  // Dynamic Effects
  private chorus: Tone.Chorus | null = null;
  private phaser: Tone.Phaser | null = null;
  private bitCrusher: Tone.BitCrusher | null = null;
  private leadDistortion: Tone.Distortion | null = null;

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

    // Common Effects
    this.reverb = new Tone.Reverb({ decay: 5, wet: 0.4 }).connect(limiter);
    this.delay = new Tone.PingPongDelay("8n.", 0.2).connect(limiter);

    // --- Lead Chain Construction ---
    // Signal Flow: Synths -> Filter -> BitCrusher -> Distortion -> Phaser -> Chorus -> Sidechain -> Delay -> Reverb

    this.sidechainNode = new Tone.Volume(0).connect(this.delay).connect(this.reverb);

    this.chorus = new Tone.Chorus(4, 2.5, 0.5).connect(this.sidechainNode).start();
    this.phaser = new Tone.Phaser({ frequency: 15, octaves: 5, baseFrequency: 1000 }).connect(this.chorus);
    this.leadDistortion = new Tone.Distortion(0).connect(this.phaser);
    this.bitCrusher = new Tone.BitCrusher(8).connect(this.leadDistortion);
    // BitCrusher starts at 8-bit, will degrade to 4-bit at Ultra stage
    this.bitCrusher.wet.value = 0;

    this.leadFilter = new Tone.Filter(200, "lowpass", -24).connect(this.bitCrusher);

    // 1. Core Lead (Triangle -> Sawtooth)
    this.lead = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.1, decay: 0.2, sustain: 0.5, release: 1 },
      volume: -6
    }).connect(this.leadFilter);

    // 2. Bell Layer (FM for glassy sound)
    this.bellLayer = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 3,
      modulationIndex: 10,
      oscillator: { type: "sine" },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 1 },
      modulation: { type: "sine" },
      modulationEnvelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 },
      volume: -12
    }).connect(this.leadFilter);

    // 3. FM Layer (Aggressive)
    this.fmLayer = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 1.5,
      modulationIndex: 20,
      oscillator: { type: "sawtooth" },
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
      modulation: { type: "square" },
      modulationEnvelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 },
      volume: -10
    }).connect(this.leadFilter);

    // --- Rhythm Section ---
    this.kick = new Tone.MembraneSynth({
      pitchDecay: 0.06, octaves: 8,
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 },
      volume: 4
    }).connect(limiter);

    // Bass
    this.bassDistort = new Tone.Distortion(0).connect(limiter);
    this.bass = new Tone.MonoSynth({
      oscillator: { type: "square" },
      envelope: { attack: 0.05, decay: 0.3, sustain: 0.6, release: 0.8 },
      filterEnvelope: { attack: 0.001, decay: 0.5, sustain: 0, baseFrequency: 40, octaves: 4 }
    }).connect(this.bassDistort);

    // Hats & Snare
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
      // Note: Energy decay is handled in App.tsx to avoid double-decay.

      const position = Tone.Transport.position as string;
      const [bar, beat, sixteenth] = position.split(":").map(s => parseFloat(s));
      const safeSixteenth = Math.floor(sixteenth);
      const chordIndex = Math.floor(bar / 4) % CHORD_ROOTS.length;
      const currentRoot = CHORD_ROOTS[chordIndex];

      const e = this.currentEnergy;

      // --- KICK Logic ---
      let kickTriggered = false;
      if (e < ENERGY_THRESHOLD_GROOVE) {
        // Idle: Kick on 1
        if (beat === 0 && safeSixteenth === 0) {
          this.kick?.triggerAttackRelease("C1", "4n", time);
          kickTriggered = true;
        }
      } else if (e < ENERGY_THRESHOLD_PEAK) {
        // Groove/Building: Kick on 1, 2, 3, 4
        if (safeSixteenth === 0) {
          this.kick?.triggerAttackRelease("C1", "8n", time);
          kickTriggered = true;
        }
      } else {
        // Peak/Ultra: Heavy Kick
        if (safeSixteenth === 0) {
          this.kick?.triggerAttackRelease("C1", "8n", time, 1.2);
          kickTriggered = true;
        }
        // Extra ghost snare at peak
        if (safeSixteenth === 0) this.snare?.triggerAttackRelease("32n", time, 0.2);
      }

      // --- SIDECHAIN Logic ---
      if (kickTriggered && e > 0.3 && this.sidechainNode) {
        const depth = e > ENERGY_THRESHOLD_PEAK ? -40 : -20;
        this.sidechainNode.volume.cancelScheduledValues(time);
        this.sidechainNode.volume.setValueAtTime(depth, time);
        this.sidechainNode.volume.setTargetAtTime(0, time, 0.05); // Faster recovery
      }

      // --- BASS Logic ---
      if (e > ENERGY_THRESHOLD_PEAK) {
        // Peak: 16th note drive
        if (safeSixteenth === 2 || safeSixteenth === 3) {
          this.bass?.triggerAttackRelease(currentRoot, "16n", time);
        }
      } else if (e > ENERGY_THRESHOLD_GROOVE) {
        // Groove: Offbeat 8ths
        if (safeSixteenth === 2) this.bass?.triggerAttackRelease(currentRoot, "8n", time);
      } else {
        // Idle: Long bass
        if (beat === 0 && safeSixteenth === 0) this.bass?.triggerAttackRelease(currentRoot, "1n", time);
      }

      // --- Rhythm Helpers ---
      if (safeSixteenth % 2 === 0) this.hihat?.triggerAttackRelease("16n", time);
      // Extra hats in building/peak
      if (e > ENERGY_THRESHOLD_BUILDING && safeSixteenth % 2 !== 0) this.hihat?.triggerAttackRelease("32n", time, 0.4);

      // Snare on 2 and 4
      if (e > 0.5 && (beat === 1 || beat === 3) && safeSixteenth === 0) {
        this.snare?.triggerAttackRelease("8n", time);
      }
    }, "16n");
  }

  // Smooth continuously variable parameters based on energy
  private syncParamsToEnergy(time: number) {
    if (!this.leadFilter || !this.chorus || !this.phaser || !this.leadDistortion || !this.bitCrusher) return;

    // Smooth energy for modulation to avoid abrupt jumps
    const e = this.currentEnergy;

    // 1. Filter Evolution (Deep -> Bright)
    // Idle(200Hz) -> Ultra(12000Hz)
    // Exponential curve for filter feels better
    const targetFreq = 200 + (11800 * Math.pow(e, 2.5));
    this.leadFilter.frequency.setTargetAtTime(targetFreq, time, 0.1);
    this.leadFilter.Q.setTargetAtTime(Math.min(3, e * 4), time, 0.1); // Limit Q to avoid self-oscillation

    // 2. Chorus (Width)
    // Starts coming in at Groove (0.35)
    const chorusWet = e > 0.3 ? Math.min(0.5, (e - 0.3) * 1.5) : 0;
    this.chorus.wet.setTargetAtTime(chorusWet, time, 0.2);

    // 3. Phaser (Movement)
    // Starts at Building (0.55)
    // Subtle effect: max 0.3 wet
    const phaserWet = e > 0.55 ? Math.min(0.3, (e - 0.55) * 1) : 0;
    this.phaser.wet.setTargetAtTime(phaserWet, time, 0.2);
    this.phaser.frequency.setTargetAtTime(0.5 + (e * 5), time, 0.5); // Speed up phaser

    // 4. Distinction & Grit (Peak & Ultra)
    // Lead Distortion starts at Peak (0.75)
    const leadDist = e > 0.75 ? Math.min(0.2, (e - 0.75) * 1) : 0; // Subtle distortion max 0.2
    this.leadDistortion.distortion = leadDist;

    // BitCrusher at Ultra (0.9)
    // Note: bits parameter is read-only, set at construction time (8-bit)
    const crushWet = e > 0.9 ? Math.min(0.4, (e - 0.9) * 2) : 0;
    this.bitCrusher.wet.setTargetAtTime(crushWet, time, 0.1);

    // Bass Distortion
    const bassDist = e > 0.7 ? (e - 0.7) * 2 : 0;
    if (this.bassDistort) this.bassDistort.distortion = bassDist;

    // Volume Mixes
    if (this.hihatVolume) {
      this.hihatVolume.volume.setTargetAtTime(e > 0.2 ? -15 + (e * 8) : -80, time, 0.1);
    }
    if (this.snareVolume) {
      this.snareVolume.volume.setTargetAtTime(e > 0.5 ? -6 : -80, time, 0.1);
    }
  }

  public triggerQuantizedNote() {
    if (!this.lead || Tone.Transport.state !== 'started') return;

    // Energy increment handled in App.tsx

    const pos = Tone.Transport.position as string;
    const bar = parseFloat(pos.split(":")[0]);
    const currentScale = SCALES[Math.floor(bar / 4) % SCALES.length];
    const e = this.currentEnergy;

    // Determine notes based on Energy Stage

    let notes: string[] = [];
    let dur = "8n";

    // --- STAGE 0: IDLE (< 0.35) ---
    if (e < ENERGY_THRESHOLD_GROOVE) {
      // Single long root note, Triangle wave
      this.lead.set({
        oscillator: { type: "triangle" },
        envelope: { attack: 0.4, release: 2 }
      });
      notes = [currentScale[0] + "3"]; // Octave 3
      dur = "1n";
    }
    // --- STAGE 1: GROOVE (0.35 - 0.55) ---
    else if (e < ENERGY_THRESHOLD_BUILDING) {
      // Plucky, Sawtooth, moving around scale
      this.lead.set({
        oscillator: { type: "fatsawtooth", count: 3, spread: 20 },
        envelope: { attack: 0.05, release: 0.5 }
      });
      const note = currentScale[Math.floor(Math.random() * currentScale.length)];
      notes = [note + "3"];
      dur = "8n";
    }
    // --- STAGE 2: BUILDING (0.55 - 0.75) ---
    else if (e < ENERGY_THRESHOLD_PEAK) {
      // Shorter, brighter, Bell layer enters
      this.lead.set({ envelope: { attack: 0.01, release: 0.3 } });
      const note = currentScale[Math.floor(Math.random() * currentScale.length)];
      notes = [note + "4"]; // Octave 4
      dur = "16n";

      // Trigger Bell Layer (Glassy texture) - sync with main lead timing
      const triggerTime = Tone.Transport.nextSubdivision("16n");
      this.bellLayer?.triggerAttackRelease(note + "5", "16n", triggerTime);
    }
    // --- STAGE 3 & 4: PEAK & ULTRA (> 0.75) ---
    else {
      // Tight, percussive, Chords (Root + 5th), FM Layer enters
      this.lead.set({ envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.2 } });

      const rootIdx = Math.floor(Math.random() * currentScale.length);
      const rootNote = currentScale[rootIdx] + "4";
      const fifth = Tone.Frequency(rootNote).transpose(7).toNote();

      notes = [rootNote, fifth];
      dur = "16n";

      // Trigger Layers with synchronized timing
      const triggerTime = Tone.Transport.nextSubdivision("16n");

      // Bell adds high sparkle
      this.bellLayer?.triggerAttackRelease([rootNote.replace("4", "5"), fifth.replace("4", "5")], "16n", triggerTime);

      // FM adds metallic bite
      if (e > ENERGY_THRESHOLD_ULTRA) {
        // Chaos chords at ultra
        const third = Tone.Frequency(rootNote).transpose(4).toNote();
        this.fmLayer?.triggerAttackRelease([rootNote, third, fifth], "32n", triggerTime);
      } else {
        this.fmLayer?.triggerAttackRelease([rootNote, fifth], "16n", triggerTime);
      }
    }

    // Main lead uses the same quantized timing
    const mainTriggerTime = Tone.Transport.nextSubdivision("16n");
    this.lead.triggerAttackRelease(notes, dur, mainTriggerTime);
  }

  public start() { if (Tone.Transport.state !== 'started') Tone.Transport.start(); }
  public stop() { Tone.Transport.stop(); }

  public updateEnergy(v: number) {
    this.currentEnergy = Math.max(0, Math.min(1, v));
    this.syncParamsToEnergy(Tone.now());
  }

  public getEnergy(): number { return this.currentEnergy; }
}

export const audioEngine = new AudioEngine();