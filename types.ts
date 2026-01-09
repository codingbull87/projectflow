export enum GameState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  PLAYING = 'PLAYING'
}

export interface AudioEngineState {
  isReady: boolean;
  isPlaying: boolean;
}

export type ShapeType = 'circle' | 'square' | 'triangle';

export interface VisualParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string; // Hex or p5 color string
  shape: ShapeType;
  life: number; // 0 to 1
  maxLife: number;
}