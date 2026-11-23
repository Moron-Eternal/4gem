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
  /** Scaling stat hint for display (e.g. 'Sp. Atk' or 'Attack') */
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
  /** 0 = unevolved/basic, 1 = mid evolution, 2 = final evolution */
  evoStage: 0 | 1 | 2;
  /** True for strong single-stage Pokémon (Snorlax, Onix, Lapras) so scaling feels authentic */
  singleStageWeight?: number;
  evolvesTo?: {
    speciesId: string;
    level: number;
  };
  catchRate: number;
  baseExp: number;
  learnset: LearnsetEntry[];
  /** Primary & accent hex colors for pixel-art fallback sprite & UI accents */
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    eye?: string;
  };
  /** Visual pixel scale in battle arena (0.75 = small basic, 1.25 = large final evo) */
  spriteScale: number;
  /** Use Gen 4 Platinum sprite endpoint if true (e.g. Munchlax #446) */
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
  /** Optional stat override used by Battle Lab sliders */
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

export type EnvConditionTag =
  | 'burning'
  | 'flooded'
  | 'electrified'
  | 'frozen'
  | 'steam'
  | 'cratered'
  | 'overgrown';

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
}

export interface ItemData {
  id: string;
  name: string;
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

export interface TrainerPokemonSpec {
  speciesId: string;
  level: number;
  customMoves?: string[];
}

export interface TrainerData {
  id: string;
  name: string;
  title: string;
  spriteStyle: 'rival' | 'youngster' | 'bug_catcher' | 'picnicker' | 'camper' | 'brock' | 'hiker' | 'swimmer' | 'misty';
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
  spriteStyle: 'oak' | 'mom' | 'nurse' | 'mart' | 'villager' | 'rival' | 'youngster' | 'bug_catcher' | 'picnicker' | 'camper' | 'brock' | 'hiker' | 'swimmer' | 'misty' | 'pokeball';
  dialogue: string[];
  role?: 'heal' | 'mart' | 'starter_table' | 'oak' | 'trainer' | 'item_pickup' | 'gym_guide';
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
  /** ASCII tile grid rows (length = height, each string length = width) */
  tiles: string[];
  warps: WarpPoint[];
  npcs: NpcEntity[];
  encounters: WildEncounterEntry[];
  signs: Array<{ x: number; y: number; text: string[] }>;
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
