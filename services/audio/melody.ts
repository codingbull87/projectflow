import * as Tone from 'tone';
import { Instruments, updateLeadTimbre } from './instruments';
import {
    ENERGY_THRESHOLD_AWAKENING,
    ENERGY_THRESHOLD_GROOVE,
    ENERGY_THRESHOLD_FLOW,
    ENERGY_THRESHOLD_EUPHORIA,
    SCALE_IDLE,
    SCALE_AWAKENING,
    SCALE_GROOVE,
    SCALE_FLOW,
    SCALE_EUPHORIA
} from '../../constants';

/**
 * Melody Module - DISCO STAB Style
 * Optimized for fast tapping with punchy, weighty sound
 * Key: A Minor Natural
 */

// Chord progression in A Minor (classic EDM: Am - F - C - G)
const CHORD_SCALES = [
    ['A', 'C', 'E'],           // Am (i)
    ['F', 'A', 'C'],           // F  (VI)
    ['C', 'E', 'G'],           // C  (III)
    ['G', 'B', 'D']            // G  (VII)
];

// Faster response for Mikutap-style tapping
let lastMelodyTime = 0;
const MIN_MELODY_INTERVAL = 0.06; // 60ms - faster than before

type EnergyStage = 'idle' | 'awakening' | 'groove' | 'flow' | 'euphoria';

function getEnergyStage(energy: number): EnergyStage {
    if (energy >= ENERGY_THRESHOLD_EUPHORIA) return 'euphoria';
    if (energy >= ENERGY_THRESHOLD_FLOW) return 'flow';
    if (energy >= ENERGY_THRESHOLD_GROOVE) return 'groove';
    if (energy >= ENERGY_THRESHOLD_AWAKENING) return 'awakening';
    return 'idle';
}

function getScaleForStage(stage: EnergyStage): string[] {
    switch (stage) {
        case 'idle': return SCALE_IDLE;
        case 'awakening': return SCALE_AWAKENING;
        case 'groove': return SCALE_GROOVE;
        case 'flow': return SCALE_FLOW;
        case 'euphoria': return SCALE_EUPHORIA;
    }
}

function getCurrentChordIndex(): number {
    if (Tone.Transport.state !== 'started') return 0;
    const barNum = Math.floor(Tone.Transport.ticks / (Tone.Transport.PPQ * 4));
    return Math.floor(barNum / 4) % CHORD_SCALES.length;
}

function getContextualNotes(stageScale: string[], chordIndex: number): string[] {
    const chordNotes = CHORD_SCALES[chordIndex];
    const filtered = stageScale.filter(note => {
        const noteName = note.replace(/\d+/g, '');
        return chordNotes.includes(noteName);
    });
    return filtered.length > 0 ? filtered : stageScale;
}

/**
 * Keyboard to Note Mapping
 * Row 1 (q-p): Octave 3-4 (mid-high, bright)
 * Row 2 (a-l): Octave 2-3 (mid, main area) 
 * Row 3 (z-m): Octave 1-2 (low bass, weight)
 * 
 * Uses A Minor Natural: A, B, C, D, E, F, G
 * Contains tension intervals: B-C (semitone), E-F (semitone)
 */
const KEYBOARD_MAP: Record<string, string> = {
    // Row 1: q w e r t y u i o p (Octave 3-4 - bright, energetic)
    'q': 'A3', 'w': 'B3', 'e': 'C4', 'r': 'D4', 't': 'E4',
    'y': 'F4', 'u': 'G4', 'i': 'A4', 'o': 'B4', 'p': 'C5',

    // Row 2: a s d f g h j k l (Octave 2-3 - mid range, main)
    'a': 'A2', 's': 'B2', 'd': 'C3', 'f': 'D3', 'g': 'E3',
    'h': 'F3', 'j': 'G3', 'k': 'A3', 'l': 'B3',

    // Row 3: z x c v b n m (Octave 1-2 - bass, heavy)
    'z': 'A1', 'x': 'B1', 'c': 'C2', 'v': 'D2', 'b': 'E2',
    'n': 'F2', 'm': 'G2'
};

/**
 * Get note from key, falling back to random scale note if key not mapped
 */
function getNoteFromKey(key: string | undefined, fallbackScale: string[]): string {
    if (key && KEYBOARD_MAP[key.toLowerCase()]) {
        return KEYBOARD_MAP[key.toLowerCase()];
    }
    // Fallback: random note from scale
    const note = fallbackScale[Math.floor(Math.random() * fallbackScale.length)];
    return note;
}

/**
 * Trigger a quantized melodic note - DISCO STAB Style
 * - Keyboard mapped to specific notes for variety
 * - Lower octaves for weight
 * - Sub layer for low-end support
 */
export function triggerQuantizedNote(
    instruments: Instruments,
    energy: number,
    key?: string
) {
    const { lead, subLayer, bellLayer, fmLayer } = instruments;

    if (Tone.Transport.state !== 'started') return;

    // Fast throttle for responsive tapping
    const now = Tone.now();
    if (now - lastMelodyTime < MIN_MELODY_INTERVAL) {
        return;
    }
    lastMelodyTime = now;

    const stage = getEnergyStage(energy);
    const stageScale = getScaleForStage(stage);
    const chordIndex = getCurrentChordIndex();
    const availableNotes = getContextualNotes(stageScale, chordIndex);

    // Get note from keyboard mapping, or fallback to random
    const mappedNote = getNoteFromKey(key, availableNotes);
    const noteName = mappedNote.replace(/\d+/g, '');
    const noteOctave = parseInt(mappedNote.match(/\d+/)?.[0] || '3');

    // Calculate quantized time
    const triggerTime = Tone.Transport.nextSubdivision('16n');

    // Duration shortens as energy increases (more punchy)
    const dur = stage === 'idle' ? '4n'
        : stage === 'awakening' ? '8n'
            : '16n';

    // Sub note is always one octave below the main note
    const subOctave = Math.max(1, noteOctave - 1);
    const subNote = noteName + subOctave;

    switch (stage) {
        case 'idle': {
            // Just the mapped note, warm feel
            lead.triggerAttackRelease(mappedNote, dur, triggerTime, 0.5);
            break;
        }

        case 'awakening': {
            // Main note + sub layer
            lead.triggerAttackRelease(mappedNote, dur, triggerTime, 0.6);
            subLayer.triggerAttackRelease(subNote, dur, triggerTime, 0.4);
            break;
        }

        case 'groove': {
            // Punchy stab with sub support
            lead.triggerAttackRelease(mappedNote, dur, triggerTime, 0.75);
            subLayer.triggerAttackRelease(subNote, dur, triggerTime, 0.5);
            break;
        }

        case 'flow': {
            // Chord power: note + fifth, with sub
            const fifth = Tone.Frequency(mappedNote).transpose(7).toNote();

            lead.triggerAttackRelease([mappedNote, fifth], dur, triggerTime, 0.8);
            subLayer.triggerAttackRelease(subNote, dur, triggerTime, 0.55);
            break;
        }

        case 'euphoria': {
            // Maximum impact: chord + sub + optional high sparkle
            const fifth = Tone.Frequency(mappedNote).transpose(7).toNote();

            // Main stab chord
            lead.triggerAttackRelease([mappedNote, fifth], dur, triggerTime, 0.9);

            // Sub layer for weight
            subLayer.triggerAttackRelease(subNote, dur, triggerTime, 0.6);

            // At very high energy, add metallic bite (one octave up)
            if (energy > 0.9) {
                const highNote = noteName + (noteOctave + 1);
                fmLayer.triggerAttackRelease(highNote, '32n', triggerTime, 0.4);
            }
            break;
        }
    }
}

