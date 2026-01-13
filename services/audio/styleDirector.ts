import * as Tone from 'tone';
import {
    Style,
    STYLES,
    getRandomNextStyle,
    TRANSITION_CONFIG,
    getCurrentChord,
    generateScaleWithOctaves
} from './styles';
import { Instruments } from './instruments';
import { Effects } from './effects';
import {
    applyStyleToInstruments,
    applyStyleToEffects,
    collectInterpolatedValues,
    getStyleValues,
    interpolateStyleValue
} from './styleApplicator';

/**
 * StyleDirector - Orchestrates style transitions
 * 
 * Core responsibilities:
 * 1. Track current style and how long it's been active
 * 2. Detect when to trigger a transition
 * 3. Manage transition state and progress
 * 4. Notify other systems of style changes
 * 
 * Parameter application is delegated to styleApplicator.ts
 * 
 * Design: "Fake Drop" - When transitioning, energy briefly drops
 * to create contrast, then the new style "explodes" in
 */

export interface TransitionState {
    isTransitioning: boolean;
    progress: number;           // 0-1 during transition
    fromStyle: Style;
    toStyle: Style;
    startBar: number;
}

export class StyleDirector {
    private currentStyle: Style;
    private barsInCurrentStyle: number = 0;
    private totalBars: number = 0;

    private transitionState: TransitionState | null = null;

    // Callbacks
    private onStyleChange?: (newStyle: Style, oldStyle: Style) => void;
    private onTransitionStart?: (fromStyle: Style, toStyle: Style) => void;
    private onTransitionComplete?: (newStyle: Style) => void;
    private onEnergyDrop?: () => void;

    constructor(initialStyleId?: string) {
        // Start with first style or specified style
        this.currentStyle = initialStyleId
            ? STYLES.find(s => s.id === initialStyleId) || STYLES[0]
            : STYLES[0];

        console.log(`[StyleDirector] Initialized with style: ${this.currentStyle.name}`);
    }

    // ================================
    // GETTERS
    // ================================

    public getCurrentStyle(): Style {
        return this.currentStyle;
    }

    public getBarsInCurrentStyle(): number {
        return this.barsInCurrentStyle;
    }

    public isInTransition(): boolean {
        return this.transitionState !== null;
    }

    public getTransitionProgress(): number {
        return this.transitionState?.progress || 0;
    }

    public getTransitionState(): TransitionState | null {
        return this.transitionState;
    }

    /**
     * Get the current chord based on bar position
     */
    public getCurrentChord(): { name: string; root: string; notes: string[] } {
        return getCurrentChord(this.currentStyle, this.totalBars);
    }

    /**
     * Get scale notes for current stage (with appropriate octave range)
     */
    public getScaleForStage(stage: 'idle' | 'awakening' | 'groove' | 'flow' | 'euphoria'): string[] {
        const style = this.currentStyle;

        switch (stage) {
            case 'idle':
                return generateScaleWithOctaves(style, 1, 2);
            case 'awakening':
                return generateScaleWithOctaves(style, 1, 3);
            case 'groove':
                return generateScaleWithOctaves(style, 2, 4);
            case 'flow':
                return generateScaleWithOctaves(style, 2, 4);
            case 'euphoria':
                return generateScaleWithOctaves(style, 1, 5);
        }
    }

    // ================================
    // CORE LOGIC
    // ================================

    /**
     * Called every bar from the rhythm loop
     * This is the main "tick" for the style system
     */
    public onBar(barNumber: number, energy: number): void {
        this.totalBars = barNumber;
        this.barsInCurrentStyle++;

        // If in transition, update progress
        if (this.transitionState) {
            this.updateTransition(barNumber);
            return;
        }

        // Check if we should start a transition
        this.checkTransitionTrigger(energy);
    }

    /**
     * Check if conditions are met to trigger a style transition
     */
    private checkTransitionTrigger(energy: number): void {
        const { minBarsBeforeTransition, maxBarsBeforeTransition } = TRANSITION_CONFIG;

        // Condition 1: Must be in Euphoria (high energy)
        const isHighEnergy = energy >= 0.8;

        // Condition 2: Minimum time in current style
        const hasMinTime = this.barsInCurrentStyle >= minBarsBeforeTransition;

        // Condition 3: Random chance increases over time
        const timeRatio = Math.min(1,
            (this.barsInCurrentStyle - minBarsBeforeTransition) /
            (maxBarsBeforeTransition - minBarsBeforeTransition)
        );
        const transitionChance = hasMinTime ? 0.05 + timeRatio * 0.15 : 0;

        // Condition 4: Force transition after max time
        const forceTransition = this.barsInCurrentStyle >= maxBarsBeforeTransition;

        // Trigger transition
        if ((isHighEnergy && hasMinTime && Math.random() < transitionChance) || forceTransition) {
            this.startTransition();
        }
    }

    /**
     * Start a transition to a new style
     */
    public startTransition(targetStyleId?: string): void {
        const fromStyle = this.currentStyle;
        const toStyle = targetStyleId
            ? STYLES.find(s => s.id === targetStyleId) || getRandomNextStyle(fromStyle.id)
            : getRandomNextStyle(fromStyle.id);

        console.log(`[StyleDirector] Transition: ${fromStyle.name} → ${toStyle.name}`);

        this.transitionState = {
            isTransitioning: true,
            progress: 0,
            fromStyle,
            toStyle,
            startBar: this.totalBars
        };

        // Notify listeners
        this.onTransitionStart?.(fromStyle, toStyle);

        // Trigger energy drop ("fake drop" effect)
        this.onEnergyDrop?.();
    }

    /**
     * Update transition progress each bar
     */
    private updateTransition(barNumber: number): void {
        if (!this.transitionState) return;

        const barsSinceStart = barNumber - this.transitionState.startBar;
        const progress = Math.min(1, barsSinceStart / TRANSITION_CONFIG.transitionDurationBars);

        this.transitionState.progress = progress;

        // Transition complete
        if (progress >= 1) {
            this.completeTransition();
        }
    }

    /**
     * Complete the transition, switch to new style
     */
    private completeTransition(): void {
        if (!this.transitionState) return;

        const oldStyle = this.currentStyle;
        const newStyle = this.transitionState.toStyle;

        this.currentStyle = newStyle;
        this.barsInCurrentStyle = 0;
        this.transitionState = null;

        console.log(`[StyleDirector] Transition complete: now playing ${newStyle.name}`);

        // Notify listeners
        this.onStyleChange?.(newStyle, oldStyle);
        this.onTransitionComplete?.(newStyle);
    }

    /**
     * Force switch to a specific style (no transition)
     */
    public forceStyle(styleId: string): void {
        const style = STYLES.find(s => s.id === styleId);
        if (style) {
            const oldStyle = this.currentStyle;
            this.currentStyle = style;
            this.barsInCurrentStyle = 0;
            this.transitionState = null;
            this.onStyleChange?.(style, oldStyle);
        }
    }

    // ================================
    // PARAMETER ACCESS (Delegates to styleApplicator)
    // ================================

    /**
     * Get interpolated value during transition
     * Returns current style value if not transitioning
     */
    public getInterpolatedValue<K extends keyof Style>(key: K): Style[K] {
        if (!this.transitionState) {
            return this.currentStyle[key];
        }

        const { fromStyle, toStyle, progress } = this.transitionState;
        return interpolateStyleValue(fromStyle, toStyle, progress, key);
    }

    /**
     * Apply current style parameters to instruments
     * Delegates to styleApplicator module
     */
    public applyStyleToInstruments(instruments: Instruments, now: number): void {
        const values = this.transitionState
            ? collectInterpolatedValues(
                this.transitionState.fromStyle,
                this.transitionState.toStyle,
                this.transitionState.progress
            )
            : getStyleValues(this.currentStyle);

        applyStyleToInstruments(instruments, values);
    }

    /**
     * Apply current style parameters to effects
     * Delegates to styleApplicator module
     */
    public applyStyleToEffects(effects: Effects, now: number): void {
        const values = this.transitionState
            ? collectInterpolatedValues(
                this.transitionState.fromStyle,
                this.transitionState.toStyle,
                this.transitionState.progress
            )
            : getStyleValues(this.currentStyle);

        applyStyleToEffects(effects, values);
    }

    // ================================
    // CALLBACKS
    // ================================

    public setOnStyleChange(callback: (newStyle: Style, oldStyle: Style) => void): void {
        this.onStyleChange = callback;
    }

    public setOnTransitionStart(callback: (fromStyle: Style, toStyle: Style) => void): void {
        this.onTransitionStart = callback;
    }

    public setOnTransitionComplete(callback: (newStyle: Style) => void): void {
        this.onTransitionComplete = callback;
    }

    public setOnEnergyDrop(callback: () => void): void {
        this.onEnergyDrop = callback;
    }
}

// ================================
// SINGLETON MANAGEMENT
// ================================

let directorInstance: StyleDirector | null = null;

export function getStyleDirector(): StyleDirector {
    if (!directorInstance) {
        directorInstance = new StyleDirector();
    }
    return directorInstance;
}

export function resetStyleDirector(): void {
    directorInstance = null;
}
