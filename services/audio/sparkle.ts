import * as Tone from 'tone';

/**
 * Sparkle Module
 * Creates magical "surprise" sounds that make the music feel alive
 * Based on Dopamine Release principle
 * 
 * IMPORTANT: Reduced polyphony and simplified timing to avoid scheduling conflicts
 */

export interface SparkleSystem {
    bellSynth: Tone.PolySynth;
    sparkleReverb: Tone.Reverb;
}

// Sparkle note options (single notes for simplicity)
const SPARKLE_NOTES = ['C5', 'E5', 'G5', 'C6', 'E6', 'G6'];

// Throttle sparkle triggers
let lastSparkleTime = 0;
const MIN_SPARKLE_INTERVAL = 0.2; // 200ms minimum between sparkles

/**
 * Create the Sparkle sound system
 */
export function createSparkleSystem(destination: Tone.ToneAudioNode): SparkleSystem {
    // Dedicated reverb for sparkles (dreamy tail)
    const sparkleReverb = new Tone.Reverb({
        decay: 3,
        wet: 0.6
    }).connect(destination);

    // Simple bell synth with limited polyphony
    const bellSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: {
            attack: 0.001,
            decay: 0.3,
            sustain: 0,
            release: 1.0
        },
        volume: -6
    });

    // Limit voices
    bellSynth.maxPolyphony = 4;
    bellSynth.connect(sparkleReverb);

    return {
        bellSynth,
        sparkleReverb
    };
}

/**
 * Trigger a sparkle effect
 * Simplified to avoid polyphony and timing issues
 */
export function triggerSparkle(
    sparkle: SparkleSystem,
    intensity: 'low' | 'medium' | 'high' = 'medium'
) {
    if (Tone.Transport.state !== 'started') return;

    // Throttle
    const now = Tone.now();
    if (now - lastSparkleTime < MIN_SPARKLE_INTERVAL) {
        return;
    }
    lastSparkleTime = now;

    // Use Tone.now() + small offset instead of nextSubdivision for immediate feel
    const triggerTime = now + 0.01;

    // Random note
    const note = SPARKLE_NOTES[Math.floor(Math.random() * SPARKLE_NOTES.length)];

    switch (intensity) {
        case 'low':
            // Single soft bell
            sparkle.bellSynth.triggerAttackRelease(note, '8n', triggerTime, 0.4);
            break;

        case 'medium':
            // Two notes (arpeggio feel)
            sparkle.bellSynth.triggerAttackRelease(note, '8n', triggerTime, 0.6);
            const note2 = SPARKLE_NOTES[Math.floor(Math.random() * SPARKLE_NOTES.length)];
            sparkle.bellSynth.triggerAttackRelease(note2, '16n', triggerTime + 0.08, 0.5);
            break;

        case 'high':
            // Quick arpeggio (3 notes with safe timing)
            sparkle.bellSynth.triggerAttackRelease(note, '8n', triggerTime, 0.7);
            sparkle.bellSynth.triggerAttackRelease(
                SPARKLE_NOTES[(SPARKLE_NOTES.indexOf(note) + 1) % SPARKLE_NOTES.length],
                '16n',
                triggerTime + 0.06,
                0.6
            );
            sparkle.bellSynth.triggerAttackRelease(
                SPARKLE_NOTES[(SPARKLE_NOTES.indexOf(note) + 2) % SPARKLE_NOTES.length],
                '16n',
                triggerTime + 0.12,
                0.5
            );
            break;
    }
}

/**
 * Background sparkle check
 * Called from rhythm loop to add "life" to the music
 */
export function checkBackgroundSparkle(
    sparkle: SparkleSystem,
    barNumber: number,
    intervalBars: number,
    chance: number
): boolean {
    // Only check at specified bar intervals
    if (barNumber % intervalBars !== 0) return false;

    // Random chance
    if (Math.random() > chance) return false;

    // Trigger a subtle sparkle
    triggerSparkle(sparkle, 'low');
    return true;
}
