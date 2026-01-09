// Audio Constants
export const BPM = 128;
export const BASE_NOTE = "C3";

// Standard Range (Idle/Groove): C3 - F4
export const PENTATONIC_SCALE = ["C3", "Eb3", "F3", "G3", "Bb3", "C4", "Eb4", "F4"];

// High Energy Range (Peak): C4 - Bb5 (Higher octaves for excitement)
export const PENTATONIC_SCALE_PEAK = ["C4", "Eb4", "F4", "G4", "Bb4", "C5", "Eb5", "F5", "G5", "Bb5"];

// Energy System
export const ENERGY_DECAY_RATE = 0.002; // Amount to decrease per frame
export const ENERGY_INPUT_BOOST = 0.10; // Amount to increase per keypress (reduced for slower climb)
export const ENERGY_THRESHOLD_GROOVE = 0.35; // Enter Groove stage
export const ENERGY_THRESHOLD_BUILDING = 0.55; // Enter Building stage
export const ENERGY_THRESHOLD_PEAK = 0.75; // Enter Peak stage
export const ENERGY_THRESHOLD_ULTRA = 0.90; // Enter Ultra Peak stage

// Visual Colors (HSB)
export const COLOR_IDLE = { h: 220, s: 80, b: 20 }; // Deep Blue
export const COLOR_GROOVE = { h: 280, s: 70, b: 30 }; // Purple
export const COLOR_PEAK = { h: 340, s: 90, b: 40 }; // Neon Red/Pink