export type Team = 'player' | 'enemy';

export type RobotId = 
  | 'scout-x' 
  | 'tank-01' 
  | 'volt-7' 
  | 'med-bot' 
  | 'omega';

export interface RobotDefinition {
  id: RobotId;
  name: string;
  codename: string;
  role: 'tank' | 'ranger' | 'swarm' | 'siege' | 'support';
  roleLabel: string;
  cost: number; // Células de energia necessárias
  hp: number;
  damage: number;
  attackSpeed: number; // attacks per second
  range: number;
  speed: number;
  count: number; // e.g. 3 for swarm, 1 for others
  targetType: 'all' | 'buildings-only';
  targetLabel: string;
  image: string;
  description: string;
  evolutionName: string;
  evolutionPerk: string;
  evolutionCycle: number; // summons needed to evolve (e.g. 2)
  color: string;
  accentColor: string;
}

export interface Unit {
  id: string;
  robotId: RobotId;
  team: Team;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  damage: number;
  range: number;
  speed: number;
  attackSpeed: number;
  targetType: 'all' | 'buildings-only';
  isFlying: boolean;
  isHealer: boolean;
  isEvolved: boolean;
  lastAttackTime: number;
  targetId: string | null;
  state: 'moving' | 'charging_node' | 'attacking';
  lane: 'left' | 'right';
  activeNodeId: string | null;
  shieldHp?: number;
  maxShieldHp?: number;
  color: string;
  subIndex?: number;
  scale: number;
  facingAngle?: number;
  walkCycle?: number;
  recoil?: number;
}

export interface Tower {
  id: string;
  team: Team;
  type: 'king' | 'guardian_left' | 'guardian_right';
  name: string;
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  range: number;
  damage: number;
  attackSpeed: number;
  lastAttackTime: number;
  targetId: string | null;
}

export interface EnergyNode {
  id: string;
  name: string;
  x: number;
  y: number;
  radius: number;
  lane: 'left' | 'right' | 'center';
  owner: Team | 'neutral';
  chargeProgress: number; // 0 to 100
  capturingTeam: Team | null;
  rechargeCooldown: number; // timer for energy burst to owning team
  energyPerCycle: number;
  pulsePhase: number;
}

export interface Projectile {
  id: string;
  sourceId: string;
  team: Team;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  targetUnitId: string | null;
  targetTowerId: string | null;
  speed: number;
  damage: number;
  splashRadius: number;
  isHealing: boolean;
  color: string;
  type: 'laser' | 'bullet' | 'plasma' | 'nanite' | 'missile';
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'spark' | 'smoke' | 'ring' | 'heal' | 'lightning';
}

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  life: number;
  maxLife: number;
  size?: number;
}

export interface PlayerCardState {
  robotId: RobotId;
  summonCount: number;
  isReadyToEvolve: boolean;
  level: number;
}

export type ArenaSector = {
  id: string;
  name: string;
  subtitle: string;
  aiDifficulty: 'easy' | 'medium' | 'hard';
  aiSpawnInterval: number;
  rewardScrap: number;
  bgHue: string;
};
