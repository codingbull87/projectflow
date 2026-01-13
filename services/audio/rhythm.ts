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
        // KICK - Style-aware velocity
        // ================================
        if (time > lastKick + MIN_INTERVAL.KICK) {
            let shouldKick = false;
            let kickVelocity = 0.7;

            // Base velocity modifier from style
            const styleVelocityMod = kickStyle === 'soft' ? 0.8
                : kickStyle === 'punchy' ? 1.0
                    : 1.15; // hard

            if (stage === 'idle') {
                if (sixteenth === 0 && (beat === 0 || beat === 2)) {
                    shouldKick = true;
                    kickVelocity = 0.5 * styleVelocityMod;
                }
            } else if (stage === 'awakening') {
                if (sixteenth === 0) {
                    shouldKick = true;
                    kickVelocity = 0.65 * styleVelocityMod;
                }
            } else if (stage === 'groove') {
                if (sixteenth === 0) {
                    shouldKick = true;
                    kickVelocity = 0.8 * styleVelocityMod;
                }
            } else if (stage === 'flow') {
                if (sixteenth === 0) {
                    shouldKick = true;
                    kickVelocity = 0.9 * styleVelocityMod;
                } else if (sixteenth === 2 && beat % 2 === 1) {
                    shouldKick = true;
                    kickVelocity = 0.4 * styleVelocityMod;
                }
            } else if (stage === 'euphoria') {
                if (sixteenth === 0 || sixteenth === 2) {
                    shouldKick = true;
                    kickVelocity = (sixteenth === 0 ? 1.0 : 0.7) * styleVelocityMod;
                }
            }

            if (shouldKick) {
                instruments.kick.triggerAttackRelease('C1', '8n', time, Math.min(1.5, kickVelocity));
                lastKick = time;

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
        // BASS - Uses style's chord root
        // ================================
        if (time > lastBass + MIN_INTERVAL.BASS) {
            let shouldTriggerBass = false;
            let bassDuration = '4n';
            let bassVelocity = 0.6;

            // Adjust bass octave based on style
            const bassRoot = currentRoot;

            if (stage === 'idle') {
                if (beat === 0 && sixteenth === 0) {
                    shouldTriggerBass = true;
                    bassDuration = '1n';
                    bassVelocity = 0.5;
                }
            } else if (stage === 'awakening') {
                if (beat === 0 && sixteenth === 0) {
                    shouldTriggerBass = true;
                    bassDuration = '2n';
                    bassVelocity = 0.6;
                }
            } else if (stage === 'groove' || stage === 'flow') {
                if (sixteenth === 2) {
                    shouldTriggerBass = true;
                    bassDuration = '8n';
                    bassVelocity = 0.75;
                }
            } else if (stage === 'euphoria') {
                if (sixteenth === 0 || sixteenth === 2) {
                    shouldTriggerBass = true;
                    bassDuration = '8n';
                    bassVelocity = 0.9;
                }
            }

            if (shouldTriggerBass) {
                instruments.bass.triggerAttackRelease(bassRoot, bassDuration, time + 0.002, bassVelocity);
                lastBass = time;
            }
        }

        // ================================
        // HI-HAT - Style-aware density
        // ================================
        if (time > lastHihat + MIN_INTERVAL.HIHAT) {
            let shouldHihat = false;
            let hihatVelocity = 0;
            let hihatDuration = '32n';

            const hihatStyle = currentStyle.hihatStyle;

            if (stage === 'idle') {
                if (sixteenth === 0) {
                    shouldHihat = true;
                    hihatVelocity = 0.15;
                }
            } else if (stage === 'awakening') {
                if (sixteenth % 2 === 0) {
                    shouldHihat = true;
                    hihatVelocity = 0.3;
                }
            } else if (stage === 'groove') {
                if (sixteenth % 2 === 0) {
                    shouldHihat = true;
                    hihatVelocity = 0.45;
                }
            } else if (stage === 'flow') {
                shouldHihat = true;
                hihatVelocity = sixteenth % 2 === 0 ? 0.55 : 0.35;
            } else if (stage === 'euphoria') {
                shouldHihat = true;
                hihatVelocity = sixteenth % 2 === 0 ? 0.7 : 0.45;

                // Open hi-hat on 2 and 4 (style-dependent)
                if ((beat === 1 || beat === 3) && sixteenth === 0) {
                    if (hihatStyle === 'open' || hihatStyle === 'mixed') {
                        hihatDuration = '8n';
                        hihatVelocity = 0.8;
                    }
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
    const director = getStyleDirector();
    return director.getCurrentChord().root;
}
