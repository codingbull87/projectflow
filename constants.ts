// ==========================================
// AUDIO CONSTANTS
// ==========================================
export const BPM = 128;

// ==========================================
// ENERGY SYSTEM - 5 STAGES (Psychology-Based)
// ==========================================
// Stage thresholds (0.0 - 1.0)
// Based on Entrainment + Flow State + Embodied Cognition principles
export const ENERGY_THRESHOLD_IDLE = 0.0;        // 静谧脉动 (Idle) - 缓慢摇摆
export const ENERGY_THRESHOLD_AWAKENING = 0.20;  // 苏醒 (Awakening) - 点头
export const ENERGY_THRESHOLD_GROOVE = 0.40;     // 律动 (Groove) - 踏步
export const ENERGY_THRESHOLD_FLOW = 0.60;       // 心流 (Flow) - 大幅度律动
export const ENERGY_THRESHOLD_EUPHORIA = 0.80;   // 狂喜 (Euphoria) - 跳跃挥手

// Legacy aliases for compatibility
export const ENERGY_THRESHOLD_BUILDING = ENERGY_THRESHOLD_FLOW;
export const ENERGY_THRESHOLD_PEAK = ENERGY_THRESHOLD_EUPHORIA;
export const ENERGY_THRESHOLD_ULTRA = 0.90;      // Ultra intensity within Euphoria

// ==========================================
// ENERGY INPUT (per keypress)
// ==========================================
// Base input reduced for slower, more rewarding climb (20-30 seconds to Peak)
export const ENERGY_INPUT_BASE = 0.035;

// ==========================================
// RESISTANCE ZONES (Effort-Reward Balance)
// ==========================================
// Makes climbing feel like an achievement, not automatic
// User needs sustained effort to break through thresholds
export const ENERGY_RESISTANCE_ZONES = [
    { min: 0.18, max: 0.25, multiplier: 0.5 },  // Hard to break into Awakening
    { min: 0.38, max: 0.45, multiplier: 0.4 },  // Hard to break into Groove
    { min: 0.58, max: 0.65, multiplier: 0.35 }, // Hard to break into Flow
    { min: 0.78, max: 0.85, multiplier: 0.3 }   // Hard to break into Euphoria
];

// ==========================================
// ENERGY DECAY RATES (Asymmetric - Slow at High Energy)
// ==========================================
// High energy should feel like a "reward" - user can enjoy the peak
// Based on Effort-Reward Balance principle
export const ENERGY_DECAY_EUPHORIA = 0.0006;  // ~28 seconds to drop from 1.0 to 0.8
export const ENERGY_DECAY_FLOW = 0.0012;      // ~17 seconds to drop through Flow
export const ENERGY_DECAY_GROOVE = 0.0020;    // ~10 seconds through Groove
export const ENERGY_DECAY_AWAKENING = 0.0035; // ~6 seconds through Awakening
export const ENERGY_DECAY_IDLE = 0.0060;      // Fast decay to zero (rest state)

// Legacy aliases
export const ENERGY_DECAY_ULTRA = ENERGY_DECAY_EUPHORIA;
export const ENERGY_DECAY_PEAK = ENERGY_DECAY_EUPHORIA;
export const ENERGY_DECAY_BUILDING = ENERGY_DECAY_FLOW;

// ==========================================
// SPARKLE SYSTEM (Dopamine Release - Predictable + Surprise)
// ==========================================
// "Even without user input, background music occasionally has Sparkle"
// This makes the music feel "alive"

// Sparkle probability per user input (increases with energy)
export const SPARKLE_CHANCE_IDLE = 0.05;       // 5% at Idle
export const SPARKLE_CHANCE_AWAKENING = 0.10;  // 10% at Awakening
export const SPARKLE_CHANCE_GROOVE = 0.15;     // 15% at Groove
export const SPARKLE_CHANCE_FLOW = 0.20;       // 20% at Flow
export const SPARKLE_CHANCE_EUPHORIA = 0.30;   // 30% at Euphoria

// Background sparkle (music's own life force)
export const SPARKLE_BACKGROUND_INTERVAL_BARS = 12;  // Check every N bars
export const SPARKLE_BACKGROUND_CHANCE = 0.05;       // 5% chance when checked

// Energy bonus when sparkle triggers
export const SPARKLE_ENERGY_BONUS = 0.04;

// Legacy aliases
export const SPARKLE_BASE_CHANCE = SPARKLE_CHANCE_IDLE;
export const SPARKLE_MAX_CHANCE = SPARKLE_CHANCE_EUPHORIA;
export const SPARKLE_BACKGROUND_INTERVAL = SPARKLE_BACKGROUND_INTERVAL_BARS;

// ==========================================
// MUSICAL SCALES - A Minor Natural (EDM/House Standard)
// ==========================================
// A Minor: A B C D E F G (7 notes)
// Contains tension intervals: B-C (semitone), E-F (semitone)
// Low frequencies → large muscle groups (legs, torso)
// High frequencies → small muscle groups (hands, head)

export const SCALE_NOTES = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

// Stage-specific ranges (inviting different body movements)
export const SCALE_IDLE = ['A1', 'C2', 'D2', 'E2', 'G2', 'A2'];
// Deep, focused - invites slow swaying

export const SCALE_AWAKENING = ['A1', 'B1', 'C2', 'D2', 'E2', 'F2', 'G2', 'A2', 'B2', 'C3'];
// Expanding - invites nodding

export const SCALE_GROOVE = ['A2', 'B2', 'C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4'];
// Comfortable mid-range - invites stepping

export const SCALE_FLOW = ['A2', 'B2', 'C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4'];
// Wide range - invites full body dancing

export const SCALE_EUPHORIA = [
    'A1', 'B1', 'C2', 'D2', 'E2', 'F2', 'G2',
    'A2', 'B2', 'C3', 'D3', 'E3', 'F3', 'G3',
    'A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4',
    'A4', 'B4', 'C5', 'D5', 'E5'
];
// Full spectrum explosion - invites jumping, arm waving

// ==========================================
// DROP EFFECT (Euphoria Stage Special)
// ==========================================
export const DROP_INTERVAL_BARS = 4;      // Check every 4 bars
export const DROP_CHANCE = 0.25;          // 25% chance when checked
export const DROP_SILENCE_DURATION = 0.1; // 100ms silence before explosion

// ==========================================
// VISUAL COLORS (HSB) - 5 Stage Gradient
// ==========================================
export const COLOR_IDLE = { h: 220, s: 80, b: 15 };       // Deep Blue (calm ocean)
export const COLOR_AWAKENING = { h: 200, s: 70, b: 25 };  // Cyan Blue (dawn)
export const COLOR_GROOVE = { h: 280, s: 65, b: 40 };     // Purple (energy)
export const COLOR_FLOW = { h: 320, s: 75, b: 55 };       // Pink (passion)
export const COLOR_EUPHORIA = { h: 350, s: 90, b: 70 };   // Hot Red/Pink (explosion)

// Legacy aliases
export const COLOR_PEAK = COLOR_FLOW;
export const COLOR_ULTRA = COLOR_EUPHORIA;

// Sparkle color (golden flash)
export const COLOR_SPARKLE = { h: 45, s: 100, b: 100 };   // Gold