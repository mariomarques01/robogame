import {
  Team,
  RobotId,
  Unit,
  Tower,
  EnergyNode,
  Projectile,
  Particle,
  FloatingText,
  PlayerCardState,
} from '../types/game';
import { ROBOT_DECK } from '../data/robots';
import { soundManager } from '../utils/audio';

export interface GameEngineCallbacks {
  onEnergyChange: (energy: number, maxEnergy: number) => void;
  onTowersChange: (playerKingHp: number, enemyKingHp: number) => void;
  onNodeStateChange: (controlledByPlayer: number, totalNodes: number) => void;
  onGameOver: (winner: Team, crowns: { player: number; enemy: number }) => void;
  onCardEvolutionReady: (robotId: RobotId) => void;
  onNodeActivated: (nodeName: string) => void;
}

export class GameEngine {
  public width = 1024;
  public height = 1536;

  // Simulation Entities
  public units: Unit[] = [];
  public towers: Tower[] = [];
  public nodes: EnergyNode[] = [];
  public projectiles: Projectile[] = [];
  public particles: Particle[] = [];
  public floatingTexts: FloatingText[] = [];

  // Match State
  public matchTime = 151; // 02:31 matching the attachment!
  public isRunning = true;
  public isPaused = false;
  public gameSpeed = 1;
  public winner: Team | null = null;
  public playerCrowns = 0;
  public enemyCrowns = 0;

  // Energy & Card Cycling (10 energy cap, starting with 5 matching the attachment!)
  public playerEnergy = 5;
  public maxPlayerEnergy = 10;
  public enemyEnergy = 5;
  public maxEnemyEnergy = 10;

  // Passive trickle is very slow; primary way to generate energy is via RECHARGE NODES!
  private playerPassiveTimer = 0;
  private enemyPassiveTimer = 0;

  // AI Behavior
  public aiSpawnInterval = 4.5;
  private aiTimer = 0;
  public aiDifficulty: 'easy' | 'medium' | 'hard' = 'medium';

  // Game Feel: Camera shake & hitstop
  public shakeAmount = 0;
  private hitstopTimer = 0;

  // Cards State
  public playerCardsState: Record<RobotId, PlayerCardState> = {
    'scout-x': { robotId: 'scout-x', summonCount: 0, isReadyToEvolve: false, level: 1 },
    'tank-01': { robotId: 'tank-01', summonCount: 0, isReadyToEvolve: false, level: 1 },
    'volt-7': { robotId: 'volt-7', summonCount: 0, isReadyToEvolve: false, level: 1 },
    'med-bot': { robotId: 'med-bot', summonCount: 0, isReadyToEvolve: false, level: 1 },
    'omega': { robotId: 'omega', summonCount: 0, isReadyToEvolve: false, level: 1 },
  };

  private callbacks: GameEngineCallbacks;

  constructor(callbacks: GameEngineCallbacks) {
    this.callbacks = callbacks;
    this.reset();
  }

  public reset(difficulty: 'easy' | 'medium' | 'hard' = 'medium', spawnInterval = 4.5) {
    this.units = [];
    this.projectiles = [];
    this.particles = [];
    this.floatingTexts = [];
    this.matchTime = 151; // 02:31
    this.playerEnergy = 5;
    this.enemyEnergy = 5;
    this.playerPassiveTimer = 0;
    this.enemyPassiveTimer = 0;
    this.aiTimer = 0;
    this.aiDifficulty = difficulty;
    this.aiSpawnInterval = spawnInterval;
    this.winner = null;
    this.playerCrowns = 0;
    this.enemyCrowns = 0;
    this.shakeAmount = 0;
    this.hitstopTimer = 0;

    this.initTowers();
    this.initNodes();
    this.spawnInitialBattle();

    this.callbacks.onEnergyChange(this.playerEnergy, this.maxPlayerEnergy);
    this.callbacks.onNodeStateChange(1, this.nodes.length);
  }

  public spawnUnitDirect(
    robotId: RobotId,
    team: Team,
    x: number,
    y: number,
    isEvolved = false
  ): Unit | null {
    const robotDef = ROBOT_DECK.find((r) => r.id === robotId);
    if (!robotDef) return null;

    const lane: 'left' | 'right' = x < 512 ? 'left' : 'right';
    const lvl = team === 'player' ? (this.playerCardsState[robotId]?.level || 1) : 1;
    const lvlMultiplier = 1 + (lvl - 1) * 0.1;
    const evoHpMult = isEvolved ? 1.35 : 1.0;
    const evoDmgMult = isEvolved ? 1.3 : 1.0;

    const baseHp = Math.round(robotDef.hp * lvlMultiplier * evoHpMult);
    const baseDamage = Math.round(robotDef.damage * lvlMultiplier * evoDmgMult);

    const unit: Unit = {
      id: `unit_${team}_${robotId}_${Date.now()}_${Math.random()}`,
      robotId,
      team,
      name: isEvolved ? `${robotDef.name} (Prime)` : robotDef.name,
      x,
      y,
      vx: 0,
      vy: 0,
      radius: robotDef.role === 'tank' ? 44 : robotDef.role === 'siege' ? 40 : 34,
      hp: baseHp,
      maxHp: baseHp,
      damage: baseDamage,
      range: robotDef.range * 1.8,
      speed: robotDef.speed * 1.8 * (isEvolved ? 1.15 : 1.0),
      attackSpeed: robotDef.attackSpeed * (isEvolved ? 1.2 : 1.0),
      targetType: robotDef.targetType,
      isFlying: false,
      isHealer: robotDef.role === 'support',
      isEvolved,
      lastAttackTime: 0,
      targetId: null,
      state: 'moving',
      lane,
      activeNodeId: null,
      color: robotDef.color,
      subIndex: 0,
      scale: isEvolved ? 1.18 : 1.0,
      facingAngle: team === 'player' ? -Math.PI / 2 : Math.PI / 2,
      walkCycle: Math.random() * 10,
      recoil: 0,
    };

    if (robotDef.id === 'tank-01' && isEvolved) {
      unit.shieldHp = 500;
      unit.maxShieldHp = 500;
    }

    this.units.push(unit);
    return unit;
  }

  private spawnInitialBattle() {
    // 1. Player squad confronting the enemy (active from frame 1!)
    this.spawnUnitDirect('scout-x', 'player', 215, 660);
    this.spawnUnitDirect('tank-01', 'player', 355, 740);
    this.spawnUnitDirect('med-bot', 'player', 490, 800);
    this.spawnUnitDirect('volt-7', 'player', 640, 750);
    this.spawnUnitDirect('omega', 'player', 765, 720);

    // 2. Enemy squad confronting across bridges & river
    this.spawnUnitDirect('tank-01', 'enemy', 450, 420);
    this.spawnUnitDirect('volt-7', 'enemy', 670, 500);
    this.spawnUnitDirect('omega', 'enemy', 840, 600);
    this.spawnUnitDirect('scout-x', 'enemy', 360, 360);
  }

  private initTowers() {
    this.towers = [
      // Enemy Base (Top)
      {
        id: 'enemy-king',
        team: 'enemy',
        type: 'king',
        name: 'Nexus Central Inimigo',
        x: 512,
        y: 195,
        radius: 75,
        hp: 3000,
        maxHp: 3000,
        range: 280,
        damage: 65,
        attackSpeed: 1.0,
        lastAttackTime: 0,
        targetId: null,
      },
      {
        id: 'enemy-left',
        team: 'enemy',
        type: 'guardian_left',
        name: 'Torre Guardiã Esquerda',
        x: 265,
        y: 215,
        radius: 55,
        hp: 2500,
        maxHp: 2500,
        range: 260,
        damage: 55,
        attackSpeed: 1.15,
        lastAttackTime: 0,
        targetId: null,
      },
      {
        id: 'enemy-right',
        team: 'enemy',
        type: 'guardian_right',
        name: 'Torre Guardiã Direita',
        x: 740,
        y: 215,
        radius: 55,
        hp: 2500,
        maxHp: 2500,
        range: 260,
        damage: 55,
        attackSpeed: 1.15,
        lastAttackTime: 0,
        targetId: null,
      },

      // Player Base (Bottom)
      {
        id: 'player-king',
        team: 'player',
        type: 'king',
        name: 'Nexus Central Aliado',
        x: 500,
        y: 1115,
        radius: 80,
        hp: 3000,
        maxHp: 3000,
        range: 280,
        damage: 65,
        attackSpeed: 1.0,
        lastAttackTime: 0,
        targetId: null,
      },
      {
        id: 'player-left',
        team: 'player',
        type: 'guardian_left',
        name: 'Torre Defensiva Esquerda',
        x: 225,
        y: 1070,
        radius: 55,
        hp: 2500,
        maxHp: 2500,
        range: 260,
        damage: 55,
        attackSpeed: 1.15,
        lastAttackTime: 0,
        targetId: null,
      },
      {
        id: 'player-right',
        team: 'player',
        type: 'guardian_right',
        name: 'Torre Defensiva Direita',
        x: 785,
        y: 1070,
        radius: 55,
        hp: 2500,
        maxHp: 2500,
        range: 260,
        damage: 55,
        attackSpeed: 1.15,
        lastAttackTime: 0,
        targetId: null,
      },
    ];
  }

  private initNodes() {
    this.nodes = [
      // 5 Nodes matching the attachment exactly in 1024x1536 space:
      {
        id: 'node-top-left',
        name: 'Nó Alfa (Norte Esq)',
        x: 255,
        y: 400,
        radius: 55,
        lane: 'left',
        owner: 'neutral',
        chargeProgress: 0,
        capturingTeam: null,
        rechargeCooldown: 0,
        energyPerCycle: 1,
        pulsePhase: 0,
      },
      {
        id: 'node-top-right',
        name: 'Nó Beta (Norte Dir)',
        x: 755,
        y: 405,
        radius: 55,
        lane: 'right',
        owner: 'enemy',
        chargeProgress: 100,
        capturingTeam: 'enemy',
        rechargeCooldown: 0,
        energyPerCycle: 1,
        pulsePhase: Math.PI * 0.5,
      },
      {
        id: 'node-center-reactor',
        name: 'Reator Central',
        x: 508,
        y: 642,
        radius: 75,
        lane: 'center',
        owner: 'neutral',
        chargeProgress: 0,
        capturingTeam: null,
        rechargeCooldown: 0,
        energyPerCycle: 2, // Overcharge node gives +2 cells!
        pulsePhase: Math.PI,
      },
      {
        id: 'node-bottom-left',
        name: 'Nó Gama (Sul Esq)',
        x: 235,
        y: 920,
        radius: 55,
        lane: 'left',
        owner: 'player',
        chargeProgress: 100,
        capturingTeam: 'player',
        rechargeCooldown: 0,
        energyPerCycle: 1,
        pulsePhase: Math.PI * 1.5,
      },
      {
        id: 'node-bottom-right',
        name: 'Nó Delta (Sul Dir)',
        x: 765,
        y: 920,
        radius: 55,
        lane: 'right',
        owner: 'neutral',
        chargeProgress: 0,
        capturingTeam: null,
        rechargeCooldown: 0,
        energyPerCycle: 1,
        pulsePhase: Math.PI * 0.25,
      },
    ];
  }

  public setCardLevel(robotId: RobotId, level: number) {
    if (this.playerCardsState[robotId]) {
      this.playerCardsState[robotId].level = level;
    }
  }

  // Deploy Unit from Deck
  public deployRobot(
    robotId: RobotId,
    team: Team,
    x: number,
    y: number
  ): boolean {
    const robotDef = ROBOT_DECK.find((r) => r.id === robotId);
    if (!robotDef) return false;

    // Check energy
    const currentEnergy = team === 'player' ? this.playerEnergy : this.enemyEnergy;
    if (currentEnergy < robotDef.cost) {
      if (team === 'player') {
        this.addFloatingText('SEM ENERGIA! ALCANCE OS NÓS!', x, y, '#ef4444');
      }
      return false;
    }

    // Deduct energy
    if (team === 'player') {
      this.playerEnergy -= robotDef.cost;
      this.callbacks.onEnergyChange(this.playerEnergy, this.maxPlayerEnergy);
    } else {
      this.enemyEnergy -= robotDef.cost;
    }

    // Check Evolution State
    let isEvolved = false;
    if (team === 'player') {
      const cardState = this.playerCardsState[robotId];
      cardState.summonCount += 1;
      if (cardState.isReadyToEvolve) {
        isEvolved = true;
        cardState.isReadyToEvolve = false;
        cardState.summonCount = 0;
        soundManager.playEvolution();
        this.addFloatingText(`EVOLUÇÃO: ${robotDef.evolutionName.toUpperCase()}!`, x, y - 20, '#facc15', 18);
        this.shake(6);
      } else if (cardState.summonCount >= robotDef.evolutionCycle) {
        cardState.isReadyToEvolve = true;
        this.callbacks.onCardEvolutionReady(robotId);
      }
    } else {
      if (this.aiDifficulty === 'hard' && Math.random() < 0.25) {
        isEvolved = true;
      }
    }

    soundManager.playDeploy();

    // Determine lane (Left or Right lane)
    const lane: 'left' | 'right' = x < 512 ? 'left' : 'right';

    // Stat multipliers
    const lvl = team === 'player' ? (this.playerCardsState[robotId]?.level || 1) : 1;
    const lvlMultiplier = 1 + (lvl - 1) * 0.1;
    const evoHpMult = isEvolved ? 1.35 : 1.0;
    const evoDmgMult = isEvolved ? 1.3 : 1.0;

    const baseHp = Math.round(robotDef.hp * lvlMultiplier * evoHpMult);
    const baseDamage = Math.round(robotDef.damage * lvlMultiplier * evoDmgMult);

    const count = robotDef.count;
    for (let i = 0; i < count; i++) {
      const offsetX = count > 1 ? (i - 1) * 44 : 0;
      const offsetY = count > 1 ? (i === 1 ? -24 : 16) : 0;

      const unit: Unit = {
        id: `unit_${team}_${robotId}_${Date.now()}_${i}_${Math.random()}`,
        robotId,
        team,
        name: isEvolved ? `${robotDef.name} (Prime)` : robotDef.name,
        x: x + offsetX,
        y: y + offsetY,
        vx: 0,
        vy: 0,
        radius: robotDef.role === 'tank' ? 44 : robotDef.role === 'siege' ? 40 : 34,
        hp: baseHp,
        maxHp: baseHp,
        damage: baseDamage,
        range: robotDef.range * 1.8,
        speed: robotDef.speed * 1.8 * (isEvolved ? 1.15 : 1.0),
        attackSpeed: robotDef.attackSpeed * (isEvolved ? 1.2 : 1.0),
        targetType: robotDef.targetType,
        isFlying: false,
        isHealer: robotDef.role === 'support',
        isEvolved,
        lastAttackTime: 0,
        targetId: null,
        state: 'moving',
        lane,
        activeNodeId: null,
        color: robotDef.color,
        subIndex: i,
        scale: isEvolved ? 1.18 : 1.0,
        facingAngle: team === 'player' ? -Math.PI / 2 : Math.PI / 2,
        walkCycle: Math.random() * 10,
        recoil: 0,
      };

      if (robotDef.id === 'tank-01' && isEvolved) {
        unit.shieldHp = 500;
        unit.maxShieldHp = 500;
      }

      this.units.push(unit);
      this.spawnParticleBurst(unit.x, unit.y, 8, isEvolved ? '#facc15' : unit.color);
    }

    return true;
  }

  // Update Game Loop
  public update(rawDt: number) {
    if (!this.isRunning || this.isPaused) return;

    const dt = Math.min(rawDt, 0.05) * this.gameSpeed;

    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return;
    }

    if (this.shakeAmount > 0) {
      this.shakeAmount = Math.max(0, this.shakeAmount - dt * 15);
    }

    this.matchTime -= dt;
    if (this.matchTime <= 0) {
      this.matchTime = 0;
      this.checkSuddenDeathOrEnd();
      return;
    }

    // Passive energy trickle: responsive real-time recharge
    this.playerPassiveTimer += dt;
    if (this.playerPassiveTimer >= 2.5) {
      this.playerPassiveTimer = 0;
      if (this.playerEnergy < this.maxPlayerEnergy) {
        this.playerEnergy = Math.min(this.maxPlayerEnergy, this.playerEnergy + 1);
        this.callbacks.onEnergyChange(this.playerEnergy, this.maxPlayerEnergy);
      }
    }

    this.enemyPassiveTimer += dt;
    if (this.enemyPassiveTimer >= 2.5) {
      this.enemyPassiveTimer = 0;
      if (this.enemyEnergy < this.maxEnemyEnergy) {
        this.enemyEnergy = Math.min(this.maxEnemyEnergy, this.enemyEnergy + 1);
      }
    }

    this.updateAI(dt);
    this.updateNodes(dt);
    this.updateTowers(dt);
    this.updateUnits(dt);
    this.updateProjectiles(dt);
    this.updateParticles(dt);
    this.updateFloatingTexts(dt);
  }

  private updateAI(dt: number) {
    this.aiTimer += dt;
    if (this.aiTimer >= this.aiSpawnInterval) {
      this.aiTimer = 0;

      const availableRobots = ROBOT_DECK.filter((r) => r.cost <= this.enemyEnergy);
      if (availableRobots.length > 0) {
        const chosen = availableRobots[Math.floor(Math.random() * availableRobots.length)];
        const laneX = Math.random() < 0.5 ? 265 : 740;
        const spawnY = 230 + Math.random() * 40;

        this.deployRobot(chosen.id, 'enemy', laneX, spawnY);
      }
    }
  }

  private updateNodes(dt: number) {
    let playerControlledCount = 0;

    for (const node of this.nodes) {
      node.pulsePhase += dt * 3;

      const unitsInNode = this.units.filter((u) => {
        const dx = u.x - node.x;
        const dy = u.y - node.y;
        return Math.hypot(dx, dy) <= node.radius + u.radius;
      });

      const playerUnits = unitsInNode.filter((u) => u.team === 'player');
      const enemyUnits = unitsInNode.filter((u) => u.team === 'enemy');

      const playerMedicBonus = playerUnits.some((u) => u.isHealer) ? 2.0 : 1.0;
      const enemyMedicBonus = enemyUnits.some((u) => u.isHealer) ? 2.0 : 1.0;

      for (const u of unitsInNode) {
        u.activeNodeId = node.id;
      }

      if (playerUnits.length > 0 && enemyUnits.length === 0) {
        const captureSpeed = 35 * dt * playerMedicBonus;
        if (node.owner !== 'player') {
          node.chargeProgress += captureSpeed;
          node.capturingTeam = 'player';
          if (node.chargeProgress >= 100) {
            node.chargeProgress = 100;
            node.owner = 'player';
            node.rechargeCooldown = 0;
            soundManager.playNodeCharge();
            this.addFloatingText(`RECARGA ATIVADA! +${node.energyPerCycle}⚡`, node.x, node.y - 25, '#38bdf8', 16);
            this.giveEnergy('player', node.energyPerCycle);
            this.callbacks.onNodeActivated(node.name);
            this.spawnParticleBurst(node.x, node.y, 20, '#38bdf8');
          }
        } else {
          node.rechargeCooldown += dt;
          if (node.rechargeCooldown >= 2.5) {
            node.rechargeCooldown = 0;
            soundManager.playNodeCharge();
            this.giveEnergy('player', node.energyPerCycle);
            this.addFloatingText(`+${node.energyPerCycle}⚡`, node.x, node.y - 20, '#38bdf8', 15);
            this.spawnParticleBurst(node.x, node.y, 12, '#38bdf8');
          }
        }
      } else if (enemyUnits.length > 0 && playerUnits.length === 0) {
        const captureSpeed = 35 * dt * enemyMedicBonus;
        if (node.owner !== 'enemy') {
          node.chargeProgress += captureSpeed;
          node.capturingTeam = 'enemy';
          if (node.chargeProgress >= 100) {
            node.chargeProgress = 100;
            node.owner = 'enemy';
            node.rechargeCooldown = 0;
            this.giveEnergy('enemy', node.energyPerCycle);
            this.addFloatingText('NÓ INIMIGO ATIVO!', node.x, node.y - 20, '#ef4444', 14);
            this.spawnParticleBurst(node.x, node.y, 15, '#ef4444');
          }
        } else {
          node.rechargeCooldown += dt;
          if (node.rechargeCooldown >= 2.5) {
            node.rechargeCooldown = 0;
            this.giveEnergy('enemy', node.energyPerCycle);
          }
        }
      } else if (unitsInNode.length === 0 && node.owner === 'neutral') {
        if (node.chargeProgress > 0) {
          node.chargeProgress = Math.max(0, node.chargeProgress - 15 * dt);
        }
      }

      if (node.owner === 'player') {
        playerControlledCount++;
      }
    }

    this.callbacks.onNodeStateChange(playerControlledCount, this.nodes.length);
  }

  private giveEnergy(team: Team, amount: number) {
    if (team === 'player') {
      const prev = this.playerEnergy;
      this.playerEnergy = Math.min(this.maxPlayerEnergy, this.playerEnergy + amount);
      if (this.playerEnergy !== prev) {
        this.callbacks.onEnergyChange(this.playerEnergy, this.maxPlayerEnergy);
      }
    } else {
      this.enemyEnergy = Math.min(this.maxEnemyEnergy, this.enemyEnergy + amount);
    }
  }

  private updateTowers(dt: number) {
    const now = performance.now() / 1000;

    for (const tower of this.towers) {
      if (tower.hp <= 0) continue;

      const enemyTeam: Team = tower.team === 'player' ? 'enemy' : 'player';
      const candidateUnits = this.units.filter(
        (u) => u.team === enemyTeam && u.hp > 0
      );

      if (tower.type === 'king') {
        const hasLostGuardian = this.towers.some(
          (t) => t.team === tower.team && t.type !== 'king' && t.hp <= 0
        );
        const hasTakenDamage = tower.hp < tower.maxHp;
        if (!hasLostGuardian && !hasTakenDamage) {
          continue;
        }
      }

      let closestTarget: Unit | null = null;
      let minDistance = tower.range;

      for (const unit of candidateUnits) {
        const dist = Math.hypot(unit.x - tower.x, unit.y - tower.y);
        if (dist <= minDistance) {
          minDistance = dist;
          closestTarget = unit;
        }
      }

      if (closestTarget) {
        tower.targetId = closestTarget.id;
        if (now - tower.lastAttackTime >= 1 / tower.attackSpeed) {
          tower.lastAttackTime = now;
          this.fireTowerAttack(tower, closestTarget);
        }
      } else {
        tower.targetId = null;
      }
    }
  }

  private fireTowerAttack(tower: Tower, target: Unit) {
    soundManager.playLaser(tower.team === 'player' ? 620 : 420, 200, 0.15);
    this.projectiles.push({
      id: `proj_${Date.now()}_${Math.random()}`,
      sourceId: tower.id,
      team: tower.team,
      x: tower.x,
      y: tower.y,
      targetX: target.x,
      targetY: target.y,
      targetUnitId: target.id,
      targetTowerId: null,
      speed: 420,
      damage: tower.damage,
      splashRadius: 0,
      isHealing: false,
      color: tower.team === 'player' ? '#38bdf8' : '#ef4444',
      type: 'laser',
    });
  }

  private updateUnits(dt: number) {
    const now = performance.now() / 1000;

    for (const unit of this.units) {
      if (unit.hp <= 0) continue;

      if (unit.recoil && unit.recoil > 0) {
        unit.recoil = Math.max(0, unit.recoil - dt * 5);
      }

      const opposingTeam: Team = unit.team === 'player' ? 'enemy' : 'player';

      if (unit.isHealer) {
        this.updateMedicBehavior(unit, dt, now);
        continue;
      }

      let targetUnit: Unit | null = null;
      let targetTower: Tower | null = null;

      if (unit.targetType === 'buildings-only') {
        targetTower = this.findNearestEnemyTower(unit, opposingTeam);
      } else {
        const enemies = this.units.filter((u) => u.team === opposingTeam && u.hp > 0);
        let minUnitDist = 150;
        for (const enemy of enemies) {
          const dist = Math.hypot(enemy.x - unit.x, enemy.y - unit.y);
          if (dist < minUnitDist) {
            minUnitDist = dist;
            targetUnit = enemy;
          }
        }

        if (!targetUnit) {
          targetTower = this.findNearestEnemyTower(unit, opposingTeam);
        }
      }

      let targetX = unit.x;
      let targetY = unit.team === 'player' ? 205 : 1115;

      if (targetUnit) {
        targetX = targetUnit.x;
        targetY = targetUnit.y;
        const dist = Math.hypot(targetX - unit.x, targetY - unit.y);

        if (dist <= unit.range) {
          unit.state = 'attacking';
          if (now - unit.lastAttackTime >= 1 / unit.attackSpeed) {
            unit.lastAttackTime = now;
            this.unitAttack(unit, targetUnit, null);
          }
          continue;
        }
      } else if (targetTower) {
        targetX = targetTower.x;
        targetY = targetTower.y;
        const dist = Math.hypot(targetX - unit.x, targetY - unit.y);

        if (dist <= unit.range + targetTower.radius) {
          unit.state = 'attacking';
          if (now - unit.lastAttackTime >= 1 / unit.attackSpeed) {
            unit.lastAttackTime = now;
            this.unitAttack(unit, null, targetTower);
          }
          continue;
        }
      }

      unit.state = 'moving';
      this.moveUnitTowards(unit, targetX, targetY, dt);
    }

    this.units = this.units.filter((u) => {
      if (u.hp <= 0) {
        soundManager.playExplosion(u.radius > 35);
        this.spawnParticleBurst(u.x, u.y, 20, u.color);
        return false;
      }
      return true;
    });
  }

  private updateMedicBehavior(unit: Unit, dt: number, now: number) {
    const allies = this.units.filter(
      (u) => u.team === unit.team && u.id !== unit.id && u.hp < u.maxHp
    );

    let mostDamaged: Unit | null = null;
    let lowestHpRatio = 1.0;

    for (const ally of allies) {
      const ratio = ally.hp / ally.maxHp;
      if (ratio < lowestHpRatio) {
        lowestHpRatio = ratio;
        mostDamaged = ally;
      }
    }

    if (mostDamaged) {
      const dist = Math.hypot(mostDamaged.x - unit.x, mostDamaged.y - unit.y);
      if (dist <= unit.range) {
        if (now - unit.lastAttackTime >= 1 / unit.attackSpeed) {
          unit.lastAttackTime = now;
          soundManager.playHeal();
          const healAmount = unit.isEvolved ? 120 : 80;
          mostDamaged.hp = Math.min(mostDamaged.maxHp, mostDamaged.hp + healAmount);
          this.addFloatingText(`+${healAmount}`, mostDamaged.x, mostDamaged.y - 25, '#34d399');
          this.spawnParticleBurst(mostDamaged.x, mostDamaged.y, 8, '#34d399', 'heal');

          this.projectiles.push({
            id: `heal_${Date.now()}_${Math.random()}`,
            sourceId: unit.id,
            team: unit.team,
            x: unit.x,
            y: unit.y,
            targetX: mostDamaged.x,
            targetY: mostDamaged.y,
            targetUnitId: mostDamaged.id,
            targetTowerId: null,
            speed: 600,
            damage: 0,
            splashRadius: 0,
            isHealing: true,
            color: '#34d399',
            type: 'nanite',
          });
        }
      } else {
        this.moveUnitTowards(unit, mostDamaged.x, mostDamaged.y, dt);
      }
    } else {
      const nearestNode = this.nodes.find((n) => n.owner !== unit.team) || this.nodes[2];
      this.moveUnitTowards(unit, nearestNode.x, nearestNode.y, dt);
    }
  }

  private moveUnitTowards(unit: Unit, destX: number, destY: number, dt: number) {
    const riverY = 642;
    const isPlayer = unit.team === 'player';

    let waypointX = destX;
    let waypointY = destY;

    if (!unit.isFlying) {
      const needsToCrossRiver = isPlayer
        ? unit.y > riverY && destY < riverY
        : unit.y < riverY && destY > riverY;

      if (needsToCrossRiver) {
        const bridgeX = unit.lane === 'left' ? 250 : 755;
        const atBridgeY = isPlayer ? riverY + 40 : riverY - 40;
        const reachedBridgeEntrance = Math.abs(unit.y - atBridgeY) < 35 && Math.abs(unit.x - bridgeX) < 55;

        if (!reachedBridgeEntrance) {
          waypointX = bridgeX;
          waypointY = atBridgeY;
        } else {
          waypointX = bridgeX;
          waypointY = isPlayer ? riverY - 60 : riverY + 60;
        }
      }
    }

    const dx = waypointX - unit.x;
    const dy = waypointY - unit.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 3) {
      const moveDist = unit.speed * 60 * dt;
      unit.x += (dx / dist) * moveDist;
      unit.y += (dy / dist) * moveDist;
      unit.facingAngle = Math.atan2(dy, dx);
      unit.walkCycle = (unit.walkCycle || 0) + dt * 10;
    }
  }

  private findNearestEnemyTower(unit: Unit, opposingTeam: Team): Tower | null {
    const candidates = this.towers.filter(
      (t) => t.team === opposingTeam && t.hp > 0
    );
    if (candidates.length === 0) return null;

    const laneGuardian = candidates.find((t) =>
      unit.lane === 'left' ? t.type === 'guardian_left' : t.type === 'guardian_right'
    );
    if (laneGuardian) return laneGuardian;

    const otherGuardian = candidates.find((t) => t.type !== 'king');
    if (otherGuardian) return otherGuardian;

    return candidates.find((t) => t.type === 'king') || null;
  }

  private unitAttack(unit: Unit, targetUnit: Unit | null, targetTower: Tower | null) {
    const targetX = targetUnit ? targetUnit.x : targetTower!.x;
    const targetY = targetUnit ? targetUnit.y : targetTower!.y;

    unit.facingAngle = Math.atan2(targetY - unit.y, targetX - unit.x);
    unit.recoil = 1.0;

    if (unit.robotId === 'tank-01') {
      soundManager.playMortar();
      this.projectiles.push({
        id: `mortar_${Date.now()}_${Math.random()}`,
        sourceId: unit.id,
        team: unit.team,
        x: unit.x,
        y: unit.y,
        targetX,
        targetY,
        targetUnitId: targetUnit?.id || null,
        targetTowerId: targetTower?.id || null,
        speed: 300,
        damage: unit.damage,
        splashRadius: unit.isEvolved ? 60 : 35,
        isHealing: false,
        color: '#fb923c',
        type: 'missile',
      });
      return;
    }

    if (unit.robotId === 'omega') {
      soundManager.playLaser(450, 150, 0.2);
      this.projectiles.push({
        id: `omega_${Date.now()}_${Math.random()}`,
        sourceId: unit.id,
        team: unit.team,
        x: unit.x,
        y: unit.y,
        targetX,
        targetY,
        targetUnitId: targetUnit?.id || null,
        targetTowerId: targetTower?.id || null,
        speed: 550,
        damage: unit.damage,
        splashRadius: 0,
        isHealing: false,
        color: '#c084fc',
        type: 'laser',
      });
      return;
    }

    const isVolt = unit.robotId === 'volt-7';
    soundManager.playLaser(isVolt ? 850 : 700, isVolt ? 400 : 300, 0.1);

    this.projectiles.push({
      id: `proj_${Date.now()}_${Math.random()}`,
      sourceId: unit.id,
      team: unit.team,
      x: unit.x,
      y: unit.y,
      targetX,
      targetY,
      targetUnitId: targetUnit?.id || null,
      targetTowerId: targetTower?.id || null,
      speed: 460,
      damage: unit.damage,
      splashRadius: 0,
      isHealing: false,
      color: unit.color,
      type: isVolt ? 'plasma' : 'laser',
    });
  }

  private applyDamage(
    targetUnit: Unit | null,
    targetTower: Tower | null,
    damage: number,
    attacker: Unit | null
  ) {
    if (targetUnit) {
      if (targetUnit.shieldHp && targetUnit.shieldHp > 0) {
        if (targetUnit.shieldHp >= damage) {
          targetUnit.shieldHp -= damage;
          if (attacker) {
            attacker.hp -= Math.round(damage * 0.25);
            this.addFloatingText('REFLECT!', targetUnit.x, targetUnit.y - 12, '#38bdf8');
          }
          this.addFloatingText(`-${damage}`, targetUnit.x, targetUnit.y - 8, '#94a3b8');
          return;
        } else {
          const remaining = damage - targetUnit.shieldHp;
          targetUnit.shieldHp = 0;
          targetUnit.hp -= remaining;
        }
      } else {
        targetUnit.hp -= damage;
      }

      this.addFloatingText(`-${damage}`, targetUnit.x, targetUnit.y - 8, targetUnit.team === 'player' ? '#f87171' : '#facc15');

      if (damage > 100) {
        this.hitstopTimer = 0.04;
        this.shake(4);
      }
    }

    if (targetTower) {
      targetTower.hp -= damage;
      this.addFloatingText(`-${damage}`, targetTower.x, targetTower.y - 12, targetTower.team === 'player' ? '#f87171' : '#fb923c');

      if (targetTower.hp <= 0) {
        targetTower.hp = 0;
        this.onTowerDestroyed(targetTower);
      }
    }
  }

  private onTowerDestroyed(tower: Tower) {
    soundManager.playExplosion(true);
    this.shake(12);
    this.spawnParticleBurst(tower.x, tower.y, 40, '#f97316');

    if (tower.team === 'enemy') {
      this.playerCrowns += tower.type === 'king' ? 3 : 1;
      this.addFloatingText('TORRE DESTRUÍDA! +1 COROA', tower.x, tower.y - 30, '#facc15', 18);
    } else {
      this.enemyCrowns += tower.type === 'king' ? 3 : 1;
      this.addFloatingText('TORRE PERDIDA!', tower.x, tower.y - 30, '#ef4444', 18);
    }

    const pKing = this.towers.find((t) => t.id === 'player-king')?.hp || 0;
    const eKing = this.towers.find((t) => t.id === 'enemy-king')?.hp || 0;
    this.callbacks.onTowersChange(pKing, eKing);

    if (tower.type === 'king') {
      const winner: Team = tower.team === 'player' ? 'enemy' : 'player';
      this.endGame(winner);
    }
  }

  private updateProjectiles(dt: number) {
    for (const proj of this.projectiles) {
      let destX = proj.targetX;
      let destY = proj.targetY;

      if (proj.targetUnitId) {
        const u = this.units.find((unit) => unit.id === proj.targetUnitId);
        if (u) {
          destX = u.x;
          destY = u.y;
        }
      } else if (proj.targetTowerId) {
        const t = this.towers.find((tow) => tow.id === proj.targetTowerId);
        if (t) {
          destX = t.x;
          destY = t.y;
        }
      }

      const dx = destX - proj.x;
      const dy = destY - proj.y;
      const dist = Math.hypot(dx, dy);
      const step = proj.speed * dt;

      if (dist <= step || dist < 6) {
        proj.damage = -1;
        if (!proj.isHealing) {
          soundManager.playExplosion(false);
          this.spawnParticleBurst(destX, destY, 8, proj.color);

          if (proj.splashRadius > 0) {
            const opposingTeam = proj.team === 'player' ? 'enemy' : 'player';
            const hitUnits = this.units.filter(
              (u) => u.team === opposingTeam && Math.hypot(u.x - destX, u.y - destY) <= proj.splashRadius
            );
            for (const u of hitUnits) {
              this.applyDamage(u, null, proj.damage, null);
            }
            const hitTowers = this.towers.filter(
              (t) => t.team === opposingTeam && Math.hypot(t.x - destX, t.y - destY) <= proj.splashRadius + t.radius
            );
            for (const t of hitTowers) {
              this.applyDamage(null, t, proj.damage, null);
            }
          } else {
            const u = this.units.find((unit) => unit.id === proj.targetUnitId);
            const t = this.towers.find((tow) => tow.id === proj.targetTowerId);
            this.applyDamage(u || null, t || null, proj.damage, null);
          }
        }
      } else {
        proj.x += (dx / dist) * step;
        proj.y += (dy / dist) * step;
      }
    }

    this.projectiles = this.projectiles.filter((p) => p.damage >= 0);
  }

  private updateParticles(dt: number) {
    for (const p of this.particles) {
      p.life += dt;
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
    }
    this.particles = this.particles.filter((p) => p.life < p.maxLife);
  }

  private updateFloatingTexts(dt: number) {
    for (const ft of this.floatingTexts) {
      ft.life += dt;
      ft.y -= 25 * dt;
    }
    this.floatingTexts = this.floatingTexts.filter((ft) => ft.life < ft.maxLife);
  }

  public spawnParticleBurst(x: number, y: number, count: number, color: string, type: Particle['type'] = 'spark') {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.8 + Math.random() * 2.5;
      this.particles.push({
        id: `p_${Math.random()}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 0.35 + Math.random() * 0.25,
        color,
        size: 2 + Math.random() * 3,
        type,
      });
    }
  }

  public addFloatingText(text: string, x: number, y: number, color = '#facc15', size = 13) {
    this.floatingTexts.push({
      id: `ft_${Date.now()}_${Math.random()}`,
      text,
      x,
      y,
      color,
      life: 0,
      maxLife: 0.9,
      size,
    });
  }

  public shake(amount: number) {
    this.shakeAmount = Math.min(15, this.shakeAmount + amount);
  }

  private checkSuddenDeathOrEnd() {
    const playerTowersAlive = this.towers.filter((t) => t.team === 'player' && t.hp > 0).length;
    const enemyTowersAlive = this.towers.filter((t) => t.team === 'enemy' && t.hp > 0).length;

    if (this.playerCrowns > this.enemyCrowns) {
      this.endGame('player');
    } else if (this.enemyCrowns > this.playerCrowns) {
      this.endGame('enemy');
    } else if (playerTowersAlive > enemyTowersAlive) {
      this.endGame('player');
    } else if (enemyTowersAlive > playerTowersAlive) {
      this.endGame('enemy');
    } else {
      const pLowest = Math.min(...this.towers.filter((t) => t.team === 'player').map((t) => t.hp));
      const eLowest = Math.min(...this.towers.filter((t) => t.team === 'enemy').map((t) => t.hp));
      if (pLowest > eLowest) {
        this.endGame('player');
      } else {
        this.endGame('enemy');
      }
    }
  }

  public endGame(winner: Team) {
    this.isRunning = false;
    this.winner = winner;
    if (winner === 'player') {
      soundManager.playVictory();
    } else {
      soundManager.playDefeat();
    }
    this.callbacks.onGameOver(winner, { player: this.playerCrowns, enemy: this.enemyCrowns });
  }
}
