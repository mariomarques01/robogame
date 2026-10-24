import React from 'react';
import { Team } from '../types/game';
import { Trophy, RotateCcw, Wrench, ArrowRight, Zap, ShieldAlert } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface GameOverModalProps {
  winner: Team;
  playerCrowns: number;
  enemyCrowns: number;
  scrapEarned: number;
  onRestart: () => void;
  onBackToMenu: () => void;
  onOpenHangar: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  winner,
  playerCrowns,
  enemyCrowns,
  scrapEarned,
  onRestart,
  onBackToMenu,
  onOpenHangar,
}) => {
  const isVictory = winner === 'player';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center overflow-hidden">
        {/* Glow backdrop */}
        <div
          className={`absolute -top-24 inset-x-0 h-48 rounded-full blur-3xl pointer-events-none ${
            isVictory ? 'bg-cyan-500/20' : 'bg-red-500/20'
          }`}
        />

        {/* Header Icon */}
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-3 shadow-lg ${
            isVictory
              ? 'bg-gradient-to-br from-cyan-400 to-blue-600 text-slate-950 shadow-cyan-500/30'
              : 'bg-gradient-to-br from-red-500 to-rose-700 text-white shadow-red-500/30'
          }`}
        >
          {isVictory ? (
            <Trophy className="w-8 h-8 fill-slate-950" />
          ) : (
            <ShieldAlert className="w-8 h-8" />
          )}
        </div>

        {/* Title */}
        <h2
          className={`text-2xl font-black tracking-wide ${
            isVictory ? 'text-cyan-300' : 'text-red-400'
          }`}
        >
          {isVictory ? 'VITÓRIA TÁTICA!' : 'NEXUS DERRUBADO!'}
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          {isVictory
            ? 'Você dominou os nós de recarga e esmagou as defesas inimigas.'
            : 'As forças mecha inimigas sobrepujaram suas defesas.'}
        </p>

        {/* Crown Score Comparison */}
        <div className="flex items-center justify-center gap-4 my-4 bg-slate-950/70 border border-slate-800/80 rounded-xl px-6 py-2.5 w-full">
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-400">Você</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-lg">👑</span>
              <span className="text-xl font-mono font-bold text-cyan-400 tabular-nums">
                {playerCrowns}
              </span>
            </div>
          </div>

          <span className="text-slate-600 font-bold text-sm">vs</span>

          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-400">Inimigo</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-xl font-mono font-bold text-red-400 tabular-nums">
                {enemyCrowns}
              </span>
              <span className="text-lg">👑</span>
            </div>
          </div>
        </div>

        {/* Rewards */}
        <div className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 mb-5 flex items-center justify-between">
          <span className="text-xs text-slate-300 font-medium">Recompensa da Batalha:</span>
          <span className="text-sm font-mono font-bold text-amber-300 flex items-center gap-1">
            <span>🔩 +{scrapEarned}</span>
            <span className="text-xs text-amber-400/80">Sucata</span>
          </span>
        </div>

        {/* Actions */}
        <div className="w-full flex flex-col gap-2">
          {/* Play Again (Primary CTA) */}
          <button
            type="button"
            onClick={() => {
              soundManager.playDeploy();
              onRestart();
            }}
            className="w-full py-3 px-4 rounded-xl font-bold text-xs text-slate-950 bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200 shadow-md shadow-cyan-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>JOGAR NOVAMENTE</span>
          </button>

          {/* Secondary Buttons */}
          <div className="grid grid-cols-2 gap-2 mt-1">
            <button
              type="button"
              onClick={onOpenHangar}
              className="py-2.5 px-3 rounded-lg text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5"
            >
              <Wrench className="w-3.5 h-3.5 text-cyan-400" />
              <span>Hangar</span>
            </button>

            <button
              type="button"
              onClick={onBackToMenu}
              className="py-2.5 px-3 rounded-lg text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Menu Principal</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
