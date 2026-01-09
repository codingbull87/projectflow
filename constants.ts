// Audio Constants
export const BPM = 128;
export const BASE_NOTE = "C3";

// Standard Range (Idle/Groove): C3 - F4
export const PENTATONIC_SCALE = ["C3", "Eb3", "F3", "G3", "Bb3", "C4", "Eb4", "F4"];

// High Energy Range (Peak): C4 - Bb5 (Higher octaves for excitement)
export const PENTATONIC_SCALE_PEAK = ["C4", "Eb4", "F4", "G4", "Bb4", "C5", "Eb5", "F5", "G5", "Bb5"];

// Energy System
export const ENERGY_DECAY_RATE = 0.002; // Amount to decrease per frame
export const ENERGY_INPUT_BOOST = 0.15; // Amount to increase per keypress
export const ENERGY_THRESHOLD_GROOVE = 0.3;
export const ENERGY_THRESHOLD_PEAK = 0.7;

// Visual Colors (HSB)
export const COLOR_IDLE = { h: 220, s: 80, b: 20 }; // Deep Blue
export const COLOR_GROOVE = { h: 280, s: 70, b: 30 }; // Purple
export const COLOR_PEAK = { h: 340, s: 90, b: 40 }; // Neon Red/Pink