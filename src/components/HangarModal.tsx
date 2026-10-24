import React, { useState } from 'react';
import { RobotId, PlayerCardState } from '../types/game';
import { ROBOT_DECK } from '../data/robots';
import { X, Zap, Shield, Crosshair, ArrowUpCircle, Sparkles, Award } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface HangarModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardsState: Record<RobotId, PlayerCardState>;
  scrap: number;
  onUpgradeRobot: (id: RobotId, cost: number) => void;
  initialRobotId?: RobotId | null;
}

export const HangarModal: React.FC<HangarModalProps> = ({
  isOpen,
  onClose,
  cardsState,
  scrap,
  onUpgradeRobot,
  initialRobotId,
}) => {
  const [selectedId, setSelectedId] = useState<RobotId>(initialRobotId || 'scout-x');

  if (!isOpen) return null;

  const currentRobot = ROBOT_DECK.find((r) => r.id === selectedId) || ROBOT_DECK[0];
  const currentState = cardsState[selectedId] || { level: 1, summonCount: 0, isReadyToEvolve: false };
  const nextLevel = currentState.level + 1;
  const upgradeCost = currentState.level * 60;
  const canUpgrade = scrap >= upgradeCost && currentState.level < 5;

  const levelMultiplier = 1 + (currentState.level - 1) * 0.1;
  const currentHp = Math.round(currentRobot.hp * levelMultiplier);
  const currentDmg = Math.round(currentRobot.damage * levelMultiplier);

  const nextHp = Math.round(currentRobot.hp * (1 + currentState.level * 0.1));
  const nextDmg = Math.round(currentRobot.damage * (1 + currentState.level * 0.1));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>Oficina Mecha & Hangar de Evoluções</span>
            </h2>
            <div className="flex items-center gap-1 bg-slate-800/80 border border-slate-700 rounded px-2 py-0.5 text-xs text-amber-300 font-mono">
              <span>🔩 Sucata:</span>
              <span className="font-bold tabular-nums">{scrap}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col md:flex-row gap-5">
          {/* Left Column: Robot Deck Thumbnails */}
          <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible shrink-0 pb-1 md:pb-0 md:w-48">
            {ROBOT_DECK.map((robot) => {
              const state = cardsState[robot.id];
              const isSelected = robot.id === selectedId;

              return (
                <button
                  key={robot.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(robot.id);
                    soundManager.playLaser(440, 220, 0.05);
                  }}
                  className={`flex items-center gap-3 p-2 rounded-lg border text-left transition-all shrink-0 w-36 md:w-full ${
                    isSelected
                      ? 'border-cyan-400 bg-cyan-950/40 shadow-sm'
                      : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                  }`}
                >
                  <img
                    src={robot.image}
                    alt={robot.name}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded object-cover border border-slate-700 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-200 truncate">
                      {robot.name}
                    </div>
                    <div className="text-[10px] text-cyan-400 font-mono">
                      Nível {state?.level || 1}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Column: Detailed Robot Card & Evolution Showcase */}
          <div className="flex-1 flex flex-col gap-4">
            {/* Robot Identity Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              <div className="flex items-center gap-3">
                <img
                  src={currentRobot.image}
                  alt={currentRobot.name}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-lg object-cover border-2 border-cyan-500/40 shadow-md"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">{currentRobot.name}</h3>
                    <span className="text-xs font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                      Nível {currentState.level}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {currentRobot.codename} · {currentRobot.roleLabel}
                  </p>
                </div>
              </div>

              {/* Upgrade Button */}
              {currentState.level < 5 ? (
                <button
                  type="button"
                  disabled={!canUpgrade}
                  onClick={() => {
                    onUpgradeRobot(selectedId, upgradeCost);
                    soundManager.playNodeCharge();
                  }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    canUpgrade
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md cursor-pointer'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <ArrowUpCircle className="w-4 h-4" />
                  <span>Melhorar (🔩 {upgradeCost})</span>
                </button>
              ) : (
                <div className="flex items-center gap-1 text-xs text-yellow-400 font-semibold px-2 py-1 bg-yellow-950/40 border border-yellow-700/50 rounded">
                  <Award className="w-4 h-4" /> Nível Máximo
                </div>
              )}
            </div>

            {/* Description */}
            <p className="text-xs text-slate-300 leading-relaxed">
              {currentRobot.description}
            </p>

            {/* Combat Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">Custo de Energia</span>
                <span className="text-sm font-mono font-bold text-cyan-300 flex items-center gap-1 mt-0.5">
                  <Zap className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
                  {currentRobot.cost} Células
                </span>
              </div>

              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">Pontos de Vida</span>
                <span className="text-sm font-mono font-bold text-emerald-400 mt-0.5 block tabular-nums">
                  {currentHp} {canUpgrade && <span className="text-xs text-slate-400">→ {nextHp}</span>}
                </span>
              </div>

              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">Dano por Ataque</span>
                <span className="text-sm font-mono font-bold text-red-400 mt-0.5 block tabular-nums">
                  {currentDmg > 0 ? currentDmg : 'Cura +45/s'}{' '}
                  {canUpgrade && currentDmg > 0 && <span className="text-xs text-slate-400">→ {nextDmg}</span>}
                </span>
              </div>

              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">Alvo Prioritário</span>
                <span className="text-xs font-semibold text-slate-200 mt-0.5 block truncate">
                  {currentRobot.targetLabel}
                </span>
              </div>
            </div>

            {/* Evolution Spotlight Box */}
            <div className="p-3.5 rounded-lg border border-yellow-500/40 bg-gradient-to-r from-yellow-950/30 via-slate-900 to-yellow-950/20">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <h4 className="text-xs font-bold text-yellow-300 uppercase tracking-wide">
                  Habilidade de Evolução: {currentRobot.evolutionName}
                </h4>
              </div>
              <p className="text-xs text-yellow-100/90 leading-relaxed">
                {currentRobot.evolutionPerk}
              </p>
              <div className="mt-2 text-[10px] text-yellow-300/80 flex items-center gap-1.5">
                <span>Ciclo:</span>
                <span className="font-semibold">
                  A cada {currentRobot.evolutionCycle} invocações na partida, a próxima carta entra em modo EVOLUÇÃO!
                </span>
              </div>
            </div>

            {/* Tactical Arena Energy Node Synergy */}
            <div className="p-3 rounded-lg border border-cyan-800/50 bg-cyan-950/20 text-xs text-cyan-200/90 flex flex-col gap-1">
              <span className="font-semibold text-cyan-300 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" /> Dica de Arena de Recarga:
              </span>
              <span>
                Para desbloquear e usar continuamente este robô na batalha, mantenha seus robôs ocupando os Nós de Recarga Alfa, Beta e o Reator Central!
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Voltar à Arena
          </button>
        </div>
      </div>
    </div>
  );
};
