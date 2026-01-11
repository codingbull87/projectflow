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
  SPARKLE_ENERGY_BONUS
} from './constants';

// Helper: Get current energy stage name
function getEnergyStage(energy: number): string {
  if (energy >= ENERGY_THRESHOLD_EUPHORIA) return 'euphoria';
  if (energy >= ENERGY_THRESHOLD_FLOW) return 'flow';
  if (energy >= ENERGY_THRESHOLD_GROOVE) return 'groove';
  if (energy >= ENERGY_THRESHOLD_AWAKENING) return 'awakening';
  return 'idle';
}

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

  const energyRef = useRef(0);
  const requestRef = useRef<number | null>(null);

  // 1. Audio Initialization
  const handleTogglePlay = async () => {
    if (!isPlaying) {
      await audioEngine.init();
      audioEngine.start();
      setIsPlaying(true);
    } else {
      audioEngine.stop();
      setIsPlaying(false);
    }
  };

  // 2. Energy System Loop with Asymmetric Decay (Psychology-Based)
  // High energy = slow decay (enjoy the peak), Low energy = fast decay (rest state)
  const animate = useCallback(() => {
    if (energyRef.current > 0) {
      const decayRate = getDecayRate(energyRef.current);
      energyRef.current = Math.max(0, energyRef.current - decayRate);
      setEnergy(energyRef.current);
      setCurrentStage(getEnergyStage(energyRef.current));
      audioEngine.updateEnergy(energyRef.current);
    }

    requestRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [animate]);

  // 3. Input Handling with Resistance Zones and Sparkle (Dopamine System)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying) return;

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
        audioEngine.triggerSparkle(); // Trigger sparkle sound
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
  }, [isPlaying]);

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden select-none">
      <Visualizer
        energy={energy}
        triggerSignal={triggerCount}
        sparkleSignal={sparkleSignal}
      />
      <Controls
        isPlaying={isPlaying}
        onToggle={handleTogglePlay}
        energy={energy}
        stage={currentStage}
      />
    </div>
  );
}

export default App;