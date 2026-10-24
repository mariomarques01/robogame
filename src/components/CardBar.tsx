import React from 'react';
import { RobotId, PlayerCardState } from '../types/game';
import { ROBOT_DECK } from '../data/robots';
import { Zap, Sparkles, Info } from 'lucide-react';

interface CardBarProps {
  playerEnergy: number;
  maxEnergy: number;
  selectedCardId: RobotId | null;
  onSelectCard: (id: RobotId | null) => void;
  cardsState: Record<RobotId, PlayerCardState>;
  controlledNodes: number;
  totalNodes: number;
  onInspectRobot: (id: RobotId) => void;
}

export const CardBar: React.FC<CardBarProps> = ({
  playerEnergy,
  maxEnergy,
  selectedCardId,
  onSelectCard,
  cardsState,
  controlledNodes,
  totalNodes,
  onInspectRobot,
}) => {
  return (
    <div className="w-full max-w-[480px] mx-auto px-2 pb-2 pt-1 flex flex-col gap-1.5 select-none pointer-events-auto z-20">
      {/* 1. Exactly 5 Upright Robot Cards matching the reference attachment */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2 items-end">
        {ROBOT_DECK.map((robot) => {
          const cardState = cardsState[robot.id];
          const isSelected = selectedCardId === robot.id;
          const canAfford = playerEnergy >= robot.cost;
          const isReadyToEvolve = cardState?.isReadyToEvolve;

          return (
            <div
              key={robot.id}
              onClick={() => {
                if (isSelected) {
                  onSelectCard(null);
                } else if (canAfford) {
                  onSelectCard(robot.id);
                }
              }}
              className={`relative group rounded-lg overflow-hidden cursor-pointer transition-all duration-150 transform flex flex-col ${
                isSelected
                  ? '-translate-y-2 ring-3 ring-sky-400 shadow-[0_0_18px_rgba(56,189,248,0.9)] z-10'
                  : canAfford
                  ? isReadyToEvolve
                    ? 'ring-2 ring-yellow-400 hover:-translate-y-1 shadow-[0_0_12px_rgba(250,204,21,0.5)]'
                    : 'ring-1 ring-slate-700/80 hover:ring-sky-400/80 hover:-translate-y-0.5 shadow-md'
                  : 'opacity-45 grayscale-[40%] cursor-not-allowed ring-1 ring-slate-800'
              }`}
            >
              {/* Card Artwork Image (Extracted from attachment) */}
              <div className="relative w-full aspect-[100/145] bg-slate-900 overflow-hidden">
                <img
                  src={robot.image}
                  alt={robot.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover select-none pointer-events-none"
                />

                {/* Evolution Pulsing Ring */}
                {isReadyToEvolve && (
                  <div className="absolute inset-0 border-2 border-yellow-400 rounded-lg animate-pulse pointer-events-none" />
                )}

                {/* Energy Cost Overlay Pill on Top-Left */}
                <div className="absolute top-1 left-1 bg-slate-950/90 border border-sky-400/80 rounded-md px-1 py-0.5 flex items-center gap-0.5 shadow-md">
                  <Zap className="w-2.5 h-2.5 text-sky-400 fill-sky-400" />
                  <span className="font-mono font-black text-[10px] text-sky-200 leading-none">
                    {robot.cost}
                  </span>
                </div>

                {/* Inspect Info Button on Top-Right */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onInspectRobot(robot.id);
                  }}
                  className="absolute top-1 right-1 p-0.5 rounded-full bg-slate-950/70 hover:bg-slate-900 text-slate-400 hover:text-white transition-colors"
                  title="Ver atributos"
                >
                  <Info className="w-2.5 h-2.5" />
                </button>

                {/* Insufficient Energy Lock Tint */}
                {!canAfford && (
                  <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center">
                    <span className="text-[10px] bg-slate-900/90 text-amber-300 font-mono font-bold px-1 py-0.5 rounded border border-amber-500/40">
                      {robot.cost}⚡
                    </span>
                  </div>
                )}
              </div>

              {/* Bottom Card Title Banner matching attachment */}
              <div
                className={`py-0.5 px-1 text-center transition-colors ${
                  isSelected
                    ? 'bg-sky-500 text-slate-950'
                    : isReadyToEvolve
                    ? 'bg-yellow-500 text-slate-950'
                    : 'bg-slate-900 text-slate-200'
                }`}
              >
                <div className="text-[9px] sm:text-[10px] font-black tracking-tight truncate leading-tight">
                  {robot.name}
                </div>
                {isReadyToEvolve && (
                  <div className="text-[8px] font-extrabold flex items-center justify-center gap-0.5 leading-none">
                    <Sparkles className="w-2 h-2" /> EVO
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Battery Energy Bar (Exact 10-Segment horizontal layout from attachment) */}
      <div className="flex items-center justify-between bg-slate-950/90 border border-slate-800 rounded-full px-3 py-1 shadow-xl">
        {/* Left: ⚡ Energy Readout */}
        <div className="flex items-center gap-1.5 shrink-0 pr-2">
          <div className="w-6 h-6 rounded-full bg-sky-500/20 border border-sky-400/60 flex items-center justify-center shadow-[0_0_8px_rgba(56,189,248,0.5)]">
            <Zap className="w-3.5 h-3.5 text-sky-400 fill-sky-400 animate-pulse" />
          </div>
          <span className="font-mono font-black text-base text-sky-300 tabular-nums leading-none">
            {playerEnergy}
          </span>
          <span className="font-mono text-xs text-slate-500 leading-none">
            /{maxEnergy}
          </span>
        </div>

        {/* Center: 10 Rounded Battery Segments */}
        <div className="flex-1 flex items-center gap-1 px-1">
          {Array.from({ length: 10 }).map((_, idx) => {
            const isFilled = idx < playerEnergy;
            const isAvailableCapacity = idx < maxEnergy;

            return (
              <div
                key={idx}
                className={`h-3 flex-1 rounded-sm transition-all duration-200 ${
                  isFilled
                    ? 'bg-gradient-to-t from-sky-500 via-sky-400 to-cyan-300 shadow-[0_0_8px_rgba(56,189,248,0.85)] border-t border-sky-200'
                    : isAvailableCapacity
                    ? 'bg-slate-800/80 border border-slate-700/50'
                    : 'bg-slate-900/60 border border-slate-800/30 opacity-40'
                }`}
              />
            );
          })}
        </div>

        {/* Right: Recharge Nodes Captured */}
        <div className="flex items-center gap-1 pl-2 text-[10px] shrink-0 font-mono">
          <span className="text-slate-400 hidden xs:inline">Nós:</span>
          <span
            className={`font-black ${
              controlledNodes > 0 ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            ⚡ {controlledNodes}/{totalNodes}
          </span>
        </div>
      </div>
    </div>
  );
};
