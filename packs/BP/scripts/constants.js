// Auralis: The Prism-Tide Firmament — Core Constants & Utilities

export const DIMENSION_ID = "auralis:firmament";
export const OVERWORLD_ID = "minecraft:overworld";

export const SANCTUARY_CENTER = { x: 0, y: 84, z: 0 };
export const SANCTUARY_SPAWN = { x: 0.5, y: 92, z: 4.5 };
export const FIRST_CITADEL_CENTER = { x: 0, y: 102, z: -112 };

export const CLOUD_SEA_Y = 32;
export const CLOUD_RESCUE_Y = 24;

export const DP_SANCTUARY_BUILT = "auralis:sanctuary_v1";
export const DP_GEN_BUCKETS = "auralis:gen_sectors_";
export const DP_PLAYER_RETURN = "auralis:return_loc";
export const DP_PLAYER_CODEX_GIVEN = "auralis:codex_given";
export const DP_PLAYER_JUKEBOX = "auralis:jukebox_track";

export const BLOCKS = {
  AURALITE: "auralis:auralite_stone",
  STARSTONE: "auralis:starstone",
  TIDE_MOSS: "auralis:tide_moss",
  GILDED_TRAVERTINE: "auralis:gilded_travertine",
  SOLARIUM_ORE: "auralis:solarium_ore",
  SOLARIUM_BLOCK: "auralis:solarium_block",
  PRISM_LOG: "auralis:prism_log",
  PRISM_PLANKS: "auralis:prism_planks",
  PRISM_LEAVES: "auralis:prism_leaves",
  STARLIGHT_GLASS: "auralis:starlight_glass",
  SEA_CRYSTAL: "auralis:sea_crystal",
  LANTERN_BLOOM: "auralis:lantern_bloom",
  CHIME_REED: "auralis:chime_reed",
  GILDED_BRASS: "auralis:gilded_brass",
  ASTROLABE: "auralis:astrolabe_pedestal",
  STARLIGHT_VEIL: "auralis:starlight_veil",
  VESPERA_ALTAR: "auralis:vespera_altar",
};

export const ITEMS = {
  TUNING_FORK: "auralis:tuning_fork",
  RAW_SOLARIUM: "auralis:raw_solarium",
  SOLARIUM_INGOT: "auralis:solarium_ingot",
  PRISM_SHARD: "auralis:prism_shard",
  PRISM_BERRY: "auralis:prism_berry",
  CELESTIAL_NECTAR: "auralis:celestial_nectar",
  STAR_CORE: "auralis:resonant_star_core",
  SOLARIUM_PICKAXE: "auralis:solarium_pickaxe",
  STARBLADE: "auralis:starblade",
  GALE_PRISM: "auralis:tide_glider_charm",
  ASTRAL_LYRE: "auralis:astral_lyre",
  CODEX: "auralis:chronicle_of_auralis",
};

export const ENTITIES = {
  LUMINA_RAY: "auralis:lumina_ray",
  CHOIR_WISP: "auralis:choir_wisp",
  GLASS_CRAB: "auralis:glass_crab",
  GILDED_SENTINEL: "auralis:gilded_sentinel",
  ASTRAL_SERAPH: "auralis:astral_seraph",
  ASTRAL_BOLT: "auralis:astral_bolt",
};

export const PARTICLES = {
  AMBIENT_MOTES: "auralis:ambient_motes",
  AURORA_RIBBONS: "auralis:aurora_ribbons",
  HARMONIC_RING: "auralis:harmonic_ring",
  VEIL_VORTEX: "auralis:veil_vortex",
  STARLIGHT_BURST: "auralis:starlight_burst",
  MANTA_TRAIL: "auralis:manta_trail",
  WISP_NOTES: "auralis:wisp_notes",
  CRYSTAL_SHIMMER: "auralis:crystal_shimmer",
  GALE_SWIRL: "auralis:gale_swirl",
  STARBLADE_ARC: "auralis:starblade_arc",
  SENTINEL_BEAM: "auralis:sentinel_beam",
  SERAPH_NOVA: "auralis:seraph_nova",
  STAR_PILLAR: "auralis:star_pillar",
};

export const SOUNDS = {
  RITUAL_CHIME: "auralis.ritual.chime",
  RITUAL_SWELL: "auralis.ritual.swell",
  PORTAL_ASCEND: "auralis.portal.ascend",
  PORTAL_RETURN: "auralis.portal.return",
  PORTAL_HUM: "auralis.portal.hum",
  CRYSTAL_STEP: "auralis.crystal.step",
  CRYSTAL_BREAK: "auralis.crystal.break",
  GALE_PRISM: "auralis.item.gale_prism",
  STARBLADE: "auralis.item.starblade",
  LYRE: "auralis.item.lyre",
  MANTA_CALL: "auralis.mob.manta_call",
  WISP_SING: "auralis.mob.wisp_sing",
  CRAB_CLICK: "auralis.mob.crab_click",
  SENTINEL_HUM: "auralis.mob.sentinel_hum",
  SENTINEL_BLAST: "auralis.mob.sentinel_blast",
  SENTINEL_HURT: "auralis.mob.sentinel_hurt",
  SERAPH_AWAKEN: "auralis.boss.seraph_awaken",
  SERAPH_PULSE: "auralis.boss.seraph_pulse",
  SERAPH_DEFEAT: "auralis.boss.seraph_defeat",
};

export const MUSIC = {
  GLASS_HORIZON: "music.auralis.glass_horizon",
  DRIFTING_ATOLLS: "music.auralis.drifting_atolls",
  SUNKEN_CHIMES: "music.auralis.sunken_chimes",
  SERAPH_BOSS: "music.auralis.seraph_boss",
};

export const SHRINE_CORNER_BLOCKS = new Set([
  "minecraft:amethyst_block",
  "minecraft:prismarine",
  "minecraft:gold_block",
  "minecraft:quartz_block",
  BLOCKS.GILDED_BRASS,
  BLOCKS.GILDED_TRAVERTINE,
  BLOCKS.SOLARIUM_BLOCK,
]);

export const SHRINE_WATER_BLOCKS = new Set([
  "minecraft:water",
  "minecraft:flowing_water",
  BLOCKS.STARLIGHT_VEIL,
]);

export const ZONE_META = {
  sanctuary: {
    name: "§eSanctuary Crown",
    subtitle: "§7Heart of the Mirrored Observatory",
    track: MUSIC.GLASS_HORIZON,
  },
  pearl_atolls: {
    name: "§bPearl-Terrace Atolls",
    subtitle: "§7Porcelain plateaus & cascading starlight pools",
    track: MUSIC.GLASS_HORIZON,
  },
  spire_gardens: {
    name: "§6Gilded Spire Gardens",
    subtitle: "§7Soaring brass pinnacles & hovering astrolabe rings",
    track: MUSIC.DRIFTING_ATOLLS,
  },
  bell_reefs: {
    name: "§dSunken Bell-Reefs",
    subtitle: "§7Luminous coral lagoons above the rose-gold clouds",
    track: MUSIC.SUNKEN_CHIMES,
  },
  astral_citadel: {
    name: "§e✦ §dAstral Citadel §e✦",
    subtitle: "§7Throne of The Astral Seraph",
    track: MUSIC.DRIFTING_ATOLLS,
  },
};

export function safeSpawnParticle(dim, particleId, loc) {
  try {
    dim.spawnParticle(particleId, loc);
  } catch {
    // Unloaded chunk or out-of-bounds; safely ignored
  }
}

export function safePlaySound(dim, soundId, loc, opts = {}) {
  try {
    dim.playSound(soundId, loc, opts);
  } catch {
    // Safely ignored
  }
}

export function dist3(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function dist2(ax, az, bx, bz) {
  return Math.hypot(ax - bx, az - bz);
}
