import React from 'react';

interface ControlsProps {
  isPlaying: boolean;
  onToggle: () => void;
  energy: number;
  stage: string;
  styleName?: string;
  isTransitioning?: boolean;
  transitionProgress?: number;
}

// Stage display names (Chinese + English)
const STAGE_LABELS: Record<string, { cn: string; en: string }> = {
  idle: { cn: '静谧脉动', en: 'Idle' },
  awakening: { cn: '苏醒', en: 'Awakening' },
  groove: { cn: '律动', en: 'Groove' },
  flow: { cn: '心流', en: 'Flow' },
  euphoria: { cn: '狂喜', en: 'Euphoria' }
};

// Stage colors (gradient from calm to intense)
const STAGE_COLORS: Record<string, string> = {
  idle: '#3b82f6',       // Blue
  awakening: '#06b6d4',  // Cyan
  groove: '#a855f7',     // Purple
  flow: '#ec4899',       // Pink
  euphoria: '#ef4444'    // Red
};

// Style display info
const STYLE_INFO: Record<string, { icon: string; color: string }> = {
  'Disco House': { icon: '🪩', color: '#f59e0b' },
  'Uplifting Trance': { icon: '✨', color: '#06b6d4' },
  'Deep House': { icon: '🌊', color: '#8b5cf6' }
};

const Controls: React.FC<ControlsProps> = ({
  isPlaying,
  onToggle,
  energy,
  stage,
  styleName = 'Disco House',
  isTransitioning = false,
  transitionProgress = 0
}) => {
  const stageInfo = STAGE_LABELS[stage] || STAGE_LABELS.idle;
  const stageColor = STAGE_COLORS[stage] || STAGE_COLORS.idle;
  const styleInfo = STYLE_INFO[styleName] || { icon: '🎵', color: '#ffffff' };

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

        {/* Play/Pause Button */}
        <button
          onClick={onToggle}
          className="pointer-events-auto bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white px-6 py-2 rounded-full transition-all active:scale-95 font-semibold"
        >
          {isPlaying ? "PAUSE" : "START ENGINE"}
        </button>
      </div>

      {/* Center - Call to Action (Only when paused) */}
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

      {/* Bottom - Energy Meter with 5 Stages */}
      <div className="w-full max-w-lg mx-auto">

        {/* Current Style Display (NEW) */}
        {isPlaying && (
          <div className="text-center mb-3">
            <div
              className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full backdrop-blur-sm transition-all duration-500 ${isTransitioning ? 'animate-pulse' : ''
                }`}
              style={{
                backgroundColor: `${styleInfo.color}20`,
                borderColor: `${styleInfo.color}40`,
                borderWidth: '1px'
              }}
            >
              <span className="text-lg">{styleInfo.icon}</span>
              <span
                className="text-sm font-medium transition-colors duration-300"
                style={{ color: styleInfo.color }}
              >
                {styleName}
              </span>
              {isTransitioning && (
                <span className="text-white/60 text-xs ml-1">
                  → Switching...
                </span>
              )}
            </div>
          </div>
        )}

        {/* Current Stage Display */}
        {isPlaying && (
          <div className="text-center mb-4">
            <span
              className="text-2xl font-bold transition-colors duration-300"
              style={{ color: stageColor }}
            >
              {stageInfo.cn}
            </span>
            <span className="text-white/40 text-sm ml-2">
              {stageInfo.en}
            </span>
          </div>
        )}

        {/* Stage Labels */}
        <div className="flex justify-between text-xs text-white/50 mb-2 uppercase tracking-widest">
          <span style={{ color: stage === 'idle' ? STAGE_COLORS.idle : undefined }}>Idle</span>
          <span style={{ color: stage === 'awakening' ? STAGE_COLORS.awakening : undefined }}>Awaken</span>
          <span style={{ color: stage === 'groove' ? STAGE_COLORS.groove : undefined }}>Groove</span>
          <span style={{ color: stage === 'flow' ? STAGE_COLORS.flow : undefined }}>Flow</span>
          <span style={{ color: stage === 'euphoria' ? STAGE_COLORS.euphoria : undefined }}>Euphoria</span>
        </div>

        {/* Energy Bar */}
        <div className="h-3 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm relative">
          {/* Stage markers */}
          <div className="absolute inset-0 flex">
            <div className="w-1/5 border-r border-white/10"></div>
            <div className="w-1/5 border-r border-white/10"></div>
            <div className="w-1/5 border-r border-white/10"></div>
            <div className="w-1/5 border-r border-white/10"></div>
            <div className="w-1/5"></div>
          </div>

          {/* Progress fill */}
          <div
            className="h-full transition-all duration-100 ease-linear rounded-full relative z-10"
            style={{
              width: `${Math.min(energy * 100, 100)}%`,
              background: `linear-gradient(90deg, ${STAGE_COLORS.idle}, ${STAGE_COLORS.awakening}, ${STAGE_COLORS.groove}, ${STAGE_COLORS.flow}, ${STAGE_COLORS.euphoria})`,
              boxShadow: `0 0 15px ${stageColor}, 0 0 30px ${stageColor}40`
            }}
          />

          {/* Transition indicator overlay */}
          {isTransitioning && (
            <div
              className="absolute top-0 left-0 h-full bg-white/30 transition-all duration-200"
              style={{ width: `${transitionProgress * 100}%` }}
            />
          )}
        </div>

        {/* Energy percentage */}
        <div className="text-center mt-2 text-white/40 text-xs">
          {Math.round(energy * 100)}%
        </div>
      </div>

    </div>
  );
};

export default Controls;