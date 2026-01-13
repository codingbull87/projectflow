/**
 * Styles Module - Music Style Definitions
 * 
 * Each style defines a complete musical "flavor":
 * - Key & Scale (harmonic foundation)
 * - Chord Progression (harmonic movement)
 * - Timbre Parameters (sonic character)
 * - Rhythm Feel (groove character)
 * 
 * All styles are designed to be harmonically compatible
 * for seamless transitions (Am ↔ Em ↔ Dm circle)
 */

export interface Style {
    id: string;
    name: string;

    // === Harmonic Parameters ===
    key: string;                    // Root note: 'A', 'E', 'D'
    mode: 'minor' | 'major';        // Scale mode
    scale: string[];                // Available notes in scale

    // Chord progression (4 chords, each lasting 4 bars)
    chordProgression: {
        name: string;               // 'Am', 'F', etc.
        root: string;               // Bass note with octave: 'A2'
        notes: string[];            // Chord tones: ['A', 'C', 'E']
    }[];

    // === Timbre Parameters ===
    leadWaveform: 'fatsquare' | 'fatsawtooth' | 'triangle' | 'sine';
    leadSpread: number;             // Detuning spread (0-50)
    filterCutoff: number;           // Base filter frequency (200-8000)
    filterResonance: number;        // Q factor (0-10)

    // === Lead Envelope (Note Shape) ===
    // Each style has unique "feel" - plucky, stabby, soft, sharp
    leadEnvelope: {
        attack: number;             // 0.001 (instant) to 0.3 (soft)
        decay: number;              // 0.05 to 0.5
        sustain: number;            // 0 (stab) to 0.5 (pad-like)
        release: number;            // 0.1 to 0.5
    };

    // === Rhythm Feel ===
    kickStyle: 'soft' | 'punchy' | 'hard';
    bassOctave: number;             // 1 or 2
    hihatStyle: 'closed' | 'open' | 'mixed';
    swingAmount: number;            // 0 = straight, 0.1 = subtle swing

    // === Rhythm Patterns (16 steps) ===
    patterns: {
        kick: number[];      // 1 = trigger, 0 = silent
        bass: number[];      // 1 = trigger
        hihat: number[];     // 0-1 velocity
        snare: number[];     // 1 = trigger
    };

    // === Atmosphere ===
    reverbDecay: number;            // 1-5 seconds
    reverbWet: number;              // 0-1
    delayTime: string;              // '8n', '4n', etc.
    delayFeedback: number;          // 0-0.8

    // === Color Hint (for visuals) ===
    hueShift: number;               // -30 to +30 from base color
}

// ============================================
// STYLE DEFINITIONS
// ============================================

/**
 * Style 1: Disco House (A Minor)
 * Warm, groovy, classic house feel
 * Chord: Am - F - C - G (i - VI - III - VII)
 */
const DISCO_HOUSE: Style = {
    id: 'disco',
    name: 'Disco House',

    key: 'A',
    mode: 'minor',
    scale: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],

    chordProgression: [
        { name: 'Am', root: 'A1', notes: ['A', 'C', 'E'] },
        { name: 'F', root: 'F1', notes: ['F', 'A', 'C'] },
        { name: 'C', root: 'C2', notes: ['C', 'E', 'G'] },
        { name: 'G', root: 'G1', notes: ['G', 'B', 'D'] }
    ],

    leadWaveform: 'fatsquare',
    leadSpread: 25,
    filterCutoff: 2000,
    filterResonance: 2,

    // Plucky, bouncy - invites grooving
    leadEnvelope: {
        attack: 0.01,
        decay: 0.15,
        sustain: 0.2,
        release: 0.25
    },

    // Classic 4-on-the-floor
    patterns: {
        kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
        bass: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0], // Offbeat bass
        hihat: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1], // Offbeat open hat feel
        snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0]  // Standard 2 & 4
    },

    kickStyle: 'punchy',
    bassOctave: 1,
    hihatStyle: 'closed',
    swingAmount: 0.02,

    reverbDecay: 2.5,
    reverbWet: 0.25,
    delayTime: '8n',
    delayFeedback: 0.2,

    hueShift: 0
};

/**
 * Style 2: Uplifting Trance (E Minor)
 * Bright, euphoric, driving energy
 * Chord: Em - C - G - D (i - VI - III - VII in Em)
 */
const UPLIFTING_TRANCE: Style = {
    id: 'trance',
    name: 'Uplifting Trance',

    key: 'E',
    mode: 'minor',
    scale: ['E', 'F#', 'G', 'A', 'B', 'C', 'D'],

    chordProgression: [
        { name: 'Em', root: 'E1', notes: ['E', 'G', 'B'] },
        { name: 'C', root: 'C2', notes: ['C', 'E', 'G'] },
        { name: 'G', root: 'G1', notes: ['G', 'B', 'D'] },
        { name: 'D', root: 'D2', notes: ['D', 'F#', 'A'] }
    ],

    leadWaveform: 'fatsawtooth',
    leadSpread: 35,
    filterCutoff: 3500,
    filterResonance: 4,

    // Sharp stab - instant attack, no sustain, euphoric
    leadEnvelope: {
        attack: 0.001,
        decay: 0.08,
        sustain: 0,
        release: 0.15
    },

    // Driving, energetic
    patterns: {
        kick: [1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 1], // With ghost kicks
        bass: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // Rolling 16ths
        hihat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], // 8ths
        snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0]
    },

    kickStyle: 'hard',
    bassOctave: 1,
    hihatStyle: 'open',
    swingAmount: 0,

    reverbDecay: 3.5,
    reverbWet: 0.35,
    delayTime: '4n',
    delayFeedback: 0.35,

    hueShift: -40  // Shift towards cyan/blue
};

/**
 * Style 3: Deep House (D Minor)
 * Dark, hypnotic, bass-heavy
 * Chord: Dm - Bb - F - C (i - VI - III - VII in Dm)
 */
const DEEP_HOUSE: Style = {
    id: 'deep',
    name: 'Deep House',

    key: 'D',
    mode: 'minor',
    scale: ['D', 'E', 'F', 'G', 'A', 'Bb', 'C'],

    chordProgression: [
        { name: 'Dm', root: 'D1', notes: ['D', 'F', 'A'] },
        { name: 'Bb', root: 'Bb1', notes: ['Bb', 'D', 'F'] },
        { name: 'F', root: 'F1', notes: ['F', 'A', 'C'] },
        { name: 'C', root: 'C2', notes: ['C', 'E', 'G'] }
    ],

    leadWaveform: 'triangle',
    leadSpread: 15,
    filterCutoff: 1200,
    filterResonance: 6,

    // Soft, dreamy - slow attack, pad-like
    leadEnvelope: {
        attack: 0.08,
        decay: 0.3,
        sustain: 0.4,
        release: 0.5
    },

    // Syncopated, minimalist
    patterns: {
        kick: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0], // Broken beat
        bass: [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], // Sparse, syncopated
        hihat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // 16th shaker feel
        snare: [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0]  // Ghost snares
    },

    kickStyle: 'soft',
    bassOctave: 1,
    hihatStyle: 'closed',
    swingAmount: 0.05,

    reverbDecay: 4,
    reverbWet: 0.4,
    delayTime: '8n.',
    delayFeedback: 0.45,

    hueShift: 30  // Shift towards warm purple/magenta
};

/**
 * Style 4: Nu Disco (C Major)
 * Bright, funky, retro-modern feel
 * Chord: C - Am - F - G (I - vi - IV - V)
 * The ONLY major key style - provides contrast and "brightness burst"
 */
const NU_DISCO: Style = {
    id: 'nudisco',
    name: 'Nu Disco',

    key: 'C',
    mode: 'major',
    scale: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],

    chordProgression: [
        { name: 'C', root: 'C2', notes: ['C', 'E', 'G'] },
        { name: 'Am', root: 'A1', notes: ['A', 'C', 'E'] },
        { name: 'F', root: 'F1', notes: ['F', 'A', 'C'] },
        { name: 'G', root: 'G1', notes: ['G', 'B', 'D'] }
    ],

    leadWaveform: 'fatsawtooth',
    leadSpread: 30,
    filterCutoff: 4000,  // Bright!
    filterResonance: 3,

    // Funky stab - quick attack, short decay, groovy
    leadEnvelope: {
        attack: 0.005,
        decay: 0.1,
        sustain: 0.1,
        release: 0.2
    },

    // Funky, groovy offbeats
    patterns: {
        kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], // Solid 4-on-the-floor
        bass: [1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0], // Funky walking bass
        hihat: [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1], // Disco shuffle
        snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0]  // Classic 2 & 4
    },

    kickStyle: 'punchy',
    bassOctave: 2,  // Higher bass for funky feel
    hihatStyle: 'open',
    swingAmount: 0.03,  // Slight groove

    reverbDecay: 2,
    reverbWet: 0.2,  // Drier for clarity
    delayTime: '8n',
    delayFeedback: 0.25,

    hueShift: -60  // Shift towards bright cyan/blue-green (happy, bright)
};

/**
 * Style 5: Tech House (G Minor)
 * Cold, minimal, industrial groove
 * Chord: Gm - Eb - Bb - F (i - VI - III - VII in Gm)
 * Stripped-down, hypnotic, dark
 */
const TECH_HOUSE: Style = {
    id: 'tech',
    name: 'Tech House',

    key: 'G',
    mode: 'minor',
    scale: ['G', 'A', 'Bb', 'C', 'D', 'Eb', 'F'],

    chordProgression: [
        { name: 'Gm', root: 'G1', notes: ['G', 'Bb', 'D'] },
        { name: 'Eb', root: 'Eb1', notes: ['Eb', 'G', 'Bb'] },
        { name: 'Bb', root: 'Bb1', notes: ['Bb', 'D', 'F'] },
        { name: 'F', root: 'F1', notes: ['F', 'A', 'C'] }
    ],

    leadWaveform: 'fatsquare',
    leadSpread: 10,  // Tighter, more focused
    filterCutoff: 800,  // Dark, filtered
    filterResonance: 8,  // High resonance for acid-y feel

    // Sharp blade - instant attack, zero sustain, clinical
    leadEnvelope: {
        attack: 0.001,
        decay: 0.05,
        sustain: 0,
        release: 0.1
    },

    // Minimal, hypnotic
    patterns: {
        kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], // Straight 4
        bass: [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0], // Minimal bass stabs
        hihat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0], // Sparse offbeat hat
        snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0]  // Syncopated claps
    },

    kickStyle: 'hard',
    bassOctave: 1,
    hihatStyle: 'closed',
    swingAmount: 0,  // Dead straight

    reverbDecay: 1.5,  // Short, industrial
    reverbWet: 0.15,
    delayTime: '16n',  // Fast delay for texture
    delayFeedback: 0.3,

    hueShift: 50  // Shift towards yellow/orange (industrial warmth)
};

// ============================================
// STYLE POOL & TRANSITIONS
// ============================================

export const STYLES: Style[] = [DISCO_HOUSE, UPLIFTING_TRANCE, DEEP_HOUSE, NU_DISCO, TECH_HOUSE];

/**
 * Get a style by ID
 */
export function getStyleById(id: string): Style | undefined {
    return STYLES.find(s => s.id === id);
}

/**
 * Get a random next style (excluding current)
 */
export function getRandomNextStyle(currentId: string): Style {
    const available = STYLES.filter(s => s.id !== currentId);
    return available[Math.floor(Math.random() * available.length)];
}

/**
 * Transition Parameters
 */
export const TRANSITION_CONFIG = {
    // Minimum bars before a transition can occur
    minBarsBeforeTransition: 16,  // ~30 seconds at 128 BPM (1 full chord cycle)

    // Maximum bars before forced transition
    maxBarsBeforeTransition: 32,  // ~60 seconds (keeps experience fresh)

    // Transition duration in bars
    transitionDurationBars: 2,    // 4 seconds crossfade (snappier)

    // Energy drop during transition
    energyDropTarget: 0.55,       // Drop to mid-Flow
    energyDropDuration: 1500,     // 1.5 seconds to drop (quicker)
    energyRecoverDelay: 3000,     // Start recovering after 3 seconds
};

/**
 * Generate scale notes with octaves for a given style and octave range
 */
export function generateScaleWithOctaves(style: Style, minOctave: number, maxOctave: number): string[] {
    const notes: string[] = [];
    for (let oct = minOctave; oct <= maxOctave; oct++) {
        for (const note of style.scale) {
            notes.push(note + oct);
        }
    }
    return notes;
}

/**
 * Get chord notes for current bar position
 */
export function getCurrentChord(style: Style, barNumber: number): { name: string; root: string; notes: string[] } {
    const chordIndex = Math.floor(barNumber / 4) % style.chordProgression.length;
    return style.chordProgression[chordIndex];
}
