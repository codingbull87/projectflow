import * as Tone from 'tone';
import {
    ENERGY_THRESHOLD_AWAKENING,
    ENERGY_THRESHOLD_GROOVE,
    ENERGY_THRESHOLD_FLOW,
    ENERGY_THRESHOLD_EUPHORIA
} from '../../constants';

/**
 * Effects Module
 * Based on Flow State principle: Effect complexity increases with energy
 * 
 * Recovery transitions: Effects don't "get worse", they "soften"
 * - Peak → Flow: Distortion decreases, but Reverb stays (dreamy)
 * - Flow → Groove: Brightness dims, but warmth increases
 */

export interface Effects {
    // Core Effects
    reverb: Tone.Reverb;
    delay: Tone.PingPongDelay;

    // Lead Effect Chain
    leadFilter: Tone.Filter;
    sidechainNode: Tone.Volume;
    chorus: Tone.Chorus;
    phaser: Tone.Phaser;
    bitCrusher: Tone.BitCrusher;
    leadDistortion: Tone.Distortion;

    // Bass Effects
    bassDistort: Tone.Distortion;
}

/**
 * Create and configure all effects
 */
export function createEffects(limiter: Tone.Limiter): Effects {
    // --- Common Effects ---
    // Deep reverb for space (important even in Idle for atmosphere)
    const reverb = new Tone.Reverb({
        decay: 6,
        wet: 0.4
    }).connect(limiter);

    const delay = new Tone.PingPongDelay('8n.', 0.25).connect(limiter);

    // --- Lead Effect Chain ---
    // Signal Flow: Synths → Filter → BitCrusher → Distortion → Phaser → Chorus → Sidechain → Delay/Reverb

    const sidechainNode = new Tone.Volume(0)
        .connect(delay)
        .connect(reverb);

    const chorus = new Tone.Chorus(4, 2.5, 0.5)
        .connect(sidechainNode)
        .start();

    const phaser = new Tone.Phaser({
        frequency: 0.5,
        octaves: 5,
        baseFrequency: 1000
    }).connect(chorus);

    const leadDistortion = new Tone.Distortion(0).connect(phaser);

    const bitCrusher = new Tone.BitCrusher(8).connect(leadDistortion);
    bitCrusher.wet.value = 0;

    const leadFilter = new Tone.Filter(300, 'lowpass', -24).connect(bitCrusher);

    // --- Bass Effects ---
    const bassDistort = new Tone.Distortion(0).connect(limiter);

    return {
        reverb,
        delay,
        leadFilter,
        sidechainNode,
        chorus,
        phaser,
        bitCrusher,
        leadDistortion,
        bassDistort
    };
}

/**
 * Smoothly interpolate between two values
 */
function lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
}

/**
 * Exponential curve (makes filter sweeps feel more natural)
 */
function expCurve(t: number, power: number = 2.5): number {
    return Math.pow(Math.max(0, Math.min(1, t)), power);
}

/**
 * Update all effect parameters based on energy level
 * 
 * Psychology principles applied:
 * - Idle: Deep, warm, atmospheric (invites slow swaying)
 * - Awakening: Slightly brighter, subtle movement
 * - Groove: Rhythmic feel, chorus for width
 * - Flow: Full spectrum, phaser for movement
 * - Euphoria: Maximum intensity, distortion + crusher
 */
export function updateEffectsForEnergy(
    effects: Effects,
    energy: number,
    time: number
) {
    const {
        leadFilter,
        reverb,
        chorus,
        phaser,
        leadDistortion,
        bitCrusher,
        bassDistort
    } = effects;

    // Determine stage for special handling
    const stage = energy >= ENERGY_THRESHOLD_EUPHORIA ? 'euphoria'
        : energy >= ENERGY_THRESHOLD_FLOW ? 'flow'
            : energy >= ENERGY_THRESHOLD_GROOVE ? 'groove'
                : energy >= ENERGY_THRESHOLD_AWAKENING ? 'awakening'
                    : 'idle';

    // ================================
    // 1. FILTER (Entrainment - Frequency drives body parts)
    // ================================
    // Low freq → large muscles (torso, legs)
    // High freq → small muscles (hands, head)

    // Exponential curve: slow start, fast finish (more aggressive curve)
    const filterProgress = expCurve(energy, 2.5);
    const targetFreq = lerp(200, 12000, filterProgress);
    const targetQ = Math.min(3, energy * 4); // More resonance at high energy

    leadFilter.frequency.setTargetAtTime(targetFreq, time, 0.1);
    leadFilter.Q.setTargetAtTime(targetQ, time, 0.1);

    // ================================
    // 2. REVERB (Space & Atmosphere)
    // ================================
    // Reverb stays present throughout but changes character
    // Idle: Deep, cavernous (space for meditation)
    // High energy: Shorter, tighter (more punch)

    const reverbWet = stage === 'idle' ? 0.45
        : stage === 'awakening' ? 0.40
            : stage === 'groove' ? 0.35
                : stage === 'flow' ? 0.32
                    : 0.28;

    reverb.wet.setTargetAtTime(reverbWet, time, 0.3);

    // ================================
    // 3. CHORUS (Width & Warmth)
    // ================================
    // Starts at Groove - adds stereo width

    let chorusWet = 0;
    if (energy >= ENERGY_THRESHOLD_GROOVE) {
        const progress = (energy - ENERGY_THRESHOLD_GROOVE) / (1 - ENERGY_THRESHOLD_GROOVE);
        chorusWet = lerp(0.15, 0.45, progress);
    }
    chorus.wet.setTargetAtTime(chorusWet, time, 0.25);

    // ================================
    // 4. PHASER (Movement & Shimmer)
    // ================================
    // Starts at Flow - adds modulation movement

    let phaserWet = 0;
    let phaserSpeed = 0.5;

    if (energy >= ENERGY_THRESHOLD_FLOW) {
        const progress = (energy - ENERGY_THRESHOLD_FLOW) / (1 - ENERGY_THRESHOLD_FLOW);
        phaserWet = lerp(0.1, 0.35, progress); // Slightly more phaser
        phaserSpeed = 0.5 + (energy * 5); // More dynamic speed range
    }

    phaser.wet.setTargetAtTime(phaserWet, time, 0.2);
    phaser.frequency.setTargetAtTime(phaserSpeed, time, 0.5);

    // ================================
    // 5. DISTORTION (Intensity & Edge)
    // ================================
    // Starts at Euphoria - adds grit and edge

    // Distortion starts at Peak (0.75 threshold) - more aggressive
    let leadDist = 0;
    if (energy >= 0.75) {
        leadDist = Math.min(0.2, (energy - 0.75) * 1); // Max 0.2, subtle grit
    }
    leadDistortion.distortion = leadDist;

    // ================================
    // 6. BITCRUSHER (Ultra Intensity)
    // ================================
    // Only at high Euphoria (0.9+) for extreme degradation

    // BitCrusher at Ultra (0.9+) - more aggressive degradation
    const crushWet = energy > 0.9
        ? Math.min(0.4, (energy - 0.9) * 4) // Max 0.4 wet
        : 0;
    bitCrusher.wet.setTargetAtTime(crushWet, time, 0.1);

    // ================================
    // 7. BASS DISTORTION
    // ================================
    // Adds weight and punch at higher energies

    let bassDist = 0;
    if (energy >= ENERGY_THRESHOLD_FLOW) {
        const progress = (energy - ENERGY_THRESHOLD_FLOW) / (1 - ENERGY_THRESHOLD_FLOW);
        bassDist = lerp(0, 0.35, progress);
    }
    bassDistort.distortion = bassDist;
}

/**
 * Update volume levels for rhythm elements
 * Based on Entrainment: Hi-hats provide "air", Snare provides backbeat
 */
export function updateRhythmVolumes(
    hihatVolume: Tone.Volume,
    snareVolume: Tone.Volume,
    energy: number,
    time: number
) {
    // Hi-hat: Present from Idle (barely audible) to Euphoria (prominent)
    // Provides continuous "air" that invites micro-movements
    let hihatDb = -30; // Base level even in idle (barely audible)

    if (energy >= ENERGY_THRESHOLD_AWAKENING) {
        const progress = (energy - ENERGY_THRESHOLD_AWAKENING) / (1 - ENERGY_THRESHOLD_AWAKENING);
        hihatDb = lerp(-18, -6, progress);
    }
    hihatVolume.volume.setTargetAtTime(hihatDb, time, 0.15);

    // Snare: Comes in at Groove for backbeat
    let snareDb = -80;
    if (energy >= ENERGY_THRESHOLD_GROOVE) {
        const progress = (energy - ENERGY_THRESHOLD_GROOVE) / (1 - ENERGY_THRESHOLD_GROOVE);
        snareDb = lerp(-12, -4, progress);
    }
    snareVolume.volume.setTargetAtTime(snareDb, time, 0.15);
}

/**
 * Apply sidechain compression effect
 * Moved to rhythm.ts for tighter timing control
 */
export function applySidechain(
    sidechainNode: Tone.Volume,
    energy: number,
    time: number
) {
    // Only active above Awakening threshold
    if (energy < ENERGY_THRESHOLD_AWAKENING) return;

    // Depth and speed scale with energy
    const depthProgress = (energy - ENERGY_THRESHOLD_AWAKENING) / (1 - ENERGY_THRESHOLD_AWAKENING);
    const depth = lerp(-8, -45, depthProgress);
    const recovery = lerp(0.1, 0.04, depthProgress);

    sidechainNode.volume.cancelScheduledValues(time);
    sidechainNode.volume.setValueAtTime(depth, time);
    sidechainNode.volume.setTargetAtTime(0, time, recovery);
}
