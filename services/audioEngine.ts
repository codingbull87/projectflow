import * as Tone from 'tone';
import { BPM } from '../constants';
import { Instruments, createInstruments } from './audio/instruments';
import { Effects, createEffects, updateEffectsForEnergy, updateRhythmVolumes } from './audio/effects';
import { startRhythmLoop } from './audio/rhythm';
import { triggerQuantizedNote } from './audio/melody';
import { SparkleSystem, createSparkleSystem, triggerSparkle } from './audio/sparkle';
import { getStyleDirector, resetStyleDirector, StyleDirector } from './audio/styleDirector';
import { TRANSITION_CONFIG } from './audio/styles';

/**
 * AudioEngine - Main orchestrator for the audio system
 * 
 * Now includes StyleDirector for dynamic style transitions
 * 
 * Based on psychology principles:
 * - Entrainment: Continuous rhythm drives body synchronization
 * - Flow State: Progressive complexity with energy
 * - Dopamine: Sparkle system for surprise rewards
 * - Embodied Cognition: Different frequencies invite different movements
 * - Variety: Style changes prevent monotony
 */
class AudioEngine {
  private instruments: Instruments | null = null;
  private effects: Effects | null = null;
  private sparkle: SparkleSystem | null = null;
  private styleDirector: StyleDirector | null = null;
  private isInitialized = false;
  private currentEnergy = 0;

  // Callbacks for external UI updates
  private onStyleChangeCallback?: (styleName: string) => void;
  private onTransitionCallback?: (isTransitioning: boolean, progress: number) => void;

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

    // 4. Initialize Style Director
    resetStyleDirector(); // Reset any previous state
    this.styleDirector = getStyleDirector();
    this.setupStyleDirectorCallbacks();

    // 5. Wiring Connections
    // Lead Layers -> Lead Filter Chain
    this.instruments.lead.connect(this.effects.leadFilter);
    this.instruments.subLayer.connect(this.effects.leadFilter);
    this.instruments.bellLayer.connect(this.effects.leadFilter);
    this.instruments.fmLayer.connect(this.effects.leadFilter);

    // Rhythm Section
    this.instruments.kick.connect(limiter);
    this.instruments.bass.connect(this.effects.bassDistort);

    // Aux Percussion (through reverb for space)
    this.instruments.hihat.connect(this.instruments.hihatVolume).connect(this.effects.reverb);
    this.instruments.snare.connect(this.instruments.snareVolume).connect(this.effects.reverb);

    // 6. Setup Transport & Rhythm Loop
    Tone.Transport.bpm.value = BPM;

    // Start the rhythm director (Entrainment - continuous "heartbeat")
    startRhythmLoop(
      this.instruments,
      this.effects.sidechainNode,
      this.sparkle,
      () => this.currentEnergy
    );

    this.isInitialized = true;
    console.log('[AudioEngine] Initialized with style:', this.styleDirector.getCurrentStyle().name);
  }

  /**
   * Setup callbacks for StyleDirector events
   */
  private setupStyleDirectorCallbacks() {
    if (!this.styleDirector) return;

    // When a transition starts, trigger "fake drop" effect
    this.styleDirector.setOnTransitionStart((fromStyle, toStyle) => {
      console.log(`[AudioEngine] Transition starting: ${fromStyle.name} → ${toStyle.name}`);
      this.onTransitionCallback?.(true, 0);
    });

    // When transition completes
    this.styleDirector.setOnTransitionComplete((newStyle) => {
      console.log(`[AudioEngine] Now playing: ${newStyle.name}`);
      this.onTransitionCallback?.(false, 1);
      this.onStyleChangeCallback?.(newStyle.name);

      // Apply new style's parameters to effects
      if (this.effects) {
        this.styleDirector?.applyStyleToEffects(this.effects, Tone.now());
      }
    });

    // Energy drop during transition ("fake drop")
    this.styleDirector.setOnEnergyDrop(() => {
      // Gradually drop energy to create contrast
      this.triggerEnergyDrop();
    });

    // Style change (after transition)
    this.styleDirector.setOnStyleChange((newStyle, oldStyle) => {
      // Update instrument timbres for new style
      if (this.instruments) {
        this.styleDirector?.applyStyleToInstruments(this.instruments, Tone.now());
      }
    });
  }

  /**
   * Trigger the "fake drop" energy effect
   * Energy drops to mid-Flow, then user can rebuild
   */
  private triggerEnergyDrop() {
    const targetEnergy = TRANSITION_CONFIG.energyDropTarget;
    const dropDuration = TRANSITION_CONFIG.energyDropDuration;

    // Smooth drop over time
    const startEnergy = this.currentEnergy;
    const startTime = Date.now();

    const dropInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / dropDuration);

      // Ease out curve for smooth drop
      const easeProgress = 1 - Math.pow(1 - progress, 2);
      this.currentEnergy = startEnergy - (startEnergy - targetEnergy) * easeProgress;

      if (progress >= 1) {
        clearInterval(dropInterval);
        this.currentEnergy = targetEnergy;
      }
    }, 16); // ~60fps
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

      // Update style-specific effects during transitions
      if (this.styleDirector?.isInTransition()) {
        this.styleDirector.applyStyleToEffects(this.effects, now);
      }
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

    let intensity: 'low' | 'medium' | 'high' = 'low';
    if (this.currentEnergy > 0.6) intensity = 'high';
    else if (this.currentEnergy > 0.3) intensity = 'medium';

    triggerSparkle(this.sparkle, intensity);
  }

  /**
   * Get current style name for UI display
   */
  public getCurrentStyleName(): string {
    return this.styleDirector?.getCurrentStyle().name || 'Unknown';
  }

  /**
   * Get current style hue shift for visuals
   */
  public getCurrentHueShift(): number {
    return this.styleDirector?.getCurrentStyle().hueShift || 0;
  }

  public getVisualParameters() {
    return {
      hueShift: this.styleDirector?.getInterpolatedValue('hueShift') || 0
    };
  }

  /**
   * Check if currently in a style transition
   */
  public isInTransition(): boolean {
    return this.styleDirector?.isInTransition() || false;
  }

  /**
   * Get transition progress (0-1)
   */
  public getTransitionProgress(): number {
    return this.styleDirector?.getTransitionProgress() || 0;
  }

  /**
   * Manually trigger a style transition (for testing)
   */
  public forceStyleTransition(targetStyleId?: string) {
    this.styleDirector?.startTransition(targetStyleId);
  }

  /**
   * Set callback for style changes
   */
  public onStyleChange(callback: (styleName: string) => void) {
    this.onStyleChangeCallback = callback;
  }

  /**
   * Set callback for transition updates
   */
  public onTransition(callback: (isTransitioning: boolean, progress: number) => void) {
    this.onTransitionCallback = callback;
  }
}

export const audioEngine = new AudioEngine();