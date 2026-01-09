import React, { useEffect, useRef } from 'react';
import p5 from 'p5';
import { 
  COLOR_IDLE, 
  COLOR_GROOVE, 
  COLOR_PEAK, 
  ENERGY_THRESHOLD_GROOVE, 
  ENERGY_THRESHOLD_PEAK 
} from '../constants';
import { ShapeType } from '../types';

interface VisualizerProps {
  energy: number;
  triggerSignal: number; // Increment this to trigger a visual hit
}

const Visualizer: React.FC<VisualizerProps> = ({ energy, triggerSignal }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const p5Instance = useRef<p5 | null>(null);
  const energyRef = useRef(energy);
  const prevSignalRef = useRef(triggerSignal);
  
  // Particles system
  const particles = useRef<any[]>([]);

  // Sync props to refs for use inside P5 closure
  useEffect(() => {
    energyRef.current = energy;
  }, [energy]);

  useEffect(() => {
    if (triggerSignal !== prevSignalRef.current) {
      addParticle();
      prevSignalRef.current = triggerSignal;
    }
  }, [triggerSignal]);

  const addParticle = () => {
    if (!p5Instance.current) return;
    const p = p5Instance.current;
    const e = energyRef.current;
    
    const shapes: ShapeType[] = ['circle', 'square', 'triangle'];
    const selectedShape = shapes[Math.floor(Math.random() * shapes.length)];
    
    const sizeBase = 50 + (e * 100);
    
    // Choose color based on energy roughly
    let hueVal = COLOR_IDLE.h;
    if (e > ENERGY_THRESHOLD_PEAK) hueVal = COLOR_PEAK.h;
    else if (e > ENERGY_THRESHOLD_GROOVE) hueVal = COLOR_GROOVE.h;
    
    // Add randomness to hue
    hueVal += p.random(-20, 20);

    particles.current.push({
      x: p.random(p.width * 0.2, p.width * 0.8),
      y: p.random(p.height * 0.2, p.height * 0.8),
      size: sizeBase,
      shape: selectedShape,
      life: 1.0,
      hue: hueVal,
      rotation: p.random(0, p.TWO_PI),
      rotationSpeed: p.random(-0.05, 0.05)
    });
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const sketch = (p: p5) => {
      p.setup = () => {
        p.createCanvas(p.windowWidth, p.windowHeight);
        p.colorMode(p.HSB, 360, 100, 100, 1);
        p.noStroke();
        p.rectMode(p.CENTER);
      };

      p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
      };

      p.draw = () => {
        const e = energyRef.current;
        
        // 1. Background Interpolation
        // Lerp between colors based on energy
        let targetH, targetS, targetB;
        
        if (e < ENERGY_THRESHOLD_GROOVE) {
          // Interpolate Idle -> Groove
          const t = p.map(e, 0, ENERGY_THRESHOLD_GROOVE, 0, 1);
          targetH = p.lerp(COLOR_IDLE.h, COLOR_GROOVE.h, t);
          targetS = p.lerp(COLOR_IDLE.s, COLOR_GROOVE.s, t);
          targetB = p.lerp(COLOR_IDLE.b, COLOR_GROOVE.b, t);
        } else {
           // Interpolate Groove -> Peak
           const t = p.map(e, ENERGY_THRESHOLD_GROOVE, 1, 0, 1);
           targetH = p.lerp(COLOR_GROOVE.h, COLOR_PEAK.h, t);
           targetS = p.lerp(COLOR_GROOVE.s, COLOR_PEAK.s, t);
           targetB = p.lerp(COLOR_GROOVE.b, COLOR_PEAK.b, t);
        }

        // Slight background pulse
        const pulse = p.sin(p.frameCount * 0.05) * 5;
        p.background(targetH, targetS, targetB + pulse);

        // 2. Draw Particles
        for (let i = particles.current.length - 1; i >= 0; i--) {
          const part = particles.current[i];
          
          p.push();
          p.translate(part.x, part.y);
          p.rotate(part.rotation);
          
          // Fade out opacity
          const alpha = p.sq(part.life); // ease out
          p.fill(part.hue, 80, 100, alpha);
          
          // Expand size
          const currentSize = part.size * (2 - part.life); // Grows as life decreases
          
          if (part.shape === 'circle') {
            p.circle(0, 0, currentSize);
          } else if (part.shape === 'square') {
            p.square(0, 0, currentSize);
          } else if (part.shape === 'triangle') {
             const r = currentSize / 2;
             p.triangle(0, -r, -r, r, r, r);
          }
          
          p.pop();

          // Update physics
          part.life -= 0.03; // Decay speed
          part.rotation += part.rotationSpeed;
          
          if (part.life <= 0) {
            particles.current.splice(i, 1);
          }
        }
      };
    };

    p5Instance.current = new p5(sketch, containerRef.current);

    return () => {
      p5Instance.current?.remove();
    };
  }, []);

  return <div ref={containerRef} className="absolute inset-0 z-0" />;
};

export default Visualizer;