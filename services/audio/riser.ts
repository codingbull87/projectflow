import * as Tone from 'tone';

/**
 * Riser Module - Pre-transition Build-up Effects
 * 
 * Creates anticipation before style transitions with:
 * 1. Rising noise sweep (filter opens upward)
 * 2. Pitch-bending sine wave
 * 3. Reverberant tail for smoothness
 */

export interface RiserSystem {
    noiseSynth: Tone.NoiseSynth;
    filter: Tone.Filter;
    pitchSynth: Tone.Synth;
    reverb: Tone.Reverb;
    isPlaying: boolean;
}

let riserInstance: RiserSystem | null = null;

/**
 * Create the Riser system
 */
export function createRiserSystem(destination: Tone.ToneAudioNode): RiserSystem {
    // Noise layer with filter for sweep effect
    const filter = new Tone.Filter({
        type: 'lowpass',
        frequency: 200,
        rolloff: -24,
        Q: 4
    });

    const noiseSynth = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: {
            attack: 0.5,
            decay: 0.1,
            sustain: 1,
            release: 0.5
        },
        volume: -18
    });

    // Pitch synth for rising tone
    const pitchSynth = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: {
            attack: 0.3,
            decay: 0.1,
            sustain: 1,
            release: 0.8
        },
        volume: -20
    });

    // Reverb for smoothness
    const reverb = new Tone.Reverb({
        decay: 3,
        wet: 0.5
    }).connect(destination);

    // Connect: Noise -> Filter -> Reverb
    noiseSynth.connect(filter);
    filter.connect(reverb);

    // Pitch synth -> Reverb
    pitchSynth.connect(reverb);

    riserInstance = {
        noiseSynth,
        filter,
        pitchSynth,
        reverb,
        isPlaying: false
    };

    return riserInstance;
}

/**
 * Get the riser instance
 */
export function getRiserSystem(): RiserSystem | null {
    return riserInstance;
}

/**
 * Trigger a riser effect before style transition
 * @param riser - The riser system
 * @param durationSeconds - How long the riser should play (default 2s)
 * @param intensity - 'normal' or 'epic' (for special moments)
 */
export function triggerRiser(
    riser: RiserSystem,
    durationSeconds: number = 2,
    intensity: 'normal' | 'epic' = 'normal'
): void {
    if (riser.isPlaying) return;
    if (Tone.Transport.state !== 'started') return;

    riser.isPlaying = true;
    const now = Tone.now();
    const endTime = now + durationSeconds;

    // --- Noise Sweep ---
    // Start with low filter, sweep up
    const startFreq = intensity === 'epic' ? 100 : 200;
    const endFreq = intensity === 'epic' ? 8000 : 5000;
    const noiseVolume = intensity === 'epic' ? -12 : -18;

    riser.noiseSynth.volume.value = noiseVolume;
    riser.filter.frequency.setValueAtTime(startFreq, now);
    riser.filter.frequency.exponentialRampTo(endFreq, durationSeconds, now);

    // Trigger noise
    riser.noiseSynth.triggerAttack(now);
    riser.noiseSynth.triggerRelease(endTime);

    // --- Rising Pitch Synth ---
    // Glide from low to high
    const startPitch = intensity === 'epic' ? 'C2' : 'E2';
    const endPitchHz = intensity === 'epic' ? 1200 : 800;

    riser.pitchSynth.triggerAttack(startPitch, now);
    riser.pitchSynth.frequency.exponentialRampTo(endPitchHz, durationSeconds * 0.9, now);
    riser.pitchSynth.triggerRelease(endTime - 0.1);

    // Reset state after riser completes
    setTimeout(() => {
        riser.isPlaying = false;
        riser.filter.frequency.value = 200; // Reset filter
    }, durationSeconds * 1000 + 500);
}

/**
 * Trigger an impact sound after transition (optional enhancement)
 */
export function triggerImpact(riser: RiserSystem): void {
    if (Tone.Transport.state !== 'started') return;

    const now = Tone.now();

    // Short, punchy impact using noise
    riser.noiseSynth.volume.value = -8;
    riser.filter.frequency.setValueAtTime(2000, now);
    riser.filter.frequency.exponentialRampTo(100, 0.3, now);

    riser.noiseSynth.triggerAttackRelease(0.15, now);
}

/**
 * Stop any playing riser immediately
 */
export function stopRiser(riser: RiserSystem): void {
    if (!riser.isPlaying) return;

    const now = Tone.now();
    riser.noiseSynth.triggerRelease(now);
    riser.pitchSynth.triggerRelease(now);
    riser.isPlaying = false;
    riser.filter.frequency.value = 200;
}
