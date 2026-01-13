import * as Tone from 'tone';
import { Instruments } from './instruments';
import { getStyleDirector } from './styleDirector';
import {
    ENERGY_THRESHOLD_AWAKENING,
    ENERGY_THRESHOLD_GROOVE,
    ENERGY_THRESHOLD_FLOW,
    ENERGY_THRESHOLD_EUPHORIA
} from '../../constants';

/**
 * Melody Module - Now integrated with StyleDirector
 * 
 * KEY CHANGES:
 * 1. Scale/chords come from current style
 * 2. Keyboard mapping dynamically adjusts to current key
 * 3. Contextual notes filter based on current chord
 */

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

/**
 * Dynamic keyboard mapping based on current style's scale
 * 
 * Row 1 (q-p): High octave (bright)
 * Row 2 (a-l): Mid octave (main)
 * Row 3 (z-m): Low octave (bass)
 */
function buildKeyboardMap(scale: string[]): Record<string, string> {
    const map: Record<string, string> = {};

    // Row 1: q w e r t y u i o p (10 keys, octave 3-4)
    const row1Keys = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'];
    // Row 2: a s d f g h j k l (9 keys, octave 2-3)
    const row2Keys = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'];
    // Row 3: z x c v b n m (7 keys, octave 1-2)
    const row3Keys = ['z', 'x', 'c', 'v', 'b', 'n', 'm'];

    // Build scale with octaves
    const scaleLen = scale.length;

    // Row 1: Octave 3-4 (bright, energetic)
    row1Keys.forEach((key, i) => {
        const noteIndex = i % scaleLen;
        const octave = i < scaleLen ? 3 : 4;
        map[key] = scale[noteIndex] + octave;
    });

    // Row 2: Octave 2-3 (mid range)
    row2Keys.forEach((key, i) => {
        const noteIndex = i % scaleLen;
        const octave = i < scaleLen ? 2 : 3;
        map[key] = scale[noteIndex] + octave;
    });

    // Row 3: Octave 1-2 (bass)
    row3Keys.forEach((key, i) => {
        const noteIndex = i % scaleLen;
        const octave = i < scaleLen ? 1 : 2;
        map[key] = scale[noteIndex] + octave;
    });

    return map;
}

/**
 * Get contextual notes that fit the current chord
 */
function getContextualNotes(stageScale: string[], chordNotes: string[]): string[] {
    const filtered = stageScale.filter(note => {
        const noteName = note.replace(/\d+/g, '');
        return chordNotes.includes(noteName);
    });
    return filtered.length > 0 ? filtered : stageScale;
}

/**
 * Get note from key, with dynamic style-based mapping
 */
function getNoteFromKey(key: string | undefined, scale: string[], fallbackNotes: string[]): string {
    if (key) {
        const keyboardMap = buildKeyboardMap(scale);
        const lowerKey = key.toLowerCase();
        if (keyboardMap[lowerKey]) {
            return keyboardMap[lowerKey];
        }
    }
    // Fallback: random note from available notes
    return fallbackNotes[Math.floor(Math.random() * fallbackNotes.length)];
}

/**
 * Trigger a quantized melodic note - Style-aware version
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

    // Get current style info from StyleDirector
    const director = getStyleDirector();
    const currentStyle = director.getCurrentStyle();
    const currentChord = director.getCurrentChord();

    const stage = getEnergyStage(energy);
    const stageScale = director.getScaleForStage(stage);
    const availableNotes = getContextualNotes(stageScale, currentChord.notes);

    // Get note from keyboard mapping (based on current style's scale)
    const mappedNote = getNoteFromKey(key, currentStyle.scale, availableNotes);
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

    // Velocity boost during transitions for excitement
    const transitionBoost = director.isInTransition() ? 1.15 : 1.0;

    switch (stage) {
        case 'idle': {
            lead.triggerAttackRelease(mappedNote, dur, triggerTime, 0.5 * transitionBoost);
            break;
        }

        case 'awakening': {
            lead.triggerAttackRelease(mappedNote, dur, triggerTime, 0.6 * transitionBoost);
            subLayer.triggerAttackRelease(subNote, dur, triggerTime, 0.4);
            break;
        }

        case 'groove': {
            lead.triggerAttackRelease(mappedNote, dur, triggerTime, 0.75 * transitionBoost);
            subLayer.triggerAttackRelease(subNote, dur, triggerTime, 0.5);
            break;
        }

        case 'flow': {
            const fifth = Tone.Frequency(mappedNote).transpose(7).toNote();
            lead.triggerAttackRelease([mappedNote, fifth], dur, triggerTime, 0.8 * transitionBoost);
            subLayer.triggerAttackRelease(subNote, dur, triggerTime, 0.55);
            break;
        }

        case 'euphoria': {
            const fifth = Tone.Frequency(mappedNote).transpose(7).toNote();
            lead.triggerAttackRelease([mappedNote, fifth], dur, triggerTime, 0.9 * transitionBoost);
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
