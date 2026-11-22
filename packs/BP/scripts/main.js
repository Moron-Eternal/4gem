// Auralis: The Prism-Tide Firmament — Main Behavior Pack Entrypoint
// Compatible with Minecraft Bedrock Edition 1.26.50+ (@minecraft/server 2.6.0 & @minecraft/server-ui 2.0.0)

import {
  world,
  system,
  Player,
  ItemStack,
  CommandPermissionLevel,
  CustomCommandStatus,
} from "@minecraft/server";
import {
  DP_PLAYER_CODEX_GIVEN,
  ITEMS,
  BLOCKS,
  DIMENSION_ID,
} from "./constants.js";
import { ensureSanctuaryReady, tickWorldGen } from "./worldgen.js";
import { triggerHarmonicRitual, tickPortalAscension, transitPlayer } from "./ritual.js";
import { tickAmbience } from "./ambience.js";
import {
  tickEcosystemSpawning,
  tickGracefulFlyers,
  handleEntityInteract,
  summonAstralSeraphAtAltar,
  tickSeraphBossAI,
  handleSeraphDeath,
} from "./mobs.js";
import { registerCustomComponents } from "./items.js";
import { openCodexUI } from "./codex.js";

// =============================================================================
// 1. EARLY-EXECUTION STARTUP REGISTRATIONS (Custom Components & Commands)
// =============================================================================

system.beforeEvents.startup.subscribe((event) => {
  registerCustomComponents(event, {
    onAstrolabeInteract(player, block) {
      const equip = player.getComponent("minecraft:equippable");
      const held = equip?.getEquipment("Mainhand");
      if (held?.typeId === ITEMS.TUNING_FORK) {
        triggerHarmonicRitual(player, block);
      } else {
        const attuned = block.permutation.getState("auralis:attuned") === true;
        if (attuned) {
          player.onScreenDisplay.setActionBar(
            "§e✦ §bAstrolabe Awakened! §7Stand atop it and §eLook Up at the Sky §7(or Sneak) to cross the veil."
          );
        } else {
          player.onScreenDisplay.setActionBar(
            "§eCelestial Astrolabe §8— §7Surround in a 3×3 Water & Crystal Mirror Pool, then strike with a §eStarlight Tuning Fork§7."
          );
        }
      }
    },
    onVesperaAltarInteract(player, block) {
      summonAstralSeraphAtAltar(player, block);
    },
  });

  // Register convenient custom slash commands (safely guarded for broad version compatibility)
  try {
    if (event.customCommandRegistry) {
      event.customCommandRegistry.registerCommand(
        {
          name: "auralis:codex",
          description: "Open the Chronicle of Auralis guidebook & OST Jukebox",
          permissionLevel: CommandPermissionLevel.Any,
          cheatsRequired: false,
        },
        (origin) => {
          const player = origin.sourceEntity;
          if (!player || !(player instanceof Player)) {
            return { status: CustomCommandStatus.Failure, message: "Only players can open the Chronicle." };
          }
          system.run(() => openCodexUI(player));
          return { status: CustomCommandStatus.Success };
        }
      );

      event.customCommandRegistry.registerCommand(
        {
          name: "auralis:kit",
          description: "Receive the Harmonic Wellspring starter kit (Astrolabe, Tuning Fork, Water & Amethyst)",
          permissionLevel: CommandPermissionLevel.GameDirectors,
          cheatsRequired: true,
        },
        (origin) => {
          const player = origin.sourceEntity;
          if (!player || !(player instanceof Player)) {
            return { status: CustomCommandStatus.Failure, message: "Only players can receive the kit." };
          }
          system.run(() => {
            const inv = player.getComponent("minecraft:inventory")?.container;
            if (!inv) return;
            for (const [id, count] of [
              [BLOCKS.ASTROLABE, 1],
              [ITEMS.TUNING_FORK, 1],
              ["minecraft:amethyst_block", 4],
              ["minecraft:water_bucket", 2],
              [ITEMS.GALE_PRISM, 1],
              [ITEMS.CODEX, 1],
            ]) {
              try {
                inv.addItem(new ItemStack(id, count));
              } catch {
                // Ignore
              }
            }
            player.sendMessage("§e✦ §bHarmonic Wellspring Kit delivered! Open your §dChronicle of Auralis §bfor the 3×3 ritual layout.");
          });
          return { status: CustomCommandStatus.Success };
        }
      );

      event.customCommandRegistry.registerCommand(
        {
          name: "auralis:ascend",
          description: "Directly ascend to Auralis or return to the Overworld (Admin)",
          permissionLevel: CommandPermissionLevel.GameDirectors,
          cheatsRequired: true,
        },
        (origin) => {
          const player = origin.sourceEntity;
          if (!player || !(player instanceof Player)) {
            return { status: CustomCommandStatus.Failure, message: "Only players can ascend." };
          }
          system.run(() => void transitPlayer(player, player.dimension.id !== DIMENSION_ID));
          return { status: CustomCommandStatus.Success };
        }
      );
    }
  } catch (err) {
    console.warn(`[Auralis] Custom command registration skipped: ${err}`);
  }
});

// =============================================================================
// 2. WORLD LOAD, FIRST-JOIN CHRONICLE & RUNTIME TICK LOOPS
// =============================================================================

world.afterEvents.worldLoad.subscribe(() => {
  // Pre-build the Sanctuary Crown 2.0 arrival island smoothly in the background!
  system.runTimeout(() => {
    void ensureSanctuaryReady();
  }, 40);

  // Arena-Tethered Astral Seraph 2.0 flight, facing & combat AI (every 2 ticks = 10 Hz!)
  system.runInterval(() => {
    tickSeraphBossAI();
  }, 2);

  // Serene Lumina Ray gliding & Astral Weaver cast animation sync (every 4 ticks = 5 Hz)
  system.runInterval(() => {
    tickGracefulFlyers();
  }, 4);

  // Portal sky-gaze detection (every 5 ticks = 0.25s)
  system.runInterval(() => {
    tickPortalAscension();
  }, 5);

  // Dynamic OST Music Director, ambient aurora/motes/cloud-vent VFX & Cloud Sea rescue (every 20 ticks = 1s)
  system.runInterval(() => {
    tickAmbience();
  }, 20);

  // Non-overlapping Macro-Cell floating-archipelago streaming (every 25 ticks = 1.25s)
  system.runInterval(() => {
    tickWorldGen();
  }, 25);

  // Living 9-creature Auralis ecosystem spawning & particle trails (every 45 ticks = 2.25s)
  system.runInterval(() => {
    tickEcosystemSpawning();
  }, 45);
});

// Bestow the Chronicle of Auralis guidebook once to every new explorer!
world.afterEvents.playerSpawn.subscribe((event) => {
  const { player, initialSpawn } = event;
  if (!initialSpawn || !player.isValid) return;

  system.runTimeout(() => {
    if (!player.isValid) return;
    try {
      if (player.getDynamicProperty(DP_PLAYER_CODEX_GIVEN) === true) return;
      player.setDynamicProperty(DP_PLAYER_CODEX_GIVEN, true);
      const inv = player.getComponent("minecraft:inventory")?.container;
      inv?.addItem(new ItemStack(ITEMS.CODEX, 1));
      player.sendMessage(
        "§e✦ §bAuralis: The Prism-Tide Firmament §e✦\n" +
          "§7You received the §dChronicle of Auralis§7! Use it (or type §e/auralis:codex§7) to learn the §eHarmonic Wellspring Ritual §7and listen to the OST."
      );
    } catch {
      // Safe guard
    }
  }, 30);
});

// Creature interactions (feeding Lumina Rays Prism Berries)
world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
  handleEntityInteract(event);
});

// Astral Seraph Boss Victory celebration!
world.afterEvents.entityDie.subscribe((event) => {
  handleSeraphDeath(event);
});
