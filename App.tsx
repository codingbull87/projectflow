import React, { useEffect, useRef, useState, useCallback } from 'react';
import { audioEngine } from './services/audioEngine';
import Visualizer from './components/Visualizer';
import Controls from './components/Controls';
import { ENERGY_DECAY_RATE, ENERGY_INPUT_BOOST } from './constants';

function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [energy, setEnergy] = useState(0);
  // We use a separate trigger for visuals to guarantee a render update in the P5 component
  const [triggerCount, setTriggerCount] = useState(0); 
  
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

  // 2. Energy System Loop
  const animate = useCallback(() => {
    // Decay Energy
    if (energyRef.current > 0) {
      energyRef.current = Math.max(0, energyRef.current - ENERGY_DECAY_RATE);
      
      // Update State for React UI
      setEnergy(energyRef.current);
      
      // Update Audio Engine
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

  // 3. Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying) return;
      
      // Boost Energy
      energyRef.current = Math.min(1, energyRef.current + ENERGY_INPUT_BOOST);
      
      // Trigger Audio (Quantized)
      audioEngine.triggerQuantizedNote();
      
      // Trigger Visual (Immediate)
      setTriggerCount(prev => prev + 1);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying]);

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden select-none">
      <Visualizer energy={energy} triggerSignal={triggerCount} />
      <Controls isPlaying={isPlaying} onToggle={handleTogglePlay} energy={energy} />
    </div>
  );
}

export default App;