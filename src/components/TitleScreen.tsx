import React, { useEffect } from 'react';
import { ArenaSector } from '../types/game';
import { ARENA_SECTORS, ROBOT_DECK } from '../data/robots';
import { Play, Wrench, Zap, Trophy, Shield } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface TitleScreenProps {
  onStartGame: (sector: ArenaSector) => void;
  onOpenHangar: () => void;
  selectedSector: ArenaSector;
  onSelectSector: (sector: ArenaSector) => void;
  scrap: number;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartGame,
  onOpenHangar,
  selectedSector,
  onSelectSector,
  scrap,
}) => {
  // Support Enter or Space to start
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onStartGame(selectedSector);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStartGame, selectedSector]);

  return (
    <div className="relative w-full h-full flex flex-col justify-between items-center bg-slate-950 text-slate-100 p-3 select-none overflow-y-auto">
      {/* Background Cyber Glow & Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_20%,rgba(14,165,233,0.18),transparent)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:2.5rem_2.5rem] opacity-30 pointer-events-none" />

      {/* Top Header Bar */}
      <header className="w-full flex items-center justify-between z-10 pt-1">
        <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-full px-3 py-1 shadow-sm">
          <span className="text-xs text-slate-400">🔩 Sucata:</span>
          <span className="font-mono font-bold text-xs text-amber-300 tabular-nums">
            {scrap}
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            soundManager.playLaser(500, 250, 0.08);
            onOpenHangar();
          }}
          className="flex items-center gap-1 px-3 py-1 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-sky-500/40 text-xs font-semibold text-sky-300 transition-colors shadow-sm"
        >
          <Wrench className="w-3.5 h-3.5 text-sky-400" />
          <span>Hangar Mecha</span>
        </button>
      </header>

      {/* Main Content: Vertical Mobile Card Layout */}
      <div className="w-full flex flex-col items-center text-center my-auto py-2 z-10 gap-3">
        {/* ROBO ARENA Logo Image */}
        <div className="flex flex-col items-center">
          <img
            src="/assets/aistudio/logo_robo_arena.png"
            alt="ROBO ARENA"
            className="w-56 sm:w-64 h-auto drop-shadow-[0_4px_16px_rgba(56,189,248,0.5)] mb-1"
          />
          <span className="text-[11px] font-bold tracking-widest text-sky-400 uppercase">
            Batalha de Robôs 1 vs 1 · Estilo Clash Royale
          </span>
        </div>

        {/* Short tactical briefing */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 max-w-xs text-left shadow-md">
          <div className="flex items-center gap-1.5 mb-1 text-sky-300 font-bold text-xs">
            <Zap className="w-3.5 h-3.5 text-sky-400" />
            <span>Mecânica de Batalha:</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Avance com seus robôs mechas até os <strong className="text-sky-300">Nós de Recarga ⚡</strong> na arena para acumular energia, desbloquear cartas superiores e derrubar as torres inimigas!
          </p>
        </div>

        {/* Deck Preview Row (Exact 5 cards from attachment) */}
        <div className="w-full max-w-xs">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="text-[10px] font-semibold text-slate-400">
              Seu Deck de 5 Robôs:
            </span>
            <span className="text-[10px] font-mono text-amber-300">
              🏆 1250 Troféus
            </span>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {ROBOT_DECK.map((robot) => (
              <div
                key={robot.id}
                className="relative rounded-lg border border-slate-700/80 overflow-hidden bg-slate-900 aspect-[100/145] shadow-md group hover:border-sky-400 transition-colors"
                title={`${robot.name} (${robot.roleLabel})`}
              >
                <img
                  src={robot.image}
                  alt={robot.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-0.5 left-0.5 bg-slate-950/90 text-[8px] font-mono font-bold text-sky-300 px-1 rounded">
                  {robot.cost}⚡
                </div>
                <div className="absolute bottom-0 inset-x-0 bg-slate-950/90 text-[7px] font-bold text-white text-center py-0.2 truncate px-0.5">
                  {robot.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Primary Start CTA Button */}
        <button
          type="button"
          onClick={() => {
            soundManager.playLaser(700, 350, 0.12);
            onStartGame(selectedSector);
          }}
          className="w-full max-w-xs py-3.5 px-6 rounded-2xl font-black text-sm text-slate-950 bg-gradient-to-r from-sky-400 via-cyan-300 to-sky-400 hover:from-sky-300 hover:to-cyan-200 shadow-lg shadow-sky-500/30 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
        >
          <Play className="w-5 h-5 fill-slate-950" />
          <span>BATALHAR AGORA</span>
        </button>
      </div>

      {/* Footer */}
      <footer className="w-full text-center py-1 text-[10px] text-slate-500 z-10 font-mono">
        ROBO ARENA · Modo Vertical Mobile First
      </footer>
    </div>
  );
};
