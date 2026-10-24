import React from 'react';
import { Volume2, VolumeX, Pause, Play, Settings } from 'lucide-react';

interface BattleHUDProps {
  matchTime: number;
  playerCrowns: number;
  enemyCrowns: number;
  isPaused: boolean;
  gameSpeed: number;
  isMuted: boolean;
  onTogglePause: () => void;
  onToggleSpeed: () => void;
  onToggleMute: () => void;
  sectorName: string;
}

export const BattleHUD: React.FC<BattleHUDProps> = ({
  matchTime,
  playerCrowns,
  enemyCrowns,
  isPaused,
  gameSpeed,
  isMuted,
  onTogglePause,
  onToggleSpeed,
  onToggleMute,
}) => {
  const minutes = Math.floor(matchTime / 60);
  const seconds = Math.floor(matchTime % 60);
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  const isOvertime = matchTime <= 60 && matchTime > 0;

  return (
    <header className="w-full max-w-[480px] mx-auto px-2 py-1 flex items-center justify-between text-slate-100 select-none pointer-events-auto z-20">
      {/* 1. Left: Exact ROBO ARENA Logo from reference image */}
      <div className="flex items-center">
        <img
          src="/assets/aistudio/logo_robo_arena.png"
          alt="ROBO ARENA"
          className="h-9 sm:h-10 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
          onError={(e) => {
            // Fallback stylized lockup
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
        <div className="hidden flex-col leading-none ml-1">
          <span className="font-black text-sm tracking-widest text-sky-400 drop-shadow">ROBO</span>
          <span className="font-extrabold text-[10px] tracking-wider text-amber-400">ARENA</span>
        </div>
      </div>

      {/* 2. Center: Blue Match Timer Capsule with "1 vs 1" matching attachment */}
      <div className="flex flex-col items-center">
        <div
          className={`px-3 py-0.5 rounded-full border shadow-lg flex items-center gap-1.5 transition-all ${
            isOvertime
              ? 'bg-amber-950/90 text-amber-300 border-amber-500 animate-pulse shadow-amber-500/20'
              : 'bg-gradient-to-b from-sky-600 to-blue-800 text-white border-sky-400/80 shadow-[0_0_12px_rgba(14,165,233,0.5)]'
          }`}
        >
          <span className="font-mono font-black text-sm sm:text-base tracking-wider tabular-nums drop-shadow-md">
            {timeFormatted}
          </span>
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-[10px] font-bold tracking-wider text-sky-300 uppercase drop-shadow">
            1 vs 1
          </span>
          <span className="text-[9px] text-slate-400">·</span>
          <span className="text-[10px] font-mono text-amber-300 font-bold">
            👑 {playerCrowns} - {enemyCrowns}
          </span>
        </div>
      </div>

      {/* 3. Right: Enemy Profile badge "INIMIGO 🏆 1250" and control buttons */}
      <div className="flex items-center gap-1.5">
        {/* Enemy Badge matching reference */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 border border-red-500/40 rounded-full pl-1 pr-2 py-0.5 shadow-md">
          {/* Red Enemy Avatar */}
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-500 to-rose-700 flex items-center justify-center border border-red-300 text-white shadow-inner shrink-0">
            <span className="text-xs">🤖</span>
          </div>

          <div className="flex flex-col items-start leading-tight">
            <span className="text-[9px] font-extrabold text-red-400 uppercase tracking-wider">
              INIMIGO
            </span>
            <div className="flex items-center gap-0.5">
              <span className="text-[9px]">🏆</span>
              <span className="text-[9px] font-mono font-bold text-amber-300">1250</span>
            </div>
          </div>
        </div>

        {/* Speed toggle button (e.g. x1 / x1.5) matching attachment */}
        <button
          type="button"
          onClick={onToggleSpeed}
          className={`px-1.5 py-1 rounded-md text-[10px] font-mono font-extrabold border transition-all ${
            gameSpeed > 1
              ? 'bg-sky-500 text-slate-950 border-sky-300 shadow-[0_0_8px_rgba(56,189,248,0.6)]'
              : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:border-slate-500'
          }`}
          title="Velocidade"
        >
          {gameSpeed}x
        </button>

        {/* Audio mute button */}
        <button
          type="button"
          onClick={onToggleMute}
          className="p-1 rounded-md bg-slate-900/90 border border-slate-700 text-slate-400 hover:text-white transition-colors"
          title={isMuted ? 'Ativar som' : 'Silenciar'}
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-sky-400" />}
        </button>

        {/* Pause/Settings button */}
        <button
          type="button"
          onClick={onTogglePause}
          className="p-1 rounded-md bg-slate-900/90 border border-slate-700 text-slate-400 hover:text-white transition-colors"
          title={isPaused ? 'Continuar' : 'Pausar'}
        >
          {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5" />}
        </button>
      </div>
    </header>
  );
};
