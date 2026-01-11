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
        // KICK - Density evolves with energy
        // idle: every 2 beats (half-time)
        // awakening/groove: every beat (standard 4/4)
        // flow: every beat
        // euphoria: every beat + extra hits (double-time feel)
        // ================================
        if (time > lastKick + MIN_INTERVAL.KICK) {
            let shouldKick = false;
            let kickVelocity = 0.7;

            if (stage === 'idle') {
                // Half-time: kick only on beat 0 and 2
                if (sixteenth === 0 && (beat === 0 || beat === 2)) {
                    shouldKick = true;
                    kickVelocity = 0.5;
                }
            } else if (stage === 'awakening') {
                // Standard 4/4
                if (sixteenth === 0) {
                    shouldKick = true;
                    kickVelocity = 0.65;
                }
            } else if (stage === 'groove') {
                // Standard 4/4
                if (sixteenth === 0) {
                    shouldKick = true;
                    kickVelocity = 0.8;
                }
            } else if (stage === 'flow') {
                // Standard 4/4 with occasional ghost kick
                if (sixteenth === 0) {
                    shouldKick = true;
                    kickVelocity = 0.9;
                } else if (sixteenth === 2 && beat % 2 === 1) {
                    // Ghost kick on offbeat of beats 1 and 3
                    shouldKick = true;
                    kickVelocity = 0.4;
                }
            } else if (stage === 'euphoria') {
                // Double-time: kick on 1 and 3 of each beat
                if (sixteenth === 0 || sixteenth === 2) {
                    shouldKick = true;
                    kickVelocity = sixteenth === 0 ? 1.0 : 0.7;
                }
            }

            if (shouldKick) {
                instruments.kick.triggerAttackRelease('C1', '8n', time, kickVelocity);
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
        // HI-HAT - Density evolves with energy
        // idle: every beat (4 hits/bar)
        // awakening: every 2 sixteenths (8 hits/bar)
        // groove: every 2 sixteenths (8 hits/bar)
        // flow/euphoria: every sixteenth (16 hits/bar)
        // ================================
        if (time > lastHihat + MIN_INTERVAL.HIHAT) {
            let shouldHihat = false;
            let hihatVelocity = 0;
            let hihatDuration = '32n';

            if (stage === 'idle') {
                // Only on beats (very sparse)
                if (sixteenth === 0) {
                    shouldHihat = true;
                    hihatVelocity = 0.15;
                }
            } else if (stage === 'awakening') {
                // Every 2 sixteenths
                if (sixteenth % 2 === 0) {
                    shouldHihat = true;
                    hihatVelocity = 0.3;
                }
            } else if (stage === 'groove') {
                // Every 2 sixteenths
                if (sixteenth % 2 === 0) {
                    shouldHihat = true;
                    hihatVelocity = 0.45;
                }
            } else if (stage === 'flow') {
                // Every sixteenth (full speed)
                shouldHihat = true;
                hihatVelocity = sixteenth % 2 === 0 ? 0.55 : 0.35; // Accent on beat
            } else if (stage === 'euphoria') {
                // Every sixteenth, louder
                shouldHihat = true;
                hihatVelocity = sixteenth % 2 === 0 ? 0.7 : 0.45;
                // Open hi-hat on 2 and 4
                if ((beat === 1 || beat === 3) && sixteenth === 0) {
                    hihatDuration = '8n';
                    hihatVelocity = 0.8;
                }
            }

            if (shouldHihat && hihatVelocity > 0) {
                instruments.hihat.triggerAttackRelease(hihatDuration, time + 0.004, hihatVelocity);
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
