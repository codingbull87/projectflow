import React, { useEffect, useRef, useState, useCallback } from 'react';
import { audioEngine } from './services/audioEngine';
import Visualizer from './components/Visualizer';
import Controls from './components/Controls';
import {
  ENERGY_INPUT_BASE,
  ENERGY_RESISTANCE_ZONES,
  ENERGY_DECAY_EUPHORIA,
  ENERGY_DECAY_FLOW,
  ENERGY_DECAY_GROOVE,
  ENERGY_DECAY_AWAKENING,
  ENERGY_DECAY_IDLE,
  ENERGY_THRESHOLD_EUPHORIA,
  ENERGY_THRESHOLD_FLOW,
  ENERGY_THRESHOLD_GROOVE,
  ENERGY_THRESHOLD_AWAKENING,
  SPARKLE_CHANCE_IDLE,
  SPARKLE_CHANCE_AWAKENING,
  SPARKLE_CHANCE_GROOVE,
  SPARKLE_CHANCE_FLOW,
  SPARKLE_CHANCE_EUPHORIA,
  SPARKLE_ENERGY_BONUS,
  getEnergyStage
} from './constants';

// Helper: Get sparkle chance based on energy stage
function getSparkleChance(energy: number): number {
  if (energy >= ENERGY_THRESHOLD_EUPHORIA) return SPARKLE_CHANCE_EUPHORIA;
  if (energy >= ENERGY_THRESHOLD_FLOW) return SPARKLE_CHANCE_FLOW;
  if (energy >= ENERGY_THRESHOLD_GROOVE) return SPARKLE_CHANCE_GROOVE;
  if (energy >= ENERGY_THRESHOLD_AWAKENING) return SPARKLE_CHANCE_AWAKENING;
  return SPARKLE_CHANCE_IDLE;
}

// Helper: Get decay rate based on energy stage
function getDecayRate(energy: number): number {
  if (energy >= ENERGY_THRESHOLD_EUPHORIA) return ENERGY_DECAY_EUPHORIA;
  if (energy >= ENERGY_THRESHOLD_FLOW) return ENERGY_DECAY_FLOW;
  if (energy >= ENERGY_THRESHOLD_GROOVE) return ENERGY_DECAY_GROOVE;
  if (energy >= ENERGY_THRESHOLD_AWAKENING) return ENERGY_DECAY_AWAKENING;
  return ENERGY_DECAY_IDLE;
}

function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [energy, setEnergy] = useState(0);
  const [triggerCount, setTriggerCount] = useState(0);
  const [sparkleSignal, setSparkleSignal] = useState(0);
  const [currentStage, setCurrentStage] = useState('idle');

  // NEW: Style-related states
  const [currentStyleName, setCurrentStyleName] = useState('Disco House');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionProgress, setTransitionProgress] = useState(0);
  const [hueShift, setHueShift] = useState(0);

  const energyRef = useRef(0);
  const requestRef = useRef<number | null>(null);
  const isPlayingRef = useRef(false);
  const isTransitioningRef = useRef(false);
  const lastEnergyUpdateRef = useRef(0);
  const lastStageRef = useRef('idle');

  // 1. Audio Initialization
  const handleTogglePlay = async () => {
    if (!isPlaying) {
      await audioEngine.init();

      // Setup style change callbacks
      audioEngine.onStyleChange((styleName) => {
        setCurrentStyleName(styleName);
      });

      audioEngine.onTransition((transitioning, progress) => {
        setIsTransitioning(transitioning);
        setTransitionProgress(progress);
      });

      // Get initial style name
      setCurrentStyleName(audioEngine.getCurrentStyleName());

      audioEngine.start();
      setIsPlaying(true);
      isPlayingRef.current = true;
    } else {
      audioEngine.stop();
      setIsPlaying(false);
      isPlayingRef.current = false;
    }
  };

  // 2. Energy System Loop with Asymmetric Decay (Psychology-Based)
  // High energy = slow decay (enjoy the peak), Low energy = fast decay (rest state)
  // Optimized: Use refs to avoid recreating callback on dependency changes
  // Throttled updates: Only update state when energy changes significantly
  useEffect(() => {
    const animate = () => {
      if (energyRef.current > 0) {
        const decayRate = getDecayRate(energyRef.current);
        energyRef.current = Math.max(0, energyRef.current - decayRate);

        // Only update state when energy changes by more than 0.005 (0.5%)
        const energyDelta = Math.abs(energyRef.current - lastEnergyUpdateRef.current);
        if (energyDelta > 0.005) {
          setEnergy(energyRef.current);
          lastEnergyUpdateRef.current = energyRef.current;
        }

        // Only update stage when it actually changes
        const newStage = getEnergyStage(energyRef.current);
        if (newStage !== lastStageRef.current) {
          setCurrentStage(newStage);
          lastStageRef.current = newStage;
        }

        audioEngine.updateEnergy(energyRef.current);
      }

      // Update visual parameters from audio engine (interpolated)
      if (isPlayingRef.current) {
        setHueShift(audioEngine.getVisualParameters().hueShift);

        // Update transition state from audio engine
        const transitioning = audioEngine.isInTransition();
        if (transitioning !== isTransitioningRef.current) {
          isTransitioningRef.current = transitioning;
          setIsTransitioning(transitioning);
          setTransitionProgress(audioEngine.getTransitionProgress());
        }
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []); // Empty dependency array - stable animation loop

  // 3. Input Handling with Resistance Zones and Sparkle (Dopamine System)
  // Optimized: Use ref to check isPlaying state, listener remains constant
  // Added debounce to prevent rapid repeated keypresses
  useEffect(() => {
    const keyTimestamps = new Map<string, number>();
    const MIN_KEY_INTERVAL = 50; // 50ms minimum between same key presses

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlayingRef.current) return;

      // Debounce: Check if this key was pressed recently
      const now = Date.now();
      const lastPress = keyTimestamps.get(e.key) || 0;
      if (now - lastPress < MIN_KEY_INTERVAL) {
        return; // Skip this keypress
      }
      keyTimestamps.set(e.key, now);

      // Calculate energy boost with resistance zones
      // (Effort-Reward Balance: Breaking through thresholds feels like achievement)
      let boost = ENERGY_INPUT_BASE;
      const currentEnergy = energyRef.current;

      // Apply resistance in certain zones
      for (const zone of ENERGY_RESISTANCE_ZONES) {
        if (currentEnergy >= zone.min && currentEnergy <= zone.max) {
          boost *= zone.multiplier;
          break;
        }
      }

      // Check for Sparkle (random surprise based on energy stage)
      // Dopamine release: Predictable framework + unpredictable details
      const sparkleChance = getSparkleChance(currentEnergy);
      const isSparkle = Math.random() < sparkleChance;

      if (isSparkle) {
        boost += SPARKLE_ENERGY_BONUS;
        setSparkleSignal(prev => prev + 1);
        // audioEngine.triggerSparkle(); // DISABLED: Sparkle sound
      }

      // Boost Energy
      energyRef.current = Math.min(1, energyRef.current + boost);

      // Trigger Audio (Quantized) - pass key for pitch mapping
      audioEngine.triggerQuantizedNote(e.key);

      // Trigger Visual (Immediate)
      setTriggerCount(prev => prev + 1);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []); // Empty dependency array - listener stays constant

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden select-none">
      <Visualizer
        energy={energy}
        triggerSignal={triggerCount}
        sparkleSignal={sparkleSignal}
        hueShift={hueShift}
      />
      <Controls
        isPlaying={isPlaying}
        onToggle={handleTogglePlay}
        energy={energy}
        stage={currentStage}
        styleName={currentStyleName}
        isTransitioning={isTransitioning}
        transitionProgress={transitionProgress}
      />
    </div>
  );
}

export default App;