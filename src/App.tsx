/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameEngine } from './game/GameEngine';
import { RobotId, Team, PlayerCardState, ArenaSector } from './types/game';
import { ARENA_SECTORS, ROBOT_DECK } from './data/robots';
import { ArenaCanvas } from './components/ArenaCanvas';
import { HangarModal } from './components/HangarModal';
import { GameOverModal } from './components/GameOverModal';
import { soundManager } from './utils/audio';

type GameScreen = 'PLAYING' | 'GAME_OVER';

export default function App() {
  const [screen, setScreen] = useState<GameScreen>('PLAYING');
  const [selectedSector] = useState<ArenaSector>(ARENA_SECTORS[0]);
  const [scrap, setScrap] = useState<number>(200);
  const [isHangarOpen, setIsHangarOpen] = useState<boolean>(false);
  const [inspectRobotId, setInspectRobotId] = useState<RobotId | null>('scout-x');

  // In-Game UI states
  const [winner, setWinner] = useState<Team | null>(null);
  const [playerCrowns, setPlayerCrowns] = useState<number>(0);
  const [enemyCrowns, setEnemyCrowns] = useState<number>(0);
  const [selectedCardId, setSelectedCardId] = useState<RobotId | null>(null);

  // Cards State matching the 5 mechas
  const [cardsState, setCardsState] = useState<Record<RobotId, PlayerCardState>>({
    'scout-x': { robotId: 'scout-x', summonCount: 0, isReadyToEvolve: false, level: 1 },
    'tank-01': { robotId: 'tank-01', summonCount: 0, isReadyToEvolve: false, level: 1 },
    'volt-7': { robotId: 'volt-7', summonCount: 0, isReadyToEvolve: false, level: 1 },
    'med-bot': { robotId: 'med-bot', summonCount: 0, isReadyToEvolve: false, level: 1 },
    'omega': { robotId: 'omega', summonCount: 0, isReadyToEvolve: false, level: 1 },
  });

  // Game Engine instance ref
  const engineRef = useRef<GameEngine | null>(null);

  if (!engineRef.current) {
    engineRef.current = new GameEngine({
      onEnergyChange: () => {},
      onTowersChange: () => {},
      onNodeStateChange: () => {},
      onGameOver: (winningTeam, crowns) => {
        setWinner(winningTeam);
        setPlayerCrowns(crowns.player);
        setEnemyCrowns(crowns.enemy);
        if (winningTeam === 'player') {
          setScrap((prev) => prev + 150);
        } else {
          setScrap((prev) => prev + 35);
        }
        setScreen('GAME_OVER');
      },
      onCardEvolutionReady: (robotId) => {
        setCardsState((prev) => ({
          ...prev,
          [robotId]: { ...prev[robotId], isReadyToEvolve: true },
        }));
      },
      onNodeActivated: () => {},
    });
  }

  const engine = engineRef.current;

  // Start / Restart match
  const handleRestart = useCallback(() => {
    if (!engine) return;
    engine.reset(selectedSector.aiDifficulty, selectedSector.aiSpawnInterval);
    Object.entries(cardsState).forEach(([id, state]) => {
      engine.setCardLevel(id as RobotId, state.level);
    });
    engine.isRunning = true;
    engine.isPaused = false;
    setSelectedCardId(null);
    setWinner(null);
    setScreen('PLAYING');
  }, [engine, selectedSector, cardsState]);

  // Handle Deploy Unit
  const handleDeploy = (robotId: RobotId, x: number, y: number) => {
    if (!engine) return;
    const success = engine.deployRobot(robotId, 'player', x, y);
    if (success) {
      setSelectedCardId(null);
      setCardsState({ ...engine.playerCardsState });
    }
  };

  // Upgrade Robot in Hangar
  const handleUpgradeRobot = (robotId: RobotId, cost: number) => {
    if (scrap < cost) return;
    setScrap((prev) => prev - cost);
    setCardsState((prev) => {
      const nextLevel = (prev[robotId]?.level || 1) + 1;
      const updated = {
        ...prev,
        [robotId]: { ...prev[robotId], level: nextLevel },
      };
      if (engine) {
        engine.setCardLevel(robotId, nextLevel);
      }
      return updated;
    });
  };

  // Keyboard Shortcuts (1-5 to select cards, M to mute, Esc for Hangar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (screen !== 'PLAYING') return;

      if (e.key >= '1' && e.key <= '5') {
        const index = parseInt(e.key, 10) - 1;
        const robot = ROBOT_DECK[index];
        if (robot) {
          if (selectedCardId === robot.id) {
            setSelectedCardId(null);
          } else if (engine.playerEnergy >= robot.cost) {
            soundManager.playLaser(550, 300, 0.05);
            setSelectedCardId(robot.id);
          }
        }
      } else if (e.code === 'Escape') {
        setIsHangarOpen((prev) => !prev);
      } else if (e.key === 'm' || e.key === 'M') {
        soundManager.toggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screen, selectedCardId, engine]);

  return (
    <main className="w-full min-h-[100dvh] bg-slate-950 flex flex-col items-center justify-center overflow-x-hidden font-sans select-none p-0">
      {/* Exact 2:3 vertical aspect ratio mobile framing */}
      <div className="relative w-full max-w-[512px] aspect-[1024/1536] flex-none overflow-hidden shadow-2xl bg-black">
        {/* Fullscreen Master Arena with native 1024x1536 HUD, cards & gameplay */}
        <ArenaCanvas
          engine={engine}
          selectedCardId={selectedCardId}
          onSelectCard={setSelectedCardId}
          onDeploy={handleDeploy}
          onOpenHangar={() => {
            setInspectRobotId(selectedCardId || 'scout-x');
            setIsHangarOpen(true);
          }}
          onToggleSpeed={() => {
            const nextSpeed = engine.gameSpeed === 1 ? 1.5 : 1;
            engine.gameSpeed = nextSpeed;
          }}
        />

        {/* Game Over Modal */}
        {screen === 'GAME_OVER' && winner && (
          <GameOverModal
            winner={winner}
            playerCrowns={playerCrowns}
            enemyCrowns={enemyCrowns}
            scrapEarned={winner === 'player' ? selectedSector.rewardScrap : 35}
            onRestart={handleRestart}
            onBackToMenu={handleRestart}
            onOpenHangar={() => {
              setInspectRobotId('scout-x');
              setIsHangarOpen(true);
            }}
          />
        )}

        {/* Robot Workshop & Hangar Modal */}
        <HangarModal
          isOpen={isHangarOpen}
          onClose={() => setIsHangarOpen(false)}
          cardsState={cardsState}
          scrap={scrap}
          onUpgradeRobot={handleUpgradeRobot}
          initialRobotId={inspectRobotId}
        />
      </div>
      <a href={`${import.meta.env.BASE_URL}scout-preview.html`} className="block w-full max-w-[512px] text-center bg-cyan-950 text-cyan-100 py-3 font-semibold text-sm">Visualizar SCOUT-X em 3D (protótipo) ↗</a>
    </main>
  );
}
