// Interactive Chronicle of Auralis Codex & Live OST Jukebox (@minecraft/server-ui)

import { ItemStack, GameMode } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import {
  BLOCKS,
  ITEMS,
  MUSIC,
  DIMENSION_ID,
  SOUNDS,
  safePlaySound,
} from "./constants.js";
import { setPlayerJukeboxTrack } from "./ambience.js";
import { getGeneratedSectorCount } from "./worldgen.js";
import { transitPlayer } from "./ritual.js";

export function openCodexUI(player) {
  safePlaySound(player.dimension, SOUNDS.CRYSTAL_STEP, player.location, { volume: 0.65, pitch: 1.2 });

  const inAuralis = player.dimension.id === DIMENSION_ID;
  const form = new ActionFormData()
    .title("§e✦ §dChronicle of Auralis §e✦")
    .body(
      `§fWelcome, Wayfarer of the Prism-Tide.\n\n` +
        `§7Current Realm: ${inAuralis ? "§bAuralis: The Prism-Tide Firmament" : "§aThe Overworld"}\n` +
        `§7Charted Firmament Sectors: §e${getGeneratedSectorCount()}\n\n` +
        `§7Select a chapter below to study the Harmonic Ritual, explore the archipelago, or play the original soundtrack.`
    )
    .button("§e✦ The Harmonic Ritual\n§8How to open the veil to Auralis", "textures/items/tuning_fork")
    .button("§bAtlas of the Firmament\n§84 Regions, Cloud Sea & Citadels", "textures/blocks/tide_moss_top")
    .button("§dBestiary & Astral Seraph\n§8Creatures & 3-Phase Boss Guide", "textures/items/resonant_star_core")
    .button("§6Relics & Forge Recipes\n§8Starblade, Gale-Prism & Lyre", "textures/items/starblade")
    .button("§a♪ Original Soundtrack Jukebox\n§8Listen to all 4 Auralis OST tracks", "textures/items/astral_lyre")
    .button("§7Wayfarer's Shrine Kit\n§8Creative/Admin quick starter & travel", "textures/blocks/astrolabe_pedestal_attuned");

  form.show(player).then((res) => {
    if (res.canceled || res.selection === undefined) return;
    switch (res.selection) {
      case 0:
        showRitualGuide(player);
        break;
      case 1:
        showAtlasGuide(player);
        break;
      case 2:
        showBestiaryGuide(player);
        break;
      case 3:
        showRelicsGuide(player);
        break;
      case 4:
        showJukeboxMenu(player);
        break;
      case 5:
        showShrineKitMenu(player);
        break;
    }
  });
}

function showPage(player, title, body) {
  const form = new ActionFormData()
    .title(title)
    .body(body)
    .button("§e← Return to Chronicle");
  form.show(player).then((res) => {
    if (!res.canceled) openCodexUI(player);
  });
}

function showRitualGuide(player) {
  showPage(
    player,
    "§e✦ The Harmonic Wellspring",
    `§bAuralis is not reached through obsidian fire, but through sky-reflection and harmonic resonance.\n\n` +
      `§e1. Craft the Instruments:\n` +
      `§7• §eAstrolabe Pedestal§7: Gold, Amethyst, Quartz Block & Ender Pearl\n` +
      `§7• §eStarlight Tuning Fork§7: Amethyst Shards, Gold & Copper\n\n` +
      `§e2. Build a 3×3 Mirror Pool under Open Sky:\n` +
      `§d  [C] §b[W] §d[C]\n` +
      `§b  [W] §e[A] §b[W]\n` +
      `§d  [C] §b[W] §d[C]\n` +
      `§e[A]§7 = Celestial Astrolabe Pedestal\n` +
      `§b[W]§7 = Still Water\n` +
      `§d[C]§7 = Amethyst Block, Prismarine, Gold Block, or Quartz Block\n\n` +
      `§e3. Strike & Gaze Upward:\n` +
      `§7Use the §eStarlight Tuning Fork §7on the Astrolabe. Once the water turns into §bStarlight Veil§7, stand atop the Astrolabe and §eLook Straight Up at the Sky §7(or Sneak) to ascend!`
  );
}

function showAtlasGuide(player) {
  showPage(
    player,
    "§bAtlas of the Firmament",
    `§fSuspended above a glowing §dRose-Gold Cloud Sea §f(Y=32), Auralis unfolds endlessly as you explore:\n\n` +
      `§e• Sanctuary Crown (0, 84, 0)\n` +
      `§7Your arrival observatory, crowned by twin golden astrolabe rings and a cascading aquamarine waterfall.\n\n` +
      `§b• Pearl-Terrace Atolls\n` +
      `§7Sweeping alabaster plateaus carpeted in turquoise Tide-Moss, weeping Prism-Coral trees, Sea-Crystals, Singing Chime-Reeds, and deep Solarium Ore veins.\n\n` +
      `§6• Gilded Spire Gardens\n` +
      `§7Soaring brass-trimmed cathedral needles encircled by floating golden astrolabe rings.\n\n` +
      `§d• Sunken Bell-Reefs\n` +
      `§7Low glowing coral lagoons housing ruined Alabaster Bell-Temples with treasure chests!\n\n` +
      `§e✦ Astral Citadels (First lies ~112 blocks North!)\n` +
      `§7Grand sky-palaces housing the §dVespera Altar§7. Use your §eTuning Fork §7inside Auralis to ping the nearest Citadel!`
  );
}

function showBestiaryGuide(player) {
  showPage(
    player,
    "§dBestiary of Auralis",
    `§b• Lumina Ray §8(Passive Sky-Manta)\n` +
      `§7Glides peacefully between floating islands trailing stardust. Feed it a §dPrism Berry §7to hear its whale-song and receive §eSlow Falling & Night Vision§7!\n\n` +
      `§e• Choir Wisp §8(Friendly Lantern-Spirit)\n` +
      `§7Curiously drawn to Tuning Forks, Solarium, and the Astral Lyre.\n\n` +
      `§3• Tide-Glass Crab §8(Neutral Reef-Dweller)\n` +
      `§7Peaceful crystal-shelled crustacean; snaps back if provoked. Drops Prism Shards.\n\n` +
      `§6• Gilded Sentinel §8(Hostile Guardian)\n` +
      `§7Floating alabaster-and-brass construct firing Astral Pulse Bolts. Drops Solarium Ingots & Star-Cores.\n\n` +
      `§e✦ THE ASTRAL SERAPH §8(3-Phase Boss!)\n` +
      `§7Offer a §dResonant Star-Core §7at a §dVespera Altar §7in an Astral Citadel. Dodge its Harmonic Shockwaves and Falling Star-Pillars to win the §bSovereign's Starblade §7& §eAstral Lyre§7!`
  );
}

function showRelicsGuide(player) {
  showPage(
    player,
    "§6Relics & Celestial Forge",
    `§e• Starlight Tuning Fork\n` +
      `§7Awakens Mirror Pools in the Overworld; pings nearest Astral Citadel (or Sneak+Use for Sanctuary) in Auralis.\n\n` +
      `§b• Auralis Gale-Prism\n` +
      `§7Crafted from Prism Shards, Solarium & Feather. Launches you skyward on rose-gold wind ribbons with Slow Falling!\n\n` +
      `§b• Sovereign's Starblade §8(Seraph Boss Drop)\n` +
      `§7High-damage celestial blade; Use to unleash a piercing §bCrescent Starlight Wave§7!\n\n` +
      `§e• Astral Lyre\n` +
      `§7Plays rolling twilight harp chords, heals nearby players & Lumina Rays, and grants Regeneration.\n\n` +
      `§e• Celestial Nectar\n` +
      `§7Elixir of Prism Berry, Prism Shard & Raw Solarium granting Jump Boost II, Slow Falling & Regeneration II.`
  );
}

function showJukeboxMenu(player) {
  const form = new ActionFormData()
    .title("§a♪ Auralis Original Soundtrack")
    .body("§7Choose a track to preview immediately, or return to §eAuto Dynamic OST §7(changes smoothly by biome & boss battle).")
    .button("§e✦ Auto Dynamic OST §8(Recommended)")
    .button("§b1. Glass Horizon\n§8Sanctuary & Pearl Atolls (D Lydian)")
    .button("§62. Drifting Atolls\n§8Spire Gardens & Citadels (A Lydian)")
    .button("§d3. Sunken Chimes\n§8Bell-Reef Lagoons (E Minor 9)")
    .button("§c4. Crescendo of the Glass Tide\n§8The Astral Seraph Boss Battle")
    .button("§7← Back to Chronicle");

  form.show(player).then((res) => {
    if (res.canceled || res.selection === undefined) return;
    const map = [
      [null, "§e♪ Auto Dynamic OST restored"],
      [MUSIC.GLASS_HORIZON, "§b♪ Now Playing: Glass Horizon"],
      [MUSIC.DRIFTING_ATOLLS, "§6♪ Now Playing: Drifting Atolls"],
      [MUSIC.SUNKEN_CHIMES, "§d♪ Now Playing: Sunken Chimes"],
      [MUSIC.SERAPH_BOSS, "§c♪ Now Playing: Crescendo of the Glass Tide"],
    ];
    if (res.selection === 5) {
      openCodexUI(player);
      return;
    }
    const [track, msg] = map[res.selection];
    setPlayerJukeboxTrack(player, track);
    player.onScreenDisplay.setActionBar(msg);
  });
}

function showShrineKitMenu(player) {
  const isCreative = player.getGameMode() === GameMode.Creative;
  const form = new ActionFormData()
    .title("§eWayfarer's Shrine Kit")
    .body(
      isCreative
        ? "§aCreative Mode detected!\n§7Receive all materials to test the Harmonic Wellspring Ritual immediately, or ascend directly to Auralis."
        : "§7In Survival Mode, craft the §eAstrolabe Pedestal §7and §eStarlight Tuning Fork §7at a Crafting Table (recipes unlock when you hold Amethyst or Gold!).\n\n§8Switch to Creative Mode to unlock instant testing shortcuts here."
    );

  if (isCreative) {
    form.button("§eGive Harmonic Ritual Kit\n§8Astrolabe, Tuning Fork, Water, Amethyst & Gale-Prism");
    form.button("§dGive Boss Encounter Kit\n§8Resonant Star-Core, Starblade & Celestial Nectar");
    form.button(
      player.dimension.id === DIMENSION_ID
        ? "§bAscend Back to Overworld"
        : "§bAscend Directly to Auralis"
    );
  }
  form.button("§7← Back to Chronicle");

  form.show(player).then((res) => {
    if (res.canceled || res.selection === undefined) return;
    if (!isCreative) {
      openCodexUI(player);
      return;
    }
    const inv = player.getComponent("minecraft:inventory")?.container;
    if (res.selection === 0 && inv) {
      for (const [id, n] of [
        [BLOCKS.ASTROLABE, 1],
        [ITEMS.TUNING_FORK, 1],
        ["minecraft:amethyst_block", 4],
        ["minecraft:water_bucket", 2],
        [ITEMS.GALE_PRISM, 1],
        [ITEMS.PRISM_BERRY, 8],
      ]) {
        try {
          inv.addItem(new ItemStack(id, n));
        } catch {
          // Ignore full inventory
        }
      }
      player.onScreenDisplay.setActionBar("§e✦ Harmonic Ritual Kit bestowed!");
    } else if (res.selection === 1 && inv) {
      for (const [id, n] of [
        [ITEMS.STAR_CORE, 2],
        [ITEMS.STARBLADE, 1],
        [ITEMS.ASTRAL_LYRE, 1],
        [ITEMS.CELESTIAL_NECTAR, 4],
        [ITEMS.SOLARIUM_PICKAXE, 1],
      ]) {
        try {
          inv.addItem(new ItemStack(id, n));
        } catch {
          // Ignore
        }
      }
      player.onScreenDisplay.setActionBar("§d✦ Celestial Boss Kit bestowed!");
    } else if (res.selection === 2) {
      void transitPlayer(player, player.dimension.id !== DIMENSION_ID);
    } else {
      openCodexUI(player);
    }
  });
}
