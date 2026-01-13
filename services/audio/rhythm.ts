import * as Tone from 'tone';
import { Instruments } from './instruments';
import { SparkleSystem, checkBackgroundSparkle } from './sparkle';
import { getStyleDirector } from './styleDirector';
import {
    ENERGY_THRESHOLD_AWAKENING,
    ENERGY_THRESHOLD_GROOVE,
    ENERGY_THRESHOLD_FLOW,
    ENERGY_THRESHOLD_EUPHORIA,
    SPARKLE_BACKGROUND_INTERVAL_BARS,
    SPARKLE_BACKGROUND_CHANCE,
    DROP_INTERVAL_BARS,
    DROP_CHANCE,
    DROP_SILENCE_DURATION
} from '../../constants';

/**
 * Rhythm Module - Now integrated with StyleDirector
 * 
 * KEY CHANGES:
 * 1. Chord roots come from current style
 * 2. Bar counter triggers StyleDirector.onBar()
 * 3. Kick/bass style varies by current style
 */

// Minimum time between triggers for each instrument type
const MIN_INTERVAL = {
    KICK: 0.1,    // 100ms
    SNARE: 0.15,  // 150ms
    HIHAT: 0.08,  // 80ms
    BASS: 0.1     // 100ms
};

class BeatCounter {
    private sixteenthCount = 0;

    increment() { this.sixteenthCount++; }
    reset() { this.sixteenthCount = 0; }

    get bar(): number { return Math.floor(this.sixteenthCount / 16); }
    get beat(): number { return Math.floor((this.sixteenthCount % 16) / 4); }
    get sixteenth(): number { return this.sixteenthCount % 4; }
    get currentStep(): number { return this.sixteenthCount % 16; } // 0-15 for pattern indexing

    // Now gets chord from StyleDirector instead of hardcoded array
    get currentRoot(): string {
        const director = getStyleDirector();
        return director.getCurrentChord().root;
    }
}

function getEnergyStage(energy: number): 'idle' | 'awakening' | 'groove' | 'flow' | 'euphoria' {
    if (energy >= ENERGY_THRESHOLD_EUPHORIA) return 'euphoria';
    if (energy >= ENERGY_THRESHOLD_FLOW) return 'flow';
    if (energy >= ENERGY_THRESHOLD_GROOVE) return 'groove';
    if (energy >= ENERGY_THRESHOLD_AWAKENING) return 'awakening';
    return 'idle';
}

export function startRhythmLoop(
    instruments: Instruments,
    sidechainNode: Tone.Volume,
    sparkle: SparkleSystem | null,
    getEnergy: () => number
) {
    const counter = new BeatCounter();
    const director = getStyleDirector();

    // Last trigger times
    let lastKick = 0;
    let lastSnare = 0;
    let lastHihat = 0;
    let lastBass = 0;
    let isDropActive = false;
    let lastBarNotified = -1;

    Tone.Transport.scheduleRepeat((time) => {
        const energy = getEnergy();
        const stage = getEnergyStage(energy);
        const { bar, beat, sixteenth, currentRoot } = counter;

        // ================================
        // NOTIFY STYLE DIRECTOR ON NEW BAR
        // ================================
        if (bar !== lastBarNotified && sixteenth === 0 && beat === 0) {
            lastBarNotified = bar;
            director.onBar(bar, energy);
        }

        // Get current style for style-specific behavior
        const currentStyle = director.getCurrentStyle();
        const kickStyle = currentStyle.kickStyle;

        // ================================
        // DROP EFFECT (Euphoria only)
        // ================================
        if (stage === 'euphoria' && sixteenth === 0 && beat === 0 && bar % DROP_INTERVAL_BARS === 0) {
            if (Math.random() < DROP_CHANCE && !isDropActive) {
                isDropActive = true;
                counter.increment();
                Tone.Transport.scheduleOnce((t) => {
                    if (time > lastKick + MIN_INTERVAL.KICK) {
                        instruments.kick.triggerAttackRelease('C1', '8n', t, 1.5);
                        lastKick = t;
                    }
                    isDropActive = false;
                }, time + DROP_SILENCE_DURATION);
                return;
            }
        }

        // ================================
        // RHYTHM PATTERNS (Style-Driven)
        // ================================

        // Get pattern values for current step (0-15)
        // We use the 16th note index directly into the style's pattern arrays
        const stepIndex = counter.currentStep;
        const kickTrigger = currentStyle.patterns.kick[stepIndex];
        const bassTrigger = currentStyle.patterns.bass[stepIndex];
        const hihatTrigger = currentStyle.patterns.hihat[stepIndex];
        const snareTrigger = currentStyle.patterns.snare[stepIndex];

        // ================================
        // KICK logic
        // ================================
        if (time > lastKick + MIN_INTERVAL.KICK && kickTrigger > 0) {
            let shouldKick = false;
            let kickVelocity = 0.7;

            // Base velocity from style settings
            const styleVelocityMod = kickStyle === 'soft' ? 0.8
                : kickStyle === 'punchy' ? 1.0
                    : 1.15;

            // Energy Masking:
            // Low energy = filter out some pattern hits to keep it sparse
            if (stage === 'idle') {
                // Idle: only allow kicks on beats 1 and 3 (index 0, 8)
                if (stepIndex === 0 || stepIndex === 8) {
                    shouldKick = true;
                    kickVelocity = 0.5;
                }
            } else if (stage === 'awakening') {
                // Awakening: allow beats 1, 2, 3, 4 (quarters)
                if (stepIndex % 4 === 0) {
                    shouldKick = true;
                    kickVelocity = 0.6;
                }
            } else {
                // Groove/Flow/Euphoria: Full pattern
                shouldKick = true;
                // Scale velocity with energy
                kickVelocity = 0.7 + (energy * 0.3);
            }

            if (shouldKick) {
                const finalVel = Math.min(1.5, kickVelocity * styleVelocityMod);
                instruments.kick.triggerAttackRelease('C1', '8n', time, finalVel);
                lastKick = time;

                // Sidechain processing
                if (stage !== 'idle') {
                    const depth = stage === 'awakening' ? -6
                        : stage === 'groove' ? -12
                            : stage === 'flow' ? -20
                                : -30;
                    sidechainNode.volume.cancelScheduledValues(time);
                    sidechainNode.volume.setValueAtTime(depth, time);
                    sidechainNode.volume.setTargetAtTime(0, time, 0.06);
                }
            }
        }

        // ================================
        // BASS logic
        // ================================
        if (time > lastBass + MIN_INTERVAL.BASS && bassTrigger > 0) {
            let shouldTriggerBass = false;
            let bassDuration = '8n';
            let bassVelocity = 0.6;
            const bassRoot = currentRoot;

            if (stage === 'idle') {
                // Idle: only root notes on bar start
                if (stepIndex === 0 && beat === 0) {
                    shouldTriggerBass = true;
                    bassDuration = '1n';
                    bassVelocity = 0.5;
                }
            } else if (stage === 'awakening') {
                // Awakening: simplified pattern (only downbeats)
                if (stepIndex % 4 === 0) {
                    shouldTriggerBass = true;
                    bassDuration = '4n';
                }
            } else {
                // Full pattern for Groove+
                shouldTriggerBass = true;
                bassVelocity = 0.6 + (energy * 0.3);
                // Adjust duration based on density
                if (currentStyle.id === 'trance') bassDuration = '16n';
            }

            if (shouldTriggerBass) {
                instruments.bass.triggerAttackRelease(bassRoot, bassDuration, time + 0.002, bassVelocity);
                lastBass = time;
            }
        }

        // ================================
        // HI-HAT logic
        // ================================
        if (time > lastHihat + MIN_INTERVAL.HIHAT && hihatTrigger > 0) {
            let shouldHihat = false;
            let hihatVelocity = hihatTrigger; // Use value from pattern (0-1) as base
            let hihatDuration = '32n';
            const hihatStyle = currentStyle.hihatStyle;

            // Energy masks density
            if (stage === 'idle') {
                if (stepIndex % 4 === 0) shouldHihat = true; // Quarters only
            } else if (stage === 'awakening') {
                if (stepIndex % 2 === 0) shouldHihat = true; // 8ths
            } else {
                shouldHihat = true; // Full pattern
            }

            if (shouldHihat) {
                // Add dynamics
                if (stepIndex % 4 === 0) hihatVelocity += 0.2; // Accent downbeats

                // Style nuances
                if (hihatStyle === 'open' && (stepIndex === 2 || stepIndex === 10)) {
                    hihatDuration = '8n'; // Open hat feel
                }

                // Global energy scaling
                hihatVelocity = Math.min(1, hihatVelocity * (0.4 + energy * 0.6));

                instruments.hihat.triggerAttackRelease(hihatDuration, time + 0.004, hihatVelocity);
                lastHihat = time;
            }
        }

        // ================================
        // SNARE logic
        // ================================
        if (time > lastSnare + MIN_INTERVAL.SNARE && snareTrigger > 0) {
            // Snare usually only active from Groove onwards
            if (stage === 'groove' || stage === 'flow' || stage === 'euphoria') {
                const snareVelocity = 0.5 + (energy * 0.4);
                instruments.snare.triggerAttackRelease('16n', time + 0.003, snareVelocity);
                lastSnare = time;
            }
        }

        // ================================
        // BACKGROUND SPARKLE
        // ================================
        if (sparkle && sixteenth === 0 && beat === 0) {
            checkBackgroundSparkle(sparkle, bar, SPARKLE_BACKGROUND_INTERVAL_BARS, SPARKLE_BACKGROUND_CHANCE);
        }

        counter.increment();
    }, '16n');

    return counter;
}

export function getCurrentChordRoot(): string {
    const director = getStyleDirector();
    return director.getCurrentChord().root;
}
