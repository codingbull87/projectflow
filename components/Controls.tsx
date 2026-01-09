import React from 'react';

interface ControlsProps {
  isPlaying: boolean;
  onToggle: () => void;
  energy: number;
}

const Controls: React.FC<ControlsProps> = ({ isPlaying, onToggle, energy }) => {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8 z-10">
      
      {/* Top Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-white text-3xl font-bold tracking-tighter opacity-90">PROJECT FLOW</h1>
          <p className="text-white/60 text-sm mt-1 max-w-xs">
            Type anywhere to flow. No wrong notes. Keep the energy alive.
          </p>
        </div>
        
        {/* Play/Pause Button - Pointer events re-enabled for button */}
        <button 
          onClick={onToggle}
          className="pointer-events-auto bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white px-6 py-2 rounded-full transition-all active:scale-95 font-semibold"
        >
          {isPlaying ? "PAUSE" : "START ENGINE"}
        </button>
      </div>

      {/* Center - Call to Action (Only when paused or idle) */}
      {!isPlaying && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <button 
             onClick={onToggle}
             className="pointer-events-auto group relative flex items-center justify-center"
          >
             <div className="absolute inset-0 bg-purple-600 rounded-full blur-xl opacity-40 group-hover:opacity-60 transition-opacity animate-pulse"></div>
             <div className="relative bg-white text-black w-24 h-24 rounded-full flex items-center justify-center font-bold text-xl shadow-xl hover:scale-105 transition-transform">
               PLAY
             </div>
          </button>
        </div>
      )}

      {/* Bottom - Energy Meter */}
      <div className="w-full max-w-md mx-auto">
        <div className="flex justify-between text-xs text-white/50 mb-2 uppercase tracking-widest">
          <span>Idle</span>
          <span>Groove</span>
          <span>Flow</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
          <div 
            className="h-full transition-all duration-100 ease-linear rounded-full"
            style={{ 
              width: `${Math.min(energy * 100, 100)}%`,
              backgroundColor: energy > 0.7 ? '#f43f5e' : energy > 0.3 ? '#a855f7' : '#3b82f6',
              boxShadow: `0 0 10px ${energy > 0.7 ? '#f43f5e' : energy > 0.3 ? '#a855f7' : '#3b82f6'}`
            }}
          />
        </div>
      </div>

    </div>
  );
};

export default Controls;