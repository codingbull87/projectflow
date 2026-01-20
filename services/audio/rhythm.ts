import * as Tone from 'tone';
import { Instruments } from './instruments';
import { SparkleSystem, checkBackgroundSparkle } from './sparkle';
import { getStyleDirector } from './styleDirector';
import {
    getEnergyStage,
    EnergyStage,
    SPARKLE_BACKGROUND_INTERVAL_BARS,
    SPARKLE_BACKGROUND_CHANCE,
    DROP_INTERVAL_BARS,
    DROP_CHANCE,
    DROP_SILENCE_DURATION
} from '../../constants';
import {
    TriggerContext,
    processKickTrigger,
    processBassTrigger,
    processHihatTrigger,
    processSnareTrigger,
    applySidechainDuck
} from './rhythmTriggers';

/**
 * Rhythm Module - Main Loop Controller
 *
 * Now uses separated trigger logic from rhythmTriggers.ts
 * This file only contains:
 * 1. BeatCounter class
 * 2. Main rhythm loop scheduling
 * 3. Coordinating trigger calls
 */

// Minimum time between triggers for each instrument type
const MIN_INTERVAL = {
    KICK: 0.1,    // 100ms
    SNARE: 0.15,  // 150ms
    HIHAT: 0.08,  // 80ms
    BASS: 0.1     // 100ms
};

/**
 * Tracks beat position within the transport
 */
class BeatCounter {
    private sixteenthCount = 0;

    increment() { this.sixteenthCount++; }
    reset() { this.sixteenthCount = 0; }

    get bar(): number { return Math.floor(this.sixteenthCount / 16); }
    get beat(): number { return Math.floor((this.sixteenthCount % 16) / 4); }
    get sixteenth(): number { return this.sixteenthCount % 4; }
    get currentStep(): number { return this.sixteenthCount % 16; } // 0-15 for pattern indexing

    // Gets chord from StyleDirector
    get currentRoot(): string {
        const director = getStyleDirector();
        return director.getCurrentChord().root;
    }
}

/**
 * Start the main rhythm loop
 * Schedules a 16th note callback that triggers all rhythm instruments
 */
export function startRhythmLoop(
    instruments: Instruments,
    sidechainNode: Tone.Volume,
    sparkle: SparkleSystem | null,
    getEnergy: () => number
) {
    const counter = new BeatCounter();
    const director = getStyleDirector();

    // Last trigger times (for throttling)
    let lastKick = 0;
    let lastSnare = 0;
    let lastHihat = 0;
    let lastBass = 0;
    let isDropActive = false;
    let lastBarNotified = -1;

    Tone.Transport.scheduleRepeat((time) => {
        const energy = getEnergy();
        const stage = getEnergyStage(energy);
        const { bar, beat, sixteenth, currentRoot, currentStep } = counter;

        // ================================
        // NOTIFY STYLE DIRECTOR ON NEW BAR
        // ================================
        if (bar !== lastBarNotified && sixteenth === 0 && beat === 0) {
            lastBarNotified = bar;
            director.onBar(bar, energy);
        }

        // Get current style for style-specific behavior
        const currentStyle = director.getCurrentStyle();

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
        // BUILD TRIGGER CONTEXT
        // ================================
        const ctx: TriggerContext = {
            time,
            stepIndex: currentStep,
            beat,
            energy,
            stage,
            currentStyle,
            currentRoot
        };

        // Get pattern values for current step
        const kickPattern = currentStyle.patterns.kick[currentStep];
        const bassPattern = currentStyle.patterns.bass[currentStep];
        const hihatPattern = currentStyle.patterns.hihat[currentStep];
        const snarePattern = currentStyle.patterns.snare[currentStep];

        // ================================
        // KICK
        // ================================
        if (time > lastKick + MIN_INTERVAL.KICK) {
            const kickResult = processKickTrigger(ctx, kickPattern);
            if (kickResult.shouldTrigger) {
                instruments.kick.triggerAttackRelease(
                    kickResult.note!,
                    kickResult.duration!,
                    time,
                    kickResult.velocity!
                );
                lastKick = time;
                applySidechainDuck(sidechainNode, stage, time);
            }
        }

        // ================================
        // BASS
        // ================================
        if (time > lastBass + MIN_INTERVAL.BASS) {
            const bassResult = processBassTrigger(ctx, bassPattern);
            if (bassResult.shouldTrigger) {
                instruments.bass.triggerAttackRelease(
                    bassResult.note!,
                    bassResult.duration!,
                    time + 0.002,
                    bassResult.velocity!
                );
                lastBass = time;
            }
        }

        // ================================
        // HI-HAT
        // ================================
        if (time > lastHihat + MIN_INTERVAL.HIHAT) {
            const hihatResult = processHihatTrigger(ctx, hihatPattern);
            if (hihatResult.shouldTrigger) {
                instruments.hihat.triggerAttackRelease(
                    hihatResult.duration!,
                    time + 0.004,
                    hihatResult.velocity!
                );
                lastHihat = time;
            }
        }

        // ================================
        // SNARE
        // ================================
        if (time > lastSnare + MIN_INTERVAL.SNARE) {
            const snareResult = processSnareTrigger(ctx, snarePattern);
            if (snareResult.shouldTrigger) {
                instruments.snare.triggerAttackRelease(
                    snareResult.duration!,
                    time + 0.003,
                    snareResult.velocity!
                );
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

/**
 * Get current chord root note (convenience export)
 */
export function getCurrentChordRoot(): string {
    const director = getStyleDirector();
    return director.getCurrentChord().root;
}
