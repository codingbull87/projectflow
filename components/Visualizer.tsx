import React, { useEffect, useRef } from 'react';
import p5 from 'p5';
import {
  COLOR_IDLE,
  COLOR_AWAKENING,
  COLOR_GROOVE,
  COLOR_FLOW,
  COLOR_EUPHORIA,
  COLOR_SPARKLE,
  ENERGY_THRESHOLD_AWAKENING,
  ENERGY_THRESHOLD_GROOVE,
  ENERGY_THRESHOLD_FLOW,
  ENERGY_THRESHOLD_EUPHORIA
} from '../constants';
import { ShapeType } from '../types';

interface VisualizerProps {
  energy: number;
  triggerSignal: number;
  sparkleSignal: number;
  hueShift?: number;
}

/**
 * Visualizer Component
 * Based on Embodied Cognition: Visual feedback reinforces body movement
 *
 * Stage colors progression:
 * Idle (Blue) → Awakening (Cyan) → Groove (Purple) → Flow (Pink) → Euphoria (Red)
 */
const MAX_PARTICLES = 500; // Prevent performance degradation from excessive particles

const Visualizer: React.FC<VisualizerProps> = ({ energy, triggerSignal, sparkleSignal, hueShift = 0 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const p5Instance = useRef<p5 | null>(null);
  const energyRef = useRef(energy);
  const hueShiftRef = useRef(hueShift);
  const prevSignalRef = useRef(triggerSignal);
  const prevSparkleRef = useRef(sparkleSignal);

  // Particles system
  const particles = useRef<any[]>([]);
  // Screen flash for sparkle
  const flashRef = useRef(0);

  // Sync props to refs
  useEffect(() => {
    energyRef.current = energy;
    hueShiftRef.current = hueShift;
  }, [energy, hueShift]);

  useEffect(() => {
    if (triggerSignal !== prevSignalRef.current) {
      addParticle();
      prevSignalRef.current = triggerSignal;
    }
  }, [triggerSignal]);

  useEffect(() => {
    if (sparkleSignal !== prevSparkleRef.current) {
      addSparkle();
      flashRef.current = 1.0; // Trigger screen flash
      prevSparkleRef.current = sparkleSignal;
    }
  }, [sparkleSignal]);

  // Get color for current energy stage (with hue shift)
  const getStageColor = (e: number) => {
    let baseColor = COLOR_IDLE;
    if (e >= ENERGY_THRESHOLD_EUPHORIA) baseColor = COLOR_EUPHORIA;
    else if (e >= ENERGY_THRESHOLD_FLOW) baseColor = COLOR_FLOW;
    else if (e >= ENERGY_THRESHOLD_GROOVE) baseColor = COLOR_GROOVE;
    else if (e >= ENERGY_THRESHOLD_AWAKENING) baseColor = COLOR_AWAKENING;

    // Apply hue shift
    return {
      ...baseColor,
      h: (baseColor.h + (hueShiftRef.current || 0) + 360) % 360
    };
  };

  // Interpolate between two colors
  const lerpColor = (c1: typeof COLOR_IDLE, c2: typeof COLOR_IDLE, t: number) => ({
    h: c1.h + (c2.h - c1.h) * t,
    s: c1.s + (c2.s - c1.s) * t,
    b: c1.b + (c2.b - c1.b) * t
  });

  const addParticle = () => {
    if (!p5Instance.current) return;
    const p = p5Instance.current;
    const e = energyRef.current;

    // Prevent particle array from growing too large
    if (particles.current.length >= MAX_PARTICLES) {
      // Remove oldest particle
      particles.current.shift();
    }

    const shapes: ShapeType[] = ['circle', 'square', 'triangle'];
    const selectedShape = shapes[Math.floor(Math.random() * shapes.length)];

    // Size scales with energy
    const sizeBase = 30 + (e * 120);

    // Color from current stage
    const stageColor = getStageColor(e);
    const hueVal = stageColor.h + p.random(-15, 15);

    // Velocity for movement (higher energy = faster)
    const speed = 1 + e * 3;
    const angle = p.random(p.TWO_PI);

    particles.current.push({
      x: p.random(p.width * 0.15, p.width * 0.85),
      y: p.random(p.height * 0.15, p.height * 0.85),
      vx: p.cos(angle) * speed,
      vy: p.sin(angle) * speed,
      size: sizeBase,
      shape: selectedShape,
      life: 1.0,
      hue: hueVal,
      sat: stageColor.s,
      rotation: p.random(0, p.TWO_PI),
      rotationSpeed: p.random(-0.08, 0.08),
      isSparkle: false
    });
  };

  const addSparkle = () => {
    if (!p5Instance.current) return;
    const p = p5Instance.current;

    // Burst of golden sparkle particles
    const count = 8 + Math.floor(energyRef.current * 12);
    const centerX = p.random(p.width * 0.3, p.width * 0.7);
    const centerY = p.random(p.height * 0.3, p.height * 0.7);

    for (let i = 0; i < count; i++) {
      // Prevent particle array from growing too large
      if (particles.current.length >= MAX_PARTICLES) {
        particles.current.shift();
      }

      const angle = (i / count) * p.TWO_PI + p.random(-0.3, 0.3);
      const speed = p.random(3, 8);

      particles.current.push({
        x: centerX,
        y: centerY,
        vx: p.cos(angle) * speed,
        vy: p.sin(angle) * speed,
        size: p.random(8, 20),
        shape: 'circle',
        life: 1.0,
        hue: COLOR_SPARKLE.h + p.random(-10, 10),
        sat: COLOR_SPARKLE.s,
        rotation: 0,
        rotationSpeed: 0,
        isSparkle: true
      });
    }
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

        // ================================
        // 1. Background Color (5-stage gradient)
        // ================================
        let bgColor: { h: number; s: number; b: number };

        if (e < ENERGY_THRESHOLD_AWAKENING) {
          const t = e / ENERGY_THRESHOLD_AWAKENING;
          bgColor = lerpColor(COLOR_IDLE, COLOR_AWAKENING, t);
        } else if (e < ENERGY_THRESHOLD_GROOVE) {
          const t = (e - ENERGY_THRESHOLD_AWAKENING) / (ENERGY_THRESHOLD_GROOVE - ENERGY_THRESHOLD_AWAKENING);
          bgColor = lerpColor(COLOR_AWAKENING, COLOR_GROOVE, t);
        } else if (e < ENERGY_THRESHOLD_FLOW) {
          const t = (e - ENERGY_THRESHOLD_GROOVE) / (ENERGY_THRESHOLD_FLOW - ENERGY_THRESHOLD_GROOVE);
          bgColor = lerpColor(COLOR_GROOVE, COLOR_FLOW, t);
        } else if (e < ENERGY_THRESHOLD_EUPHORIA) {
          const t = (e - ENERGY_THRESHOLD_FLOW) / (ENERGY_THRESHOLD_EUPHORIA - ENERGY_THRESHOLD_FLOW);
          bgColor = lerpColor(COLOR_FLOW, COLOR_EUPHORIA, t);
        } else {
          // Euphoria - add intensity pulsing
          const intensity = (e - ENERGY_THRESHOLD_EUPHORIA) / (1 - ENERGY_THRESHOLD_EUPHORIA);
          bgColor = {
            h: COLOR_EUPHORIA.h,
            s: COLOR_EUPHORIA.s,
            b: COLOR_EUPHORIA.b + intensity * 10
          };
        }

        // Apply hue shift to background
        bgColor.h = (bgColor.h + (hueShiftRef.current || 0) + 360) % 360;

        // Subtle pulse based on energy
        const pulseSpeed = 0.03 + e * 0.05;
        const pulseAmount = 3 + e * 5;
        const pulse = p.sin(p.frameCount * pulseSpeed) * pulseAmount;

        p.background(bgColor.h, bgColor.s, Math.max(5, bgColor.b + pulse));

        // ================================
        // 2. Sparkle Flash Effect
        // ================================
        if (flashRef.current > 0) {
          p.fill(COLOR_SPARKLE.h, 20, 100, flashRef.current * 0.3);
          p.rect(p.width / 2, p.height / 2, p.width, p.height);
          flashRef.current -= 0.08;
        }

        // ================================
        // 3. Draw Particles
        // ================================
        for (let i = particles.current.length - 1; i >= 0; i--) {
          const part = particles.current[i];

          p.push();
          p.translate(part.x, part.y);
          p.rotate(part.rotation);

          // Fade opacity
          const alpha = part.isSparkle
            ? p.pow(part.life, 0.5)  // Sparkles fade slower
            : p.sq(part.life);

          // Sparkles are brighter
          const brightness = part.isSparkle ? 100 : 95;
          p.fill(part.hue, part.sat || 80, brightness, alpha);

          // Size evolution
          const sizeMult = part.isSparkle
            ? (1.5 - part.life * 0.5)  // Sparkles shrink
            : (2 - part.life);          // Regular particles grow
          const currentSize = part.size * sizeMult;

          if (part.shape === 'circle') {
            p.circle(0, 0, currentSize);
          } else if (part.shape === 'square') {
            p.square(0, 0, currentSize);
          } else if (part.shape === 'triangle') {
            const r = currentSize / 2;
            p.triangle(0, -r, -r, r, r, r);
          }

          p.pop();

          // Physics update
          part.x += part.vx || 0;
          part.y += part.vy || 0;
          part.vx *= 0.98; // Friction
          part.vy *= 0.98;
          part.rotation += part.rotationSpeed;
          part.life -= part.isSparkle ? 0.025 : 0.02;

          if (part.life <= 0) {
            particles.current.splice(i, 1);
          }
        }

        // ================================
        // 4. Ambient particles (at higher energy)
        // ================================
        if (e > 0.3 && p.random() < e * 0.03) {
          // Prevent particle array from growing too large
          if (particles.current.length < MAX_PARTICLES) {
            const ambColor = getStageColor(e);
            particles.current.push({
              x: p.random(p.width),
              y: p.random(p.height),
              vx: p.random(-0.5, 0.5),
              vy: p.random(-0.5, 0.5),
              size: p.random(3, 8),
              shape: 'circle',
              life: 0.5,
              hue: ambColor.h + p.random(-10, 10),
              sat: ambColor.s * 0.7,
              rotation: 0,
              rotationSpeed: 0,
              isSparkle: false
            });
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