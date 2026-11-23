export type ElementType =
  | 'normal'
  | 'fire'
  | 'water'
  | 'electric'
  | 'grass'
  | 'ice'
  | 'fighting'
  | 'poison'
  | 'ground'
  | 'flying'
  | 'psychic'
  | 'bug'
  | 'rock'
  | 'ghost'
  | 'dragon';

export type MoveCategory = 'physical' | 'special' | 'status';

export type StatusCondition = 'none' | 'burn' | 'paralyze' | 'poison' | 'sleep';

export type MovePhysicsArchetype =
  | 'surf_wave'
  | 'water_jet'
  | 'flamethrower'
  | 'fire_blast'
  | 'ember'
  | 'electric_bolt'
  | 'thunder_strike'
  | 'vine_whip'
  | 'razor_leaf'
  | 'solar_beam'
  | 'ice_beam'
  | 'blizzard'
  | 'rock_throw'
  | 'earthquake'
  | 'physical_lunge'
  | 'wind_gust'
  | 'psychic_wave'
  | 'poison_sludge'
  | 'powder_cloud'
  | 'stat_aura';

export type ArenaBiomeId =
  | 'gym_floor'
  | 'route_meadow'
  | 'viridian_forest'
  | 'pewter_rock'
  | 'cerulean_pool';

export interface MoveData {
  id: string;
  name: string;
  type: ElementType;
  category: MoveCategory;
  power: number;
  accuracy: number;
  maxPp: number;
  priority?: number;
  archetype: MovePhysicsArchetype;
  description: string;
  envHint: string;
  /** Minimum reach in 192x108 arena grid units at Lv.1 unevolved */
  baseRangePx: number;
  /** Maximum reach in 192x108 arena grid units at Lv.100 final evo */
  maxRangePx: number;
  /** Extra forward lunge distance covered by charge attacks like Tackle / Quick Attack */
  lungeAdvancePx?: number;
  /** Physical pushback applied to defender in arena units (scaled by MovePhysicsProfile) */
  knockbackPx?: number;
  /** True if move spawns destructible pixel rock pillars on the arena */
  createsPillar?: boolean;
  /** True if move tangles/roots target, halving movement speed for 2 turns */
  rootsTarget?: boolean;
  /** True if move physically pushes fire, steam, and light foes via wind */
  pushesEnvironment?: boolean;
  statusEffect?: {
    condition: StatusCondition;
    chance: number;
  };
  statChange?: {
    target: 'self' | 'opponent';
    stat: 'atk' | 'def' | 'spAtk' | 'spDef' | 'spd';
    stages: number;
    chance: number;
  };
  drainRatio?: number;
  highCrit?: boolean;
  scalesWith: 'spAtk' | 'atk' | 'level';
}

export interface MoveSlot {
  moveId: string;
  pp: number;
  maxPp: number;
}

export interface BaseStats {
  hp: number;
  atk: number;
  def: number;
  spAtk: number;
  spDef: number;
  spd: number;
}

export interface LearnsetEntry {
  level: number;
  moveId: string;
}

export interface PokemonSpecies {
  id: string;
  dexNumber: number;
  name: string;
  types: [ElementType] | [ElementType, ElementType];
  baseStats: BaseStats;
  evoStage: 0 | 1 | 2;
  singleStageWeight?: number;
  evolvesTo?: {
    speciesId: string;
    level: number;
  };
  catchRate: number;
  baseExp: number;
  learnset: LearnsetEntry[];
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    eye?: string;
  };
  spriteScale: number;
  gen4Sprite?: boolean;
  pokedexEntry: string;
}

export interface PokemonInstance {
  uid: string;
  speciesId: string;
  nickname?: string;
  level: number;
  exp: number;
  nextLevelExp: number;
  maxHp: number;
  hp: number;
  atk: number;
  def: number;
  spAtk: number;
  spDef: number;
  spd: number;
  moves: MoveSlot[];
  status: StatusCondition;
  sleepTurns?: number;
  statOverride?: Partial<Pick<BaseStats, 'atk' | 'spAtk'>>;
}

export interface StatStages {
  atk: number;
  def: number;
  spAtk: number;
  spDef: number;
  spd: number;
}

export interface MovePhysicsProfile {
  scaleFactor: number; // 0.20 .. 1.00
  tier: 'spark' | 'surge' | 'cataclysm';
  relevantStat: number;
  relevantStatName: 'Sp. Atk' | 'Attack' | 'Level';
  /** Effective strike reach in 192x108 arena grid units */
  effectiveRangePx: number;
  /** Physical pushback force on impact in 192x108 arena units */
  knockbackPx: number;
  beamWidthPx: number;
  waveHeight: number;
  speedPxPerSec: number;
  particleCount: number;
  envIntensity: number;
  envSpreadRadius: number;
  shakeIntensity: number;
  audioBassWeight: number;
  durationSec: number;
}

export type MoveReachStatus = 'in_range' | 'dash_strike' | 'out_of_range';

export interface MoveReachEvaluation {
  status: MoveReachStatus;
  distancePx: number;
  effectiveRangePx: number;
  moveBudgetPx: number;
  shortfallPx: number;
  /** Recommended destination point to close distance */
  approachX: number;
  approachY: number;
}

export interface DestructiblePillar {
  id: number;
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  height: number;
}

export type EnvConditionTag =
  | 'burning'
  | 'flooded'
  | 'electrified'
  | 'frozen'
  | 'steam'
  | 'cratered'
  | 'overgrown'
  | 'pillars';

export interface ZoneEnvSample {
  water: number;
  fire: number;
  scorch: number;
  ice: number;
  charge: number;
  crater: number;
  flora: number;
  steam: number;
  tags: EnvConditionTag[];
}

export interface ArenaEnvSnapshot {
  playerZone: ZoneEnvSample;
  enemyZone: ZoneEnvSample;
  centerZone: ZoneEnvSample;
  activeTags: EnvConditionTag[];
  steamTurns: number;
  pillarCount: number;
}

export interface ItemData {
  id: string;
  name: string;
  /** Official PokeAPI item sprite filename slug (e.g. 'poke-ball', 'rare-candy') */
  apiSlug: string;
  category: 'ball' | 'heal' | 'status' | 'candy';
  price: number;
  description: string;
  catchMultiplier?: number;
  healAmount?: number;
  curesStatus?: StatusCondition | 'all';
}

export interface InventoryItem {
  itemId: string;
  quantity: number;
}

export type Direction = 'up' | 'down' | 'left' | 'right';

export type TrainerSpriteStyle =
  | 'red'
  | 'rival'
  | 'youngster'
  | 'bug_catcher'
  | 'picnicker'
  | 'camper'
  | 'brock'
  | 'hiker'
  | 'swimmer'
  | 'misty';

export interface TrainerPokemonSpec {
  speciesId: string;
  level: number;
  customMoves?: string[];
}

export interface TrainerData {
  id: string;
  name: string;
  title: string;
  spriteStyle: TrainerSpriteStyle;
  arenaBiome: ArenaBiomeId;
  introDialogue: string[];
  defeatDialogue: string[];
  postBattleDialogue: string[];
  rewardMoney: number;
  rewardBadge?: string;
  rewardItem?: { itemId: string; quantity: number };
  isGymLeader?: boolean;
  isRival?: boolean;
  party: TrainerPokemonSpec[];
}

export interface NpcEntity {
  id: string;
  name: string;
  x: number;
  y: number;
  dir: Direction;
  spriteStyle:
    | 'oak'
    | 'mom'
    | 'nurse'
    | 'mart'
    | 'villager'
    | 'rival'
    | 'youngster'
    | 'bug_catcher'
    | 'picnicker'
    | 'camper'
    | 'brock'
    | 'hiker'
    | 'swimmer'
    | 'misty'
    | 'pokeball';
  dialogue: string[];
  /** Dialogue spoken by an item_giver NPC after already giving their gift */
  postPickupDialogue?: string[];
  role?: 'heal' | 'mart' | 'starter_table' | 'oak' | 'trainer' | 'item_pickup' | 'item_giver' | 'gym_guide';
  trainerId?: string;
  sightRange?: number;
  starterSpeciesId?: 'bulbasaur' | 'charmander' | 'squirtle';
  pickupItem?: { itemId: string; quantity: number };
  requiredFlag?: string;
  hideIfFlag?: string;
}

export interface WarpPoint {
  x: number;
  y: number;
  targetMapId: string;
  targetX: number;
  targetY: number;
  targetDir?: Direction;
  requiredFlag?: string;
  blockedMessage?: string;
}

export interface WildEncounterEntry {
  speciesId: string;
  minLevel: number;
  maxLevel: number;
  weight: number;
}

export interface MapDefinition {
  id: string;
  name: string;
  subtitle: string;
  width: number;
  height: number;
  arenaBiome: ArenaBiomeId;
  musicTrack: 'town' | 'route' | 'forest' | 'gym';
  tiles: string[];
  warps: WarpPoint[];
  npcs: NpcEntity[];
  encounters: WildEncounterEntry[];
  signs: Array<{ x: number; y: number; text: string[] }>;
}

export interface PvpMatchConfig {
  p1Name: string;
  p2Name: string;
  p1Party: PokemonInstance[];
  p2Party: PokemonInstance[];
  biome: ArenaBiomeId;
  privacyHandoff: boolean;
}

export interface SaveState {
  version: number;
  playerName: string;
  mapId: string;
  playerX: number;
  playerY: number;
  playerDir: Direction;
  starterId: 'bulbasaur' | 'charmander' | 'squirtle' | null;
  money: number;
  badges: string[];
  party: PokemonInstance[];
  pcBox: PokemonInstance[];
  inventory: InventoryItem[];
  defeatedTrainers: string[];
  collectedItems: string[];
  flags: Record<string, boolean>;
  pokedexSeen: string[];
  pokedexCaught: string[];
  playTimeSec: number;
}
