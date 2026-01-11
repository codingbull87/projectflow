import * as Tone from 'tone';
import { Instruments } from './instruments';
import { SparkleSystem, checkBackgroundSparkle } from './sparkle';
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
 * Rhythm Module - Simplified for stability
 * 
 * KEY PRINCIPLE: Less is more. Reduce trigger frequency to avoid polyphony issues.
 */

const CHORD_ROOTS = ['C2', 'Ab1', 'F1', 'G1'];

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
    get chordIndex(): number { return Math.floor(this.bar / 4) % CHORD_ROOTS.length; }
    get currentRoot(): string { return CHORD_ROOTS[this.chordIndex]; }
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

    // Last trigger times
    let lastKick = 0;
    let lastSnare = 0;
    let lastHihat = 0;
    let lastBass = 0;
    let isDropActive = false;

    Tone.Transport.scheduleRepeat((time) => {
        const energy = getEnergy();
        const stage = getEnergyStage(energy);
        const { bar, beat, sixteenth, currentRoot } = counter;

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
        // KICK - Only on beat (sixteenth === 0)
        // ================================
        if (sixteenth === 0 && time > lastKick + MIN_INTERVAL.KICK) {
            const velocity = stage === 'idle' ? 0.5
                : stage === 'awakening' ? 0.65
                    : stage === 'groove' ? 0.8
                        : stage === 'flow' ? 0.9
                            : 1.0;

            instruments.kick.triggerAttackRelease('C1', '8n', time, velocity);
            lastKick = time;

            // Sidechain (only if not idle)
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

        // ================================
        // BASS - Simplified patterns
        // ================================
        if (time > lastBass + MIN_INTERVAL.BASS) {
            let shouldTriggerBass = false;
            let bassDuration = '4n';
            let bassVelocity = 0.6;

            if (stage === 'idle') {
                // Long bass on bar start only
                if (beat === 0 && sixteenth === 0) {
                    shouldTriggerBass = true;
                    bassDuration = '1n';
                    bassVelocity = 0.5;
                }
            } else if (stage === 'awakening') {
                // Half notes
                if (beat === 0 && sixteenth === 0) {
                    shouldTriggerBass = true;
                    bassDuration = '2n';
                    bassVelocity = 0.6;
                }
            } else if (stage === 'groove' || stage === 'flow') {
                // Offbeat (on the "and")
                if (sixteenth === 2) {
                    shouldTriggerBass = true;
                    bassDuration = '8n';
                    bassVelocity = 0.75;
                }
            } else if (stage === 'euphoria') {
                // 8th notes
                if (sixteenth === 0 || sixteenth === 2) {
                    shouldTriggerBass = true;
                    bassDuration = '8n';
                    bassVelocity = 0.9;
                }
            }

            if (shouldTriggerBass) {
                instruments.bass.triggerAttackRelease(currentRoot, bassDuration, time + 0.002, bassVelocity);
                lastBass = time;
            }
        }

        // ================================
        // HI-HAT - Very sparse, only on even 16ths
        // ================================
        if (sixteenth % 2 === 0 && time > lastHihat + MIN_INTERVAL.HIHAT) {
            let hihatVelocity = 0;

            if (stage === 'idle') {
                hihatVelocity = 0.1;
            } else if (stage === 'awakening') {
                hihatVelocity = 0.25;
            } else if (stage === 'groove') {
                hihatVelocity = 0.4;
            } else if (stage === 'flow') {
                hihatVelocity = 0.5;
            } else {
                hihatVelocity = 0.6;
            }

            if (hihatVelocity > 0) {
                instruments.hihat.triggerAttackRelease('32n', time + 0.004, hihatVelocity);
                lastHihat = time;
            }
        }

        // ================================
        // SNARE - Only on 2 and 4, groove+ only
        // ================================
        if ((beat === 1 || beat === 3) && sixteenth === 0 && time > lastSnare + MIN_INTERVAL.SNARE) {
            if (stage === 'groove' || stage === 'flow' || stage === 'euphoria') {
                const snareVelocity = stage === 'groove' ? 0.5 : stage === 'flow' ? 0.7 : 0.85;
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
    if (Tone.Transport.state !== 'started') return CHORD_ROOTS[0];
    const barNum = Math.floor(Tone.Transport.ticks / (Tone.Transport.PPQ * 4));
    const chordIndex = Math.floor(barNum / 4) % CHORD_ROOTS.length;
    return CHORD_ROOTS[chordIndex];
}
