import * as Tone from 'tone';
import { Instruments } from './instruments';
import { Style } from './styles';

/**
 * Rhythm Triggers Module
 * 
 * Separated instrument trigger logic for better maintainability.
 * Each function handles one instrument's decision logic:
 * - Whether to trigger based on energy stage
 * - What velocity/duration to use
 * - Style-specific variations
 */

export type EnergyStage = 'idle' | 'awakening' | 'groove' | 'flow' | 'euphoria';

export interface TriggerContext {
    time: number;
    stepIndex: number;          // 0-15 for pattern indexing
    beat: number;               // 0-3
    energy: number;
    stage: EnergyStage;
    currentStyle: Style;
    currentRoot: string;        // Bass root note
}

export interface TriggerResult {
    shouldTrigger: boolean;
    velocity?: number;
    duration?: string;
    note?: string;
}

// ============================================
// KICK TRIGGER LOGIC
// ============================================

export function processKickTrigger(
    ctx: TriggerContext,
    patternValue: number
): TriggerResult {
    if (patternValue <= 0) {
        return { shouldTrigger: false };
    }

    const { stepIndex, stage, energy, currentStyle } = ctx;
    const kickStyle = currentStyle.kickStyle;

    // Base velocity from style settings
    const styleVelocityMod = kickStyle === 'soft' ? 0.8
        : kickStyle === 'punchy' ? 1.0
            : 1.15;

    let shouldKick = false;
    let kickVelocity = 0.7;

    // Energy Masking:
    // Low energy = filter out some pattern hits to keep it sparse
    if (stage === 'idle') {
        // Idle: only allow kicks on beats 1 and 3 (index 0, 8)
        if (stepIndex === 0 || stepIndex === 8) {
            shouldKick = true;
            kickVelocity = 0.5;
        }
    } else if (stage === 'awakening') {
        // Awakening: allow beats 1, 2, 3, 4 (quarters)
        if (stepIndex % 4 === 0) {
            shouldKick = true;
            kickVelocity = 0.6;
        }
    } else {
        // Groove/Flow/Euphoria: Full pattern
        shouldKick = true;
        // Scale velocity with energy
        kickVelocity = 0.7 + (energy * 0.3);
    }

    if (shouldKick) {
        const finalVel = Math.min(1.5, kickVelocity * styleVelocityMod);
        return {
            shouldTrigger: true,
            velocity: finalVel,
            duration: '8n',
            note: 'C1'
        };
    }

    return { shouldTrigger: false };
}

/**
 * Apply sidechain ducking effect after kick
 */
export function applySidechainDuck(
    sidechainNode: Tone.Volume,
    stage: EnergyStage,
    time: number
): void {
    if (stage === 'idle') return;

    const depth = stage === 'awakening' ? -6
        : stage === 'groove' ? -12
            : stage === 'flow' ? -20
                : -30;

    sidechainNode.volume.cancelScheduledValues(time);
    sidechainNode.volume.setValueAtTime(depth, time);
    sidechainNode.volume.setTargetAtTime(0, time, 0.06);
}

// ============================================
// BASS TRIGGER LOGIC
// ============================================

export function processBassTrigger(
    ctx: TriggerContext,
    patternValue: number
): TriggerResult {
    if (patternValue <= 0) {
        return { shouldTrigger: false };
    }

    const { stepIndex, beat, stage, energy, currentStyle, currentRoot } = ctx;

    let shouldTriggerBass = false;
    let bassDuration = '8n';
    let bassVelocity = 0.6;

    if (stage === 'idle') {
        // Idle: only root notes on bar start
        if (stepIndex === 0 && beat === 0) {
            shouldTriggerBass = true;
            bassDuration = '1n';
            bassVelocity = 0.5;
        }
    } else if (stage === 'awakening') {
        // Awakening: simplified pattern (only downbeats)
        if (stepIndex % 4 === 0) {
            shouldTriggerBass = true;
            bassDuration = '4n';
        }
    } else {
        // Full pattern for Groove+
        shouldTriggerBass = true;
        bassVelocity = 0.6 + (energy * 0.3);
        // Adjust duration based on density
        if (currentStyle.id === 'trance') bassDuration = '16n';
    }

    if (shouldTriggerBass) {
        return {
            shouldTrigger: true,
            velocity: bassVelocity,
            duration: bassDuration,
            note: currentRoot
        };
    }

    return { shouldTrigger: false };
}

// ============================================
// HI-HAT TRIGGER LOGIC
// ============================================

export function processHihatTrigger(
    ctx: TriggerContext,
    patternValue: number
): TriggerResult {
    if (patternValue <= 0) {
        return { shouldTrigger: false };
    }

    const { stepIndex, stage, energy, currentStyle } = ctx;
    const hihatStyle = currentStyle.hihatStyle;

    let shouldHihat = false;
    let hihatVelocity = patternValue; // Use value from pattern (0-1) as base
    let hihatDuration = '32n';

    // Energy masks density
    if (stage === 'idle') {
        if (stepIndex % 4 === 0) shouldHihat = true; // Quarters only
    } else if (stage === 'awakening') {
        if (stepIndex % 2 === 0) shouldHihat = true; // 8ths
    } else {
        shouldHihat = true; // Full pattern
    }

    if (shouldHihat) {
        // Add dynamics
        if (stepIndex % 4 === 0) hihatVelocity += 0.2; // Accent downbeats

        // Style nuances
        if (hihatStyle === 'open' && (stepIndex === 2 || stepIndex === 10)) {
            hihatDuration = '8n'; // Open hat feel
        }

        // Global energy scaling
        hihatVelocity = Math.min(1, hihatVelocity * (0.4 + energy * 0.6));

        return {
            shouldTrigger: true,
            velocity: hihatVelocity,
            duration: hihatDuration
        };
    }

    return { shouldTrigger: false };
}

// ============================================
// SNARE TRIGGER LOGIC
// ============================================

export function processSnareTrigger(
    ctx: TriggerContext,
    patternValue: number
): TriggerResult {
    if (patternValue <= 0) {
        return { shouldTrigger: false };
    }

    const { stage, energy } = ctx;

    // Snare usually only active from Groove onwards
    if (stage === 'groove' || stage === 'flow' || stage === 'euphoria') {
        const snareVelocity = 0.5 + (energy * 0.4);
        return {
            shouldTrigger: true,
            velocity: snareVelocity,
            duration: '16n'
        };
    }

    return { shouldTrigger: false };
}
