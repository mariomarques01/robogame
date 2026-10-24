import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from '../game/GameEngine';
import { RobotId, Unit, Tower, EnergyNode, Projectile, Particle, FloatingText } from '../types/game';
import { ROBOT_DECK } from '../data/robots';
import { soundManager } from '../utils/audio';

// Pristine clean background matching 100% of user attachment without static painted units/lasers
const ARENA_IMAGE_SRC = `${import.meta.env.BASE_URL}assets/aistudio/arena_live_bg.png`;

// Character avatar images
const robotAvatars: Record<RobotId, string> = {
  'scout-x': `${import.meta.env.BASE_URL}assets/aistudio/robot_scout_x.png`,
  'tank-01': `${import.meta.env.BASE_URL}assets/aistudio/robot_tank_01.png`,
  'volt-7': `${import.meta.env.BASE_URL}assets/aistudio/robot_volt_7.png`,
  'med-bot': `${import.meta.env.BASE_URL}assets/aistudio/robot_med_bot.png`,
  'omega': `${import.meta.env.BASE_URL}assets/aistudio/robot_omega.png`,
};

// 5 Card Bounds in 1024x1536 space
const CARD_BOUNDS: { id: RobotId; x: number; y: number; w: number; h: number }[] = [
  { id: 'scout-x', x: 28, y: 1192, w: 188, h: 232 },
  { id: 'tank-01', x: 224, y: 1192, w: 188, h: 232 },
  { id: 'volt-7', x: 420, y: 1192, w: 188, h: 232 },
  { id: 'med-bot', x: 616, y: 1192, w: 188, h: 232 },
  { id: 'omega', x: 812, y: 1192, w: 188, h: 232 },
];

// Interactive UI Buttons in 1024x1536 space
const BTN_SETTINGS = { x: 915, y: 70, w: 70, h: 50 };
const BTN_SPEED = { x: 915, y: 125, w: 70, h: 50 };

interface ArenaCanvasProps {
  engine: GameEngine;
  selectedCardId: RobotId | null;
  onSelectCard: (id: RobotId | null) => void;
  onDeploy: (robotId: RobotId, x: number, y: number) => void;
  onOpenHangar: () => void;
  onToggleSpeed: () => void;
}

export const ArenaCanvas: React.FC<ArenaCanvasProps> = ({
  engine,
  selectedCardId,
  onSelectCard,
  onDeploy,
  onOpenHangar,
  onToggleSpeed,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  // Preloaded image assets
  const arenaImgRef = useRef<HTMLImageElement | null>(null);
  const robotImagesRef = useRef<Record<RobotId, HTMLImageElement | null>>({
    'scout-x': null,
    'tank-01': null,
    'volt-7': null,
    'med-bot': null,
    'omega': null,
  });

  useEffect(() => {
    const bg = new Image();
    bg.src = ARENA_IMAGE_SRC;
    bg.onload = () => {
      arenaImgRef.current = bg;
    };

    Object.entries(robotAvatars).forEach(([id, src]) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        robotImagesRef.current[id as RobotId] = img;
      };
    });
  }, []);

  // Convert client pointer to 1024x1536 canvas coordinates
  const getCanvasCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = 1024 / rect.width;
    const scaleY = 1536 / rect.height;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    return {
      x: Math.max(0, Math.min(1024, x)),
      y: Math.max(0, Math.min(1536, y)),
    };
  };

  // Deployment zone: Player side (Y between 660 and 1180)
  const isValidDeploymentZone = (x: number, y: number): boolean => {
    const enemyLeftDead = engine.towers.find((t) => t.id === 'enemy-left')?.hp === 0;
    const enemyRightDead = engine.towers.find((t) => t.id === 'enemy-right')?.hp === 0;

    let minY = 660; // River line
    if (enemyLeftDead && x < 512) minY = 420;
    if (enemyRightDead && x >= 512) minY = 420;

    return y >= minY && y <= 1180;
  };

  // Pointer Down handles: 1) Card selection, 2) UI buttons, 3) Deploy mecha
  const handlePointerDown = (e: React.PointerEvent) => {
    const coords = getCanvasCoords(e.clientX, e.clientY);
    if (!coords) return;

    // 1. Check UI Button: Settings Gear
    if (
      coords.x >= BTN_SETTINGS.x &&
      coords.x <= BTN_SETTINGS.x + BTN_SETTINGS.w &&
      coords.y >= BTN_SETTINGS.y &&
      coords.y <= BTN_SETTINGS.y + BTN_SETTINGS.h
    ) {
      soundManager.playLaser(500, 250, 0.05);
      onOpenHangar();
      return;
    }

    // 2. Check UI Button: Speed Toggle
    if (
      coords.x >= BTN_SPEED.x &&
      coords.x <= BTN_SPEED.x + BTN_SPEED.w &&
      coords.y >= BTN_SPEED.y &&
      coords.y <= BTN_SPEED.y + BTN_SPEED.h
    ) {
      soundManager.playLaser(600, 300, 0.05);
      onToggleSpeed();
      return;
    }

    // 3. Check Card Tray clicks
    for (const card of CARD_BOUNDS) {
      if (
        coords.x >= card.x &&
        coords.x <= card.x + card.w &&
        coords.y >= card.y &&
        coords.y <= card.y + card.h
      ) {
        const robotDef = ROBOT_DECK.find((r) => r.id === card.id);
        if (!robotDef) return;

        if (selectedCardId === card.id) {
          onSelectCard(null);
        } else if (engine.playerEnergy >= robotDef.cost) {
          soundManager.playLaser(650, 320, 0.06);
          onSelectCard(card.id);
        } else {
          soundManager.playError();
          engine.addFloatingText('ENERGIA INSUFICIENTE!', coords.x, coords.y - 30, '#ef4444', 20);
        }
        return;
      }
    }

    // 4. Check Arena Deploy
    if (selectedCardId) {
      if (isValidDeploymentZone(coords.x, coords.y)) {
        onDeploy(selectedCardId, coords.x, coords.y);
      } else {
        soundManager.playError();
        engine.addFloatingText('ZONA INVÁLIDA!', coords.x, coords.y - 20, '#ef4444', 18);
      }
      setHoverPos(null);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!selectedCardId) {
      if (hoverPos) setHoverPos(null);
      return;
    }
    const coords = getCanvasCoords(e.clientX, e.clientY);
    if (coords && coords.y <= 1180) {
      setHoverPos(coords);
    } else {
      setHoverPos(null);
    }
  };

  // 60fps Game Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      // Update simulation
      engine.update(dt);

      ctx.save();

      // Camera Shake
      if (engine.shakeAmount > 0) {
        const shakeX = (Math.random() - 0.5) * engine.shakeAmount * 1.5;
        const shakeY = (Math.random() - 0.5) * engine.shakeAmount * 1.5;
        ctx.translate(shakeX, shakeY);
      }

      // 1. Draw Master Arena Background (1024x1536 full frame)
      if (arenaImgRef.current && arenaImgRef.current.complete) {
        ctx.drawImage(arenaImgRef.current, 0, 0, 1024, 1536);
      } else {
        ctx.fillStyle = '#0a0f1d';
        ctx.fillRect(0, 0, 1024, 1536);
      }

      // 2. Animated Flowing River Currents & Caustic Ripples
      drawFlowingRiver(ctx, time);

      // 3. Dynamic Towers & Turrets Overlay (Aiming barrels, muzzle flares, live HP)
      drawDynamicTowers(ctx, engine.towers, engine.units, time);

      // 4. Dynamic Recharge Nodes (Spinning tech rings, pulsing conduits, power generation)
      drawDynamicEnergyNodes(ctx, engine.nodes, engine.units, time);

      // 5. Holographic Deployment Grid (when card is selected)
      if (selectedCardId) {
        drawHolographicDeploymentGrid(ctx, time);
      }

      // 6. Live Combat Units: 3D Mechas, walk cycles, combat auras, live HP bars
      drawLiveUnits(ctx, engine.units, robotImagesRef.current, time);

      // 7. Projectiles: Lasers, mortar shells, nanite repair beams, purple lightning
      drawLiveProjectiles(ctx, engine.projectiles);

      // 8. Dynamic Particles: Sparks, smoke, explosions
      drawLiveParticles(ctx, engine.particles);

      // 9. Floating Combat Damage & Energy Numbers
      drawLiveFloatingTexts(ctx, engine.floatingTexts);

      // 10. Dynamic Top HUD Overlay: Real-Time Timer & Crowns
      drawTopHUDOverlay(ctx, engine);

      // 11. Card Tray Selection Glow & Lock States
      drawCardTrayOverlay(ctx, selectedCardId, engine.playerEnergy);

      // 12. Energy Battery Fluid Meter (⚡ X and 10 segments)
      drawEnergyMeterOverlay(ctx, engine.playerEnergy, engine.maxPlayerEnergy, time);

      // 13. Selected Card Deployment Reticle Preview
      if (selectedCardId && hoverPos) {
        const isValid = isValidDeploymentZone(hoverPos.x, hoverPos.y);
        drawDeployReticle(ctx, selectedCardId, hoverPos, isValid, robotImagesRef.current);
      }

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [engine, selectedCardId, hoverPos]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center overflow-hidden select-none touch-none"
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      onContextMenu={(e) => {
        e.preventDefault();
        onSelectCard(null);
      }}
    >
      <canvas
        ref={canvasRef}
        width={1024}
        height={1536}
        className="block w-full h-full cursor-pointer"
      />
    </div>
  );
};

// ==========================================
// DYNAMIC PROCEDURAL ARENA ANIMATIONS
// ==========================================

// 1. Flowing River Animation (y: 590..680, excluding bridges)
function drawFlowingRiver(ctx: CanvasRenderingContext2D, time: number) {
  const t = time * 0.002;
  ctx.save();

  // Water Canal region clip (left channel x: 80..220, right channel x: 800..945, center sub-channels)
  const channels = [
    { x1: 90, x2: 215 },
    { x1: 285, x2: 435 },
    { x1: 580, x2: 725 },
    { x1: 795, x2: 935 },
  ];

  for (const ch of channels) {
    const w = ch.x2 - ch.x1;
    const grad = ctx.createLinearGradient(ch.x1, 595, ch.x1, 685);
    grad.addColorStop(0, 'rgba(2, 132, 199, 0.35)');
    grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.45)');
    grad.addColorStop(1, 'rgba(3, 105, 161, 0.35)');

    ctx.fillStyle = grad;
    ctx.fillRect(ch.x1, 595, w, 90);

    // Dynamic wave ripples
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = ch.x1; x <= ch.x2; x += 4) {
      const y1 = 620 + Math.sin(x * 0.05 + t * 4) * 5 + Math.cos(x * 0.03 - t * 2) * 3;
      if (x === ch.x1) ctx.moveTo(x, y1);
      else ctx.lineTo(x, y1);
    }
    ctx.stroke();

    ctx.strokeStyle = 'rgba(103, 232, 249, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = ch.x1; x <= ch.x2; x += 4) {
      const y2 = 655 + Math.sin(x * 0.04 - t * 3) * 6 + Math.cos(x * 0.06 + t * 3) * 3;
      if (x === ch.x1) ctx.moveTo(x, y2);
      else ctx.lineTo(x, y2);
    }
    ctx.stroke();
  }

  ctx.restore();
}

// 2. Dynamic Towers & Turrets with Live Aiming & HP
function drawDynamicTowers(
  ctx: CanvasRenderingContext2D,
  towers: Tower[],
  units: Unit[],
  time: number
) {
  const t = time * 0.001;

  for (const tower of towers) {
    let barX = 512;
    let barY = 88;
    let barW = 140;
    let barH = 14;

    if (tower.id === 'enemy-king') {
      barX = 512; barY = 88; barW = 140; barH = 14;
    } else if (tower.id === 'enemy-left') {
      barX = 265; barY = 145; barW = 105; barH = 12;
    } else if (tower.id === 'enemy-right') {
      barX = 740; barY = 145; barW = 105; barH = 12;
    } else if (tower.id === 'player-king') {
      barX = 500; barY = 990; barW = 140; barH = 14;
    } else if (tower.id === 'player-left') {
      barX = 225; barY = 1005; barW = 105; barH = 12;
    } else if (tower.id === 'player-right') {
      barX = 785; barY = 1005; barW = 105; barH = 12;
    }

    if (tower.hp <= 0) {
      // Destroyed ruin state
      ctx.save();
      ctx.beginPath();
      ctx.arc(tower.x, tower.y, tower.radius * 0.85, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Smoke particles
      const smokeOffset = (Math.sin(t * 8) * 6);
      ctx.fillStyle = 'rgba(100, 116, 139, 0.5)';
      ctx.beginPath();
      ctx.arc(tower.x + smokeOffset, tower.y - 20, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('DESTRUÍDA', tower.x, tower.y + 6);
      ctx.restore();
      continue;
    }

    const isPlayer = tower.team === 'player';
    const teamColor = isPlayer ? '#0284c7' : '#ef4444';
    const accentColor = isPlayer ? '#38bdf8' : '#f87171';

    // 1. Tower Aiming Turret
    const targetUnit = tower.targetId ? units.find((u) => u.id === tower.targetId && u.hp > 0) : null;
    let aimAngle = isPlayer ? -Math.PI / 2 : Math.PI / 2;
    if (targetUnit) {
      aimAngle = Math.atan2(targetUnit.y - tower.y, targetUnit.x - tower.x);
    } else {
      // Subtle idle scan sweep
      aimAngle += Math.sin(t * 2 + (isPlayer ? 0 : Math.PI)) * 0.2;
    }

    ctx.save();
    ctx.translate(tower.x, tower.y);

    // Pulsing Core Light
    const corePulse = 0.8 + Math.sin(t * 6) * 0.2;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fillStyle = isPlayer ? `rgba(56, 189, 248, ${0.4 * corePulse})` : `rgba(239, 68, 68, ${0.4 * corePulse})`;
    ctx.fill();

    // Twin Rotating Laser Barrels
    ctx.rotate(aimAngle);

    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2.5;

    // Turret mount
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Dual Barrels
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(8, -8, 22, 5);
    ctx.fillRect(8, 3, 22, 5);
    ctx.strokeRect(8, -8, 22, 5);
    ctx.strokeRect(8, 3, 22, 5);

    // Muzzle flash when actively firing
    const timeSinceAttack = performance.now() / 1000 - tower.lastAttackTime;
    if (timeSinceAttack < 0.15) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(32, -5, 10, 0, Math.PI * 2);
      ctx.arc(32, 5, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(32, 0, 18, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();

    // 2. Continuous Live HP Bar
    ctx.save();
    const hpRatio = Math.max(0, tower.hp / tower.maxHp);

    // Background container
    ctx.fillStyle = '#070b14';
    ctx.fillRect(barX - barW / 2 - 2, barY - 18, barW + 4, barH + 22);

    // HP Bar Frame
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(barX - barW / 2, barY, barW, barH);

    // Dynamic HP fill color: green/cyan -> yellow -> red
    let fillColor = teamColor;
    if (hpRatio < 0.3) fillColor = '#ef4444';
    else if (hpRatio < 0.6) fillColor = '#eab308';

    ctx.fillStyle = fillColor;
    ctx.fillRect(barX - barW / 2, barY, barW * hpRatio, barH);

    // Metallic frame border
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(barX - barW / 2, barY, barW, barH);

    // Text: Current HP
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 4;
    ctx.fillText(`${tower.hp}`, barX, barY - 4);

    ctx.restore();
  }
}

// 3. Dynamic Recharge Nodes (Torres de Recarga)
function drawDynamicEnergyNodes(
  ctx: CanvasRenderingContext2D,
  nodes: EnergyNode[],
  units: Unit[],
  time: number
) {
  const t = time * 0.002;

  for (const node of nodes) {
    const isPlayer = node.owner === 'player';
    const isEnemy = node.owner === 'enemy';
    const color = isPlayer ? '#38bdf8' : isEnemy ? '#ef4444' : '#f59e0b';

    ctx.save();
    ctx.translate(node.x, node.y);

    // Rotating High-Tech Outer Ring
    ctx.rotate(isPlayer ? t : -t);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;

    // 6-tooth power ring
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      ctx.beginPath();
      ctx.arc(0, 0, node.radius * 0.85, a, a + 0.4);
      ctx.stroke();
    }

    ctx.restore();

    // Pulsing central lightning bolt icon
    ctx.save();
    const pulseScale = 1.0 + Math.sin(t * 5 + node.pulsePhase) * 0.15;
    ctx.translate(node.x, node.y);
    ctx.scale(pulseScale, pulseScale);

    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.font = '900 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡', 0, 0);
    ctx.restore();

    // Electrical conduits to occupying units
    const occupyingUnits = units.filter(
      (u) => Math.hypot(u.x - node.x, u.y - node.y) <= node.radius + u.radius + 30
    );

    if (occupyingUnits.length > 0) {
      ctx.save();
      for (const u of occupyingUnits) {
        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(u.x, u.y);
        ctx.strokeStyle = u.team === 'player' ? '#38bdf8' : '#ef4444';
        ctx.lineWidth = 4;
        ctx.shadowColor = u.team === 'player' ? '#38bdf8' : '#ef4444';
        ctx.shadowBlur = 10;
        ctx.stroke();
      }
      ctx.restore();
    }

    // Capture Progress Circle
    if (node.chargeProgress > 0 && node.chargeProgress < 100) {
      ctx.save();
      const chargeAngle = (node.chargeProgress / 100) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius + 12, -Math.PI / 2, -Math.PI / 2 + chargeAngle);
      ctx.strokeStyle = node.capturingTeam === 'player' ? '#38bdf8' : '#ef4444';
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.restore();
    }

    // Traveling Energy Pulses to Player Battery (when player owns node)
    if (isPlayer) {
      ctx.save();
      const cycle = (time * 0.0015) % 1.0;
      const startY = node.y;
      const targetY = 1440;
      const currentY = startY + (targetY - startY) * cycle;

      ctx.beginPath();
      ctx.arc(node.x, currentY, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.restore();
    }
  }
}

// 4. Holographic Deployment Grid
function drawHolographicDeploymentGrid(ctx: CanvasRenderingContext2D, time: number) {
  ctx.save();
  const scanY = 660 + ((time * 0.15) % 520);

  // Hexagonal/Grid pattern
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
  ctx.lineWidth = 1;

  for (let x = 60; x <= 960; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 660);
    ctx.lineTo(x, 1180);
    ctx.stroke();
  }

  for (let y = 660; y <= 1180; y += 60) {
    ctx.beginPath();
    ctx.moveTo(60, y);
    ctx.lineTo(960, y);
    ctx.stroke();
  }

  // Scanning laser beam
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(60, scanY);
  ctx.lineTo(960, scanY);
  ctx.stroke();

  ctx.restore();
}

// 5. Live Units Rendering
function drawLiveUnits(
  ctx: CanvasRenderingContext2D,
  units: Unit[],
  robotImages: Record<RobotId, HTMLImageElement | null>,
  time: number
) {
  for (const unit of units) {
    if (unit.hp <= 0) continue;
    ctx.save();

    const isPlayer = unit.team === 'player';
    const teamColor = isPlayer ? '#38bdf8' : '#ef4444';
    const img = robotImages[unit.robotId];

    // Walk & bobbing animation
    const walkPhase = unit.walkCycle || 0;
    const hoverBob = Math.abs(Math.sin(walkPhase)) * 4;
    const walkTilt = Math.sin(walkPhase) * 0.08;

    const renderX = unit.x;
    const renderY = unit.y - hoverBob;

    // Ground Shadow
    ctx.beginPath();
    ctx.ellipse(
      unit.x,
      unit.y + unit.radius * 0.7,
      unit.radius * 1.1,
      unit.radius * 0.45,
      0,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fill();

    // Holographic Base Ring (Cyan for player, Red for enemy)
    ctx.save();
    ctx.translate(unit.x, unit.y + unit.radius * 0.6);
    ctx.scale(1, 0.5);
    ctx.beginPath();
    ctx.arc(0, 0, unit.radius * 1.35, 0, Math.PI * 2);
    ctx.strokeStyle = teamColor;
    ctx.lineWidth = 4;
    ctx.shadowColor = teamColor;
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.restore();

    // 3D Robot Figure
    ctx.save();
    ctx.translate(renderX, renderY);
    ctx.rotate(walkTilt);

    // Recoil on shooting
    if (unit.recoil && unit.recoil > 0) {
      const recoilDist = unit.recoil * 8;
      const rAngle = unit.facingAngle || (isPlayer ? -Math.PI / 2 : Math.PI / 2);
      ctx.translate(-Math.cos(rAngle) * recoilDist, -Math.sin(rAngle) * recoilDist);
    }

    // Evolution Halo
    if (unit.isEvolved) {
      ctx.beginPath();
      ctx.arc(0, 0, unit.radius * 1.4, 0, Math.PI * 2);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 12;
      ctx.stroke();

      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('👑', 0, -unit.radius - 18);
    }

    // Tank Shield Barrier
    if (unit.shieldHp && unit.shieldHp > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, unit.radius * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3.5;
      ctx.stroke();
    }

    // Draw Character from 3D Artwork
    const avatarRadius = unit.radius * unit.scale;
    if (img && img.complete) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, avatarRadius, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(
        img,
        -avatarRadius,
        -avatarRadius,
        avatarRadius * 2,
        avatarRadius * 2
      );

      // Enemy aggressive red wash
      if (!isPlayer) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.45)';
        ctx.fillRect(-avatarRadius, -avatarRadius, avatarRadius * 2, avatarRadius * 2);
      }
      ctx.restore();

      // Outer Metallic Bevel Ring
      ctx.beginPath();
      ctx.arc(0, 0, avatarRadius, 0, Math.PI * 2);
      ctx.strokeStyle = teamColor;
      ctx.lineWidth = 3.5;
      ctx.stroke();
    }

    // Bespoke combat auras
    if (unit.robotId === 'med-bot') {
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✚', 0, -avatarRadius - 8);
    } else if (unit.robotId === 'omega') {
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, avatarRadius + 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore(); // restore unit body

    // Health Bar (Green for player, Red for enemy)
    const hpBarWidth = Math.max(48, unit.radius * 2.2);
    const hpBarHeight = 7;
    const hpBarY = renderY - unit.radius * unit.scale - 16;
    const hpRatio = Math.max(0, unit.hp / unit.maxHp);

    ctx.fillStyle = '#020617';
    ctx.fillRect(renderX - hpBarWidth / 2 - 1, hpBarY - 1, hpBarWidth + 2, hpBarHeight + 2);
    ctx.fillStyle = isPlayer ? '#22c55e' : '#ef4444';
    ctx.fillRect(renderX - hpBarWidth / 2, hpBarY, hpBarWidth * hpRatio, hpBarHeight);

    ctx.restore();
  }
}

// 6. Projectiles
function drawLiveProjectiles(ctx: CanvasRenderingContext2D, projectiles: Projectile[]) {
  for (const proj of projectiles) {
    ctx.save();

    if (proj.type === 'nanite') {
      // Med-Bot dynamic nanite healing beam
      ctx.beginPath();
      ctx.moveTo(proj.x, proj.y);
      ctx.lineTo(proj.targetX, proj.targetY);
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 5;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 10;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(proj.x, proj.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#86efac';
      ctx.fill();
    } else if (proj.type === 'missile') {
      // Tank dual cannon plasma shells
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, 9, 0, Math.PI * 2);
      ctx.fillStyle = '#f97316';
      ctx.fill();
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 12;
      ctx.stroke();
    } else if (proj.color === '#c084fc') {
      // Omega purple lightning beam
      ctx.beginPath();
      ctx.moveTo(proj.x, proj.y);
      ctx.lineTo(proj.targetX, proj.targetY);
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 5.5;
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 14;
      ctx.stroke();
    } else {
      // Standard Laser beam
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = proj.color;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(proj.x, proj.y, 11, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.fill();
    }

    ctx.restore();
  }
}

// 7. Particles
function drawLiveParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    ctx.save();
    const alpha = 1 - p.life / p.maxLife;
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.fillStyle = p.color;

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// 8. Floating Texts
function drawLiveFloatingTexts(ctx: CanvasRenderingContext2D, texts: FloatingText[]) {
  for (const ft of texts) {
    ctx.save();
    const alpha = 1 - ft.life / ft.maxLife;
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.font = `bold ${ft.size || 20}px sans-serif`;
    ctx.fillStyle = ft.color;
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 6;
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }
}

// 9. Top HUD
function drawTopHUDOverlay(ctx: CanvasRenderingContext2D, engine: GameEngine) {
  const minutes = Math.floor(engine.matchTime / 60);
  const seconds = Math.floor(engine.matchTime % 60);
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  ctx.save();
  ctx.fillStyle = '#031738';
  ctx.beginPath();
  ctx.roundRect(440, 10, 144, 42, 21);
  ctx.fill();

  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.font = '900 28px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 8;
  ctx.fillText(timeFormatted, 512, 31);

  ctx.shadowBlur = 0;
  ctx.font = '800 14px sans-serif';
  ctx.fillStyle = '#fde047';
  ctx.fillText(`1 vs 1 · 👑 ${engine.playerCrowns} - ${engine.enemyCrowns}`, 512, 63);

  if (engine.gameSpeed > 1) {
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.roundRect(915, 125, 70, 50, 10);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 20px monospace';
    ctx.fillText(`${engine.gameSpeed}x`, 950, 150);
  }

  ctx.restore();
}

// 10. Card Tray Overlay
function drawCardTrayOverlay(
  ctx: CanvasRenderingContext2D,
  selectedCardId: RobotId | null,
  playerEnergy: number
) {
  for (const card of CARD_BOUNDS) {
    const isSelected = selectedCardId === card.id;
    const robotDef = ROBOT_DECK.find((r) => r.id === card.id);
    const canAfford = robotDef ? playerEnergy >= robotDef.cost : true;

    if (isSelected) {
      ctx.save();
      const lift = -12;

      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 24;

      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.roundRect(card.x - 2, card.y + lift - 2, card.w + 4, card.h + 4, 16);
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(card.x, card.y + lift, card.w, card.h, 14);
      ctx.stroke();

      ctx.restore();
    } else if (!canAfford) {
      ctx.save();
      ctx.fillStyle = 'rgba(3, 7, 18, 0.55)';
      ctx.beginPath();
      ctx.roundRect(card.x, card.y, card.w, card.h, 14);
      ctx.fill();
      ctx.restore();
    }
  }
}

// 11. Energy Meter
function drawEnergyMeterOverlay(
  ctx: CanvasRenderingContext2D,
  energy: number,
  maxEnergy: number,
  time: number
) {
  ctx.save();

  // Energy number (x: 102, y: 1455)
  ctx.font = '900 36px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#00f0ff';
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 10;
  ctx.fillText(`${energy}`, 102, 1455);

  const totalSlots = 10;
  const startX = 142;
  const totalW = 830;
  const slotW = (totalW - (totalSlots - 1) * 8) / totalSlots;
  const slotH = 22;
  const slotY = 1444;

  for (let i = 0; i < totalSlots; i++) {
    const x = startX + i * (slotW + 8);
    const isFilled = i < energy;

    if (isFilled) {
      const grad = ctx.createLinearGradient(x, slotY, x, slotY + slotH);
      grad.addColorStop(0, '#67e8f9');
      grad.addColorStop(0.5, '#00e5ff');
      grad.addColorStop(1, '#0284c7');

      ctx.fillStyle = grad;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 10;

      ctx.beginPath();
      ctx.roundRect(x, slotY, slotW, slotH, 4);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillRect(x + 2, slotY + 2, slotW - 4, 3);
    } else {
      ctx.fillStyle = 'rgba(10, 20, 40, 0.85)';
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.roundRect(x, slotY, slotW, slotH, 4);
      ctx.fill();

      ctx.strokeStyle = 'rgba(30, 58, 110, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  ctx.restore();
}

// 12. Deployment Reticle
function drawDeployReticle(
  ctx: CanvasRenderingContext2D,
  robotId: RobotId,
  pos: { x: number; y: number },
  isValid: boolean,
  robotImages: Record<RobotId, HTMLImageElement | null>
) {
  const robot = ROBOT_DECK.find((r) => r.id === robotId);
  if (!robot) return;

  ctx.save();
  const radius = robot.role === 'tank' ? 48 : 38;

  // Ground placement circle
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = isValid ? 'rgba(0, 240, 255, 0.35)' : 'rgba(239, 68, 68, 0.35)';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = isValid ? '#00f0ff' : '#ef4444';
  ctx.shadowColor = isValid ? '#00f0ff' : '#ef4444';
  ctx.shadowBlur = 12;
  ctx.stroke();

  // Attack range ring
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, robot.range * 1.8, 0, Math.PI * 2);
  ctx.strokeStyle = isValid ? 'rgba(0, 240, 255, 0.25)' : 'rgba(239, 68, 68, 0.25)';
  ctx.setLineDash([8, 8]);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.setLineDash([]);

  // Character preview
  const img = robotImages[robotId];
  if (img && img.complete) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, pos.x - radius, pos.y - radius, radius * 2, radius * 2);
    ctx.restore();
  }

  ctx.restore();
}
