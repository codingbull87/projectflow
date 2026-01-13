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
    
    // === Rhythm Feel ===
    kickStyle: 'soft' | 'punchy' | 'hard';
    bassOctave: number;             // 1 or 2
    hihatStyle: 'closed' | 'open' | 'mixed';
    swingAmount: number;            // 0 = straight, 0.1 = subtle swing
    
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
        { name: 'F',  root: 'F1', notes: ['F', 'A', 'C'] },
        { name: 'C',  root: 'C2', notes: ['C', 'E', 'G'] },
        { name: 'G',  root: 'G1', notes: ['G', 'B', 'D'] }
    ],
    
    leadWaveform: 'fatsquare',
    leadSpread: 25,
    filterCutoff: 2000,
    filterResonance: 2,
    
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
        { name: 'C',  root: 'C2', notes: ['C', 'E', 'G'] },
        { name: 'G',  root: 'G1', notes: ['G', 'B', 'D'] },
        { name: 'D',  root: 'D2', notes: ['D', 'F#', 'A'] }
    ],
    
    leadWaveform: 'fatsawtooth',
    leadSpread: 35,
    filterCutoff: 3500,
    filterResonance: 4,
    
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
        { name: 'F',  root: 'F1', notes: ['F', 'A', 'C'] },
        { name: 'C',  root: 'C2', notes: ['C', 'E', 'G'] }
    ],
    
    leadWaveform: 'triangle',
    leadSpread: 15,
    filterCutoff: 1200,
    filterResonance: 6,
    
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

// ============================================
// STYLE POOL & TRANSITIONS
// ============================================

export const STYLES: Style[] = [DISCO_HOUSE, UPLIFTING_TRANCE, DEEP_HOUSE];

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
    minBarsBeforeTransition: 32,  // ~60 seconds at 128 BPM
    
    // Maximum bars before forced transition
    maxBarsBeforeTransition: 64,  // ~2 minutes
    
    // Transition duration in bars
    transitionDurationBars: 4,    // 8 seconds crossfade
    
    // Energy drop during transition
    energyDropTarget: 0.55,       // Drop to mid-Flow
    energyDropDuration: 2000,     // 2 seconds to drop
    energyRecoverDelay: 4000,     // Start recovering after 4 seconds
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
