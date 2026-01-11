import * as Tone from 'tone';
import { BPM } from '../constants';
import { Instruments, createInstruments } from './audio/instruments';
import { Effects, createEffects, updateEffectsForEnergy, updateRhythmVolumes } from './audio/effects';
import { startRhythmLoop } from './audio/rhythm';
import { triggerQuantizedNote } from './audio/melody';
import { SparkleSystem, createSparkleSystem, triggerSparkle } from './audio/sparkle';

/**
 * AudioEngine - Main orchestrator for the audio system
 * 
 * Based on psychology principles:
 * - Entrainment: Continuous rhythm drives body synchronization
 * - Flow State: Progressive complexity with energy
 * - Dopamine: Sparkle system for surprise rewards
 * - Embodied Cognition: Different frequencies invite different movements
 */
class AudioEngine {
  private instruments: Instruments | null = null;
  private effects: Effects | null = null;
  private sparkle: SparkleSystem | null = null;
  private isInitialized = false;
  private currentEnergy = 0;

  public async init() {
    if (this.isInitialized) return;
    await Tone.start();

    // Ensure audio context is running
    if (Tone.context.state !== 'running') {
      await Tone.context.resume();
    }

    const masterVol = new Tone.Volume(-2).toDestination();
    const limiter = new Tone.Limiter(-1).connect(masterVol);

    // 1. Create Effects Chain
    this.effects = createEffects(limiter);

    // 2. Create Instruments
    this.instruments = createInstruments();

    // 3. Create Sparkle System (Dopamine)
    this.sparkle = createSparkleSystem(limiter);

    // 4. Wiring Connections
    // Lead Layers -> Lead Filter Chain
    this.instruments.lead.connect(this.effects.leadFilter);
    this.instruments.subLayer.connect(this.effects.leadFilter);  // Sub layer for low-end support
    this.instruments.bellLayer.connect(this.effects.leadFilter);
    this.instruments.fmLayer.connect(this.effects.leadFilter);

    // Rhythm Section
    this.instruments.kick.connect(limiter);
    this.instruments.bass.connect(this.effects.bassDistort);

    // Aux Percussion (through reverb for space)
    this.instruments.hihat.connect(this.instruments.hihatVolume).connect(this.effects.reverb);
    this.instruments.snare.connect(this.instruments.snareVolume).connect(this.effects.reverb);

    // 5. Setup Transport & Rhythm Loop
    Tone.Transport.bpm.value = BPM;

    // Start the rhythm director (Entrainment - continuous "heartbeat")
    startRhythmLoop(
      this.instruments,
      this.effects.sidechainNode,
      this.sparkle,
      () => this.currentEnergy
    );

    this.isInitialized = true;
  }

  public start() {
    if (Tone.Transport.state !== 'started') Tone.Transport.start();
  }

  public stop() {
    Tone.Transport.stop();
  }

  public updateEnergy(v: number) {
    this.currentEnergy = Math.max(0, Math.min(1, v));

    if (this.effects && this.instruments) {
      const now = Tone.now();
      updateEffectsForEnergy(this.effects, this.currentEnergy, now);
      updateRhythmVolumes(
        this.instruments.hihatVolume,
        this.instruments.snareVolume,
        this.currentEnergy,
        now
      );
    }
  }

  public getEnergy(): number {
    return this.currentEnergy;
  }

  /**
   * Trigger a user-initiated melodic note (quantized to grid)
   * @param key - The keyboard key pressed (for pitch mapping)
   */
  public triggerQuantizedNote(key?: string) {
    if (!this.instruments || !this.isInitialized) return;
    triggerQuantizedNote(this.instruments, this.currentEnergy, key);
  }

  /**
   * Trigger a sparkle effect (Dopamine reward sound)
   */
  public triggerSparkle() {
    if (!this.sparkle || !this.isInitialized) return;

    // Intensity based on current energy
    let intensity: 'low' | 'medium' | 'high' = 'low';
    if (this.currentEnergy > 0.6) intensity = 'high';
    else if (this.currentEnergy > 0.3) intensity = 'medium';

    triggerSparkle(this.sparkle, intensity);
  }
}

export const audioEngine = new AudioEngine();