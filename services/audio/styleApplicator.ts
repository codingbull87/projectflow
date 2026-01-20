import * as Tone from 'tone';
import { Style } from './styles';
import { Instruments } from './instruments';
import { Effects } from './effects';

/**
 * Style Applicator Module
 * 
 * Handles applying style parameters to audio nodes.
 * Separated from StyleDirector for clarity and testability.
 * 
 * Two main functions:
 * 1. Apply style to instruments (waveform, envelope)
 * 2. Apply style to effects (reverb, delay, filter)
 */

export interface InterpolatedStyleValues {
    // Timbre
    leadWaveform: 'fatsquare' | 'fatsawtooth' | 'triangle' | 'sine';
    leadSpread: number;
    leadEnvelope: {
        attack: number;
        decay: number;
        sustain: number;
        release: number;
    };

    // Effects
    reverbWet: number;
    reverbDecay: number;
    delayFeedback: number;
    delayTime: string;
    filterCutoff: number;
    filterResonance: number;

    // Visual
    hueShift: number;
}

/**
 * Get interpolated value during transition
 * For numbers: linear interpolation
 * For non-numbers: switch at 50%
 */
export function interpolateStyleValue<K extends keyof Style>(
    fromStyle: Style,
    toStyle: Style,
    progress: number,
    key: K
): Style[K] {
    const fromVal = fromStyle[key];
    const toVal = toStyle[key];

    // For numbers, interpolate linearly
    if (typeof fromVal === 'number' && typeof toVal === 'number') {
        return (fromVal + (toVal - fromVal) * progress) as Style[K];
    }

    // For non-numbers, switch at 50%
    return progress < 0.5 ? fromVal : toVal;
}

/**
 * Apply style parameters to lead instruments
 * Includes oscillator settings and envelope
 */
export function applyStyleToInstruments(
    instruments: Instruments,
    values: Pick<InterpolatedStyleValues, 'leadWaveform' | 'leadSpread' | 'leadEnvelope'>
): void {
    const { leadWaveform, leadSpread, leadEnvelope } = values;

    // Validate waveform type to prevent runtime errors
    const validWaveforms: Array<'fatsquare' | 'fatsawtooth' | 'triangle' | 'sine'> =
        ['fatsquare', 'fatsawtooth', 'triangle', 'sine'];

    let safeWaveform: 'fatsquare' | 'fatsawtooth' | 'triangle' | 'sine' = leadWaveform;

    if (!validWaveforms.includes(leadWaveform)) {
        console.warn(`[StyleApplicator] Invalid waveform: ${leadWaveform}, using fallback 'fatsquare'`);
        safeWaveform = 'fatsquare';
    }

    try {
        // Apply to main lead synth
        instruments.lead.set({
            oscillator: {
                type: safeWaveform,
                spread: leadSpread
            },
            envelope: {
                attack: leadEnvelope.attack,
                decay: leadEnvelope.decay,
                sustain: leadEnvelope.sustain,
                release: leadEnvelope.release
            }
        });

        // Apply to subLayer with slight modifications for depth
        instruments.subLayer.set({
            envelope: {
                attack: leadEnvelope.attack * 1.2,  // Slightly slower attack
                decay: leadEnvelope.decay * 1.5,
                sustain: leadEnvelope.sustain * 0.8,
                release: leadEnvelope.release * 1.2
            }
        });
    } catch (e) {
        // Ignore errors from rapid parameter changes
        console.warn('[StyleApplicator] Error applying to instruments:', e);
    }
}

/**
 * Apply style parameters to effects chain
 * Uses rampTo for smooth transitions
 */
export function applyStyleToEffects(
    effects: Effects,
    values: Pick<InterpolatedStyleValues, 'reverbWet' | 'reverbDecay' | 'delayFeedback' | 'delayTime' | 'filterCutoff' | 'filterResonance'>
): void {
    const { reverbWet, reverbDecay, delayFeedback, delayTime, filterCutoff, filterResonance } = values;

    try {
        // Reverb - smooth wet transition
        effects.reverb.wet.rampTo(reverbWet, 2);
        effects.reverb.decay = reverbDecay; // Decay is not AudioParam, set directly

        // Delay - smooth feedback transition
        effects.delay.feedback.rampTo(delayFeedback, 2);
        effects.delay.delayTime.value = delayTime; // Time is tricky to ramp

        // Filter - smooth frequency and Q transition
        effects.leadFilter.frequency.rampTo(filterCutoff, 1);
        effects.leadFilter.Q.rampTo(filterResonance, 1);
    } catch (e) {
        console.warn('[StyleApplicator] Error applying to effects:', e);
    }
}

/**
 * Collect all interpolated values from a transition state
 */
export function collectInterpolatedValues(
    fromStyle: Style,
    toStyle: Style,
    progress: number
): InterpolatedStyleValues {
    return {
        leadWaveform: interpolateStyleValue(fromStyle, toStyle, progress, 'leadWaveform'),
        leadSpread: interpolateStyleValue(fromStyle, toStyle, progress, 'leadSpread'),
        leadEnvelope: interpolateStyleValue(fromStyle, toStyle, progress, 'leadEnvelope'),
        reverbWet: interpolateStyleValue(fromStyle, toStyle, progress, 'reverbWet'),
        reverbDecay: interpolateStyleValue(fromStyle, toStyle, progress, 'reverbDecay'),
        delayFeedback: interpolateStyleValue(fromStyle, toStyle, progress, 'delayFeedback'),
        delayTime: interpolateStyleValue(fromStyle, toStyle, progress, 'delayTime'),
        filterCutoff: interpolateStyleValue(fromStyle, toStyle, progress, 'filterCutoff'),
        filterResonance: interpolateStyleValue(fromStyle, toStyle, progress, 'filterResonance'),
        hueShift: interpolateStyleValue(fromStyle, toStyle, progress, 'hueShift')
    };
}

/**
 * Get values from a single style (no interpolation)
 */
export function getStyleValues(style: Style): InterpolatedStyleValues {
    return {
        leadWaveform: style.leadWaveform,
        leadSpread: style.leadSpread,
        leadEnvelope: style.leadEnvelope,
        reverbWet: style.reverbWet,
        reverbDecay: style.reverbDecay,
        delayFeedback: style.delayFeedback,
        delayTime: style.delayTime,
        filterCutoff: style.filterCutoff,
        filterResonance: style.filterResonance,
        hueShift: style.hueShift
    };
}
