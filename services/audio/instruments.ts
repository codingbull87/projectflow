import * as Tone from 'tone';

/**
 * Instruments Module
 * Defines all synthesizers and their configurations
 */

export interface Instruments {
    // Rhythm Section
    kick: Tone.MembraneSynth;
    bass: Tone.MonoSynth;
    hihat: Tone.NoiseSynth;
    snare: Tone.NoiseSynth;

    // Melodic Layers
    lead: Tone.PolySynth;      // Main stab synth
    subLayer: Tone.PolySynth;  // Low octave support (NEW)
    bellLayer: Tone.PolySynth; // High sparkle
    fmLayer: Tone.PolySynth;   // Metallic bite

    // Volume Controls
    hihatVolume: Tone.Volume;
    snareVolume: Tone.Volume;
}

/**
 * Create and configure all instruments
 */
export function createInstruments(): Instruments {
    // --- Rhythm Section ---
    const kick = new Tone.MembraneSynth({
        pitchDecay: 0.06,
        octaves: 8,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 },
        volume: 4
    });

    const bass = new Tone.MonoSynth({
        oscillator: { type: 'square' },
        envelope: { attack: 0.05, decay: 0.3, sustain: 0.6, release: 0.8 },
        filterEnvelope: {
            attack: 0.001,
            decay: 0.5,
            sustain: 0,
            baseFrequency: 40,
            octaves: 4
        }
    });

    // NoiseSynth - VERY short decay to prevent overlap issues
    const hihat = new Tone.NoiseSynth({
        envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.02 }
    });

    const snare = new Tone.NoiseSynth({
        envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.05 }
    });

    // --- Melodic Layers ---

    // Layer 1: Core Lead - DISCO STAB Style (Fat Square for punch)
    const lead = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'fatsquare', count: 3, spread: 25 },
        envelope: {
            attack: 0.001,   // Instant punch
            decay: 0.12,     // Quick fall
            sustain: 0,      // No sustain
            release: 0.15    // Clean cut
        },
        volume: -4
    });
    lead.maxPolyphony = 8; // Support fast tapping

    // Layer 2: Sub Layer - Low octave support (NEW)
    const subLayer = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },  // Pure low-end
        envelope: {
            attack: 0.001,
            decay: 0.15,
            sustain: 0,
            release: 0.2
        },
        volume: -10  // Supportive, not dominant
    });
    subLayer.maxPolyphony = 6;

    // Layer 3: Bell Layer (High sparkle, only at extreme energy)
    const bellLayer = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 3,
        modulationIndex: 8,
        oscillator: { type: 'sine' },
        envelope: {
            attack: 0.001,
            decay: 0.15,
            sustain: 0,
            release: 0.2
        },
        modulation: { type: 'sine' },
        modulationEnvelope: {
            attack: 0.001,
            decay: 0.1,
            sustain: 0,
            release: 0.15
        },
        volume: -14
    });
    bellLayer.maxPolyphony = 4;

    // Layer 4: FM Layer (Metallic bite for peak energy)
    const fmLayer = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 2,
        modulationIndex: 15,
        oscillator: { type: 'square' },
        envelope: {
            attack: 0.001,
            decay: 0.1,
            sustain: 0,
            release: 0.12
        },
        modulation: { type: 'sine' },
        modulationEnvelope: {
            attack: 0.001,
            decay: 0.1,
            sustain: 0,
            release: 0.1
        },
        volume: -12
    });
    fmLayer.maxPolyphony = 4;

    // Volume Controls
    const hihatVolume = new Tone.Volume(-30); // Start audible for idle pulse
    const snareVolume = new Tone.Volume(-80);

    return {
        kick,
        bass,
        hihat,
        snare,
        lead,
        subLayer,
        bellLayer,
        fmLayer,
        hihatVolume,
        snareVolume
    };
}

/**
 * Update lead synth parameters based on energy stage
 * Based on Embodied Cognition: Different timbres invite different movements
 */
export function updateLeadTimbre(
    lead: Tone.PolySynth,
    stage: 'idle' | 'awakening' | 'groove' | 'flow' | 'euphoria'
) {
    switch (stage) {
        case 'idle':
            // Warm, soft triangle - invites slow swaying
            lead.set({
                oscillator: { type: 'triangle' },
                envelope: { attack: 0.4, decay: 0.5, sustain: 0.6, release: 2 }
            });
            break;

        case 'awakening':
            // Slightly brighter, still soft - invites nodding
            lead.set({
                oscillator: { type: 'triangle' },
                envelope: { attack: 0.2, decay: 0.3, sustain: 0.5, release: 1.2 }
            });
            break;

        case 'groove':
            // Fat sawtooth, rhythmic - invites stepping
            lead.set({
                oscillator: { type: 'fatsawtooth', count: 3, spread: 20 },
                envelope: { attack: 0.05, decay: 0.2, sustain: 0.4, release: 0.5 }
            });
            break;

        case 'flow':
            // Brighter, more complex - invites full body dancing
            lead.set({
                oscillator: { type: 'fatsawtooth', count: 3, spread: 30 },
                envelope: { attack: 0.02, decay: 0.15, sustain: 0.3, release: 0.4 }
            });
            break;

        case 'euphoria':
            // Aggressive, percussive - invites jumping, arm waving
            lead.set({
                oscillator: { type: 'fatsawtooth', count: 5, spread: 40 },
                envelope: { attack: 0.001, decay: 0.1, sustain: 0.1, release: 0.2 }
            });
            break;
    }
}

