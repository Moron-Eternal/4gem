import { TrainerData } from '../types/game';

export function getRivalCounterStarter(
  playerStarter: 'bulbasaur' | 'charmander' | 'squirtle' | null
): 'bulbasaur' | 'charmander' | 'squirtle' {
  if (playerStarter === 'bulbasaur') return 'charmander';
  if (playerStarter === 'charmander') return 'squirtle';
  return 'bulbasaur';
}

export function getRivalEvolvedCounter(
  playerStarter: 'bulbasaur' | 'charmander' | 'squirtle' | null
): 'ivysaur' | 'charmeleon' | 'wartortle' {
  if (playerStarter === 'bulbasaur') return 'charmeleon';
  if (playerStarter === 'charmander') return 'wartortle';
  return 'ivysaur';
}

export const TRAINERS: Record<string, TrainerData> = {
  rival_lab: {
    id: 'rival_lab',
    name: 'BLUE',
    title: 'RIVAL',
    spriteStyle: 'rival',
    arenaBiome: 'gym_floor',
    isRival: true,
    introDialogue: [
      'BLUE: Wait up! Let’s test out our brand-new POKéMON right here in Gramps’s Lab!',
      'BLUE: Let’s see how big your attacks get on this gym floor!',
    ],
    defeatDialogue: [
      'BLUE: WHAT?! Unbelievable! I picked the wrong POKéMON!',
      'BLUE: Smell ya later! Next time we meet, my team will be evolved and unstoppable!',
    ],
    postBattleDialogue: ['BLUE: Hmph! Train hard if you want to beat BROCK in Pewter City!'],
    rewardMoney: 350,
    party: [{ speciesId: 'squirtle', level: 5 }],
  },
  youngster_joey: {
    id: 'youngster_joey',
    name: 'JOEY',
    title: 'YOUNGSTER',
    spriteStyle: 'youngster',
    arenaBiome: 'route_meadow',
    introDialogue: [
      'YOUNGSTER JOEY: Hey! Our eyes met! Watch out—FIRE moves can actually ignite the tall grass here!',
    ],
    defeatDialogue: ['YOUNGSTER JOEY: Whoa, you scorched the whole meadow!'],
    postBattleDialogue: ['YOUNGSTER JOEY: My RATTATA is still in the top percentage of RATTATA!'],
    rewardMoney: 220,
    party: [
      { speciesId: 'rattata', level: 5 },
      { speciesId: 'pidgey', level: 6 },
    ],
  },
  bug_catcher_rick: {
    id: 'bug_catcher_rick',
    name: 'RICK',
    title: 'BUG CATCHER',
    spriteStyle: 'bug_catcher',
    arenaBiome: 'viridian_forest',
    introDialogue: [
      'BUG CATCHER RICK: Hey! You have POKéMON! Let’s battle in the forest clearing!',
    ],
    defeatDialogue: ['BUG CATCHER RICK: Nooo! My precious bugs!'],
    postBattleDialogue: ['BUG CATCHER RICK: Watch for wild PIKACHU hiding deeper in Viridian Forest!'],
    rewardMoney: 260,
    party: [
      { speciesId: 'caterpie', level: 7 },
      { speciesId: 'weedle', level: 8 },
    ],
  },
  picnicker_lily: {
    id: 'picnicker_lily',
    name: 'LILY',
    title: 'PICNICKER',
    spriteStyle: 'picnicker',
    arenaBiome: 'viridian_forest',
    introDialogue: [
      'PICNICKER LILY: Have you tried combining WATER moves and ELECTRIC moves? The puddles conduct lightning!',
    ],
    defeatDialogue: ['PICNICKER LILY: Sparks flew everywhere! What a thrilling battle!'],
    postBattleDialogue: ['PICNICKER LILY: Pewter City is just north through the forest exit!'],
    rewardMoney: 380,
    party: [
      { speciesId: 'oddish', level: 9 },
      { speciesId: 'pikachu', level: 10 },
    ],
  },
  camper_liam: {
    id: 'camper_liam',
    name: 'LIAM',
    title: 'CAMPER',
    spriteStyle: 'camper',
    arenaBiome: 'pewter_rock',
    introDialogue: [
      'CAMPER LIAM: Stop right there, kid! You’re light-years from facing BROCK!',
    ],
    defeatDialogue: ['CAMPER LIAM: Darn! Light-years isn’t time, it’s distance!'],
    postBattleDialogue: ['CAMPER LIAM: BROCK’s ONIX carves massive craters with ROCK TOMB!'],
    rewardMoney: 420,
    party: [
      { speciesId: 'geodude', level: 11 },
      { speciesId: 'sandshrew', level: 11 },
    ],
  },
  gym_brock: {
    id: 'gym_brock',
    name: 'BROCK',
    title: 'GYM LEADER',
    spriteStyle: 'brock',
    arenaBiome: 'pewter_rock',
    isGymLeader: true,
    introDialogue: [
      'BROCK: I’m BROCK! I’m Pewter’s Gym Leader! My rock-hard willpower is evident in my POKéMON!',
      'BROCK: Show me your best—let’s shatter this sandstone arena!',
    ],
    defeatDialogue: [
      'BROCK: I took you for granted! As proof of your victory, take the BOULDER BADGE!',
      'BROCK: Route 3 east of Pewter City is now open to you. Good luck against MISTY in Cerulean!',
    ],
    postBattleDialogue: [
      'BROCK: Once your starter evolves, its elemental attacks will dwarf what you saw today!',
    ],
    rewardMoney: 1400,
    rewardBadge: 'BOULDER BADGE',
    rewardItem: { itemId: 'rare_candy', quantity: 2 },
    party: [
      { speciesId: 'geodude', level: 12, customMoves: ['tackle', 'harden', 'rock_throw', 'mud_slap'] },
      { speciesId: 'onix', level: 14, customMoves: ['tackle', 'harden', 'rock_throw', 'rock_tomb'] },
    ],
  },
  hiker_marcos: {
    id: 'hiker_marcos',
    name: 'MARCOS',
    title: 'HIKER',
    spriteStyle: 'hiker',
    arenaBiome: 'pewter_rock',
    introDialogue: [
      'HIKER MARCOS: Bwahaha! Nothing beats the rumble of mountain rock on Route 3!',
    ],
    defeatDialogue: ['HIKER MARCOS: You shook me to my boots!'],
    postBattleDialogue: ['HIKER MARCOS: Cerulean City’s water gym is just ahead!'],
    rewardMoney: 620,
    party: [
      { speciesId: 'geodude', level: 15 },
      { speciesId: 'mankey', level: 15 },
      { speciesId: 'growlithe', level: 16 },
    ],
  },
  swimmer_luis: {
    id: 'swimmer_luis',
    name: 'LUIS',
    title: 'SWIMMER',
    spriteStyle: 'swimmer',
    arenaBiome: 'cerulean_pool',
    introDialogue: [
      'SWIMMER LUIS: Welcome to Cerulean Gym! The pool amplifies WATER moves—and makes ELECTRIC moves electrifying!',
    ],
    defeatDialogue: ['SWIMMER LUIS: Splashed right out of the pool!'],
    postBattleDialogue: ['SWIMMER LUIS: MISTY’s STARMIE rides huge Surf waves!'],
    rewardMoney: 740,
    party: [
      { speciesId: 'poliwag', level: 17 },
      { speciesId: 'staryu', level: 18 },
    ],
  },
  gym_misty: {
    id: 'gym_misty',
    name: 'MISTY',
    title: 'GYM LEADER',
    spriteStyle: 'misty',
    arenaBiome: 'cerulean_pool',
    isGymLeader: true,
    introDialogue: [
      'MISTY: Hi, you’re a new face! My policy is an all-out offensive with WATER-type POKéMON!',
      'MISTY: Watch how our Surf waves flood the entire pool!',
    ],
    defeatDialogue: [
      'MISTY: Wow! You’re too much! All right—you earned the CASCADE BADGE!',
      'MISTY: Rumor says your rival BLUE is waiting north on Nugget Bridge for a final showdown!',
    ],
    postBattleDialogue: [
      'MISTY: Take on BLUE on Nugget Bridge, or try out the BATTLE LAB to see Lv. 100 waves!',
    ],
    rewardMoney: 2200,
    rewardBadge: 'CASCADE BADGE',
    rewardItem: { itemId: 'rare_candy', quantity: 3 },
    party: [
      { speciesId: 'staryu', level: 19, customMoves: ['water_pulse', 'bubble_beam', 'tackle'] },
      { speciesId: 'starmie', level: 22, customMoves: ['surf', 'water_pulse', 'confusion', 'ice_beam'] },
    ],
  },
  rival_cerulean: {
    id: 'rival_cerulean',
    name: 'BLUE',
    title: 'RIVAL FINALE',
    spriteStyle: 'rival',
    arenaBiome: 'gym_floor',
    isRival: true,
    isGymLeader: true,
    introDialogue: [
      'BLUE: Yo! Look who finally caught up on Nugget Bridge! Did you beat BROCK and MISTY?',
      'BLUE: My POKéMON evolved and their elemental power is on a whole new level! Let’s settle this!',
    ],
    defeatDialogue: [
      'BLUE: NO WAY!! Even after evolving my ace, you still blew past me!',
      'BLUE: Alright, I admit it—you’re a true Kanto Master! Keep catching POKéMON or push Lv. 100 physics in the Battle Lab!',
    ],
    postBattleDialogue: [
      'BLUE: You’re Kanto’s rising Champion! Don’t forget to check out the Battle Lab 3-Panel Showcase!',
    ],
    rewardMoney: 3500,
    rewardBadge: 'NUGGET TROPHY',
    rewardItem: { itemId: 'rare_candy', quantity: 5 },
    party: [
      { speciesId: 'pidgeotto', level: 21, customMoves: ['wing_attack', 'quick_attack', 'gust'] },
      { speciesId: 'kadabra', level: 22, customMoves: ['psychic', 'confusion', 'calm_mind'] },
      { speciesId: 'wartortle', level: 24 },
    ],
  },
};

export function resolveTrainerData(
  trainerId: string,
  playerStarter: 'bulbasaur' | 'charmander' | 'squirtle' | null
): TrainerData {
  const base = TRAINERS[trainerId];
  if (!base) throw new Error(`Unknown trainer: ${trainerId}`);
  const cloned: TrainerData = {
    ...base,
    party: base.party.map((p) => ({ ...p })),
  };

  if (trainerId === 'rival_lab') {
    cloned.party[0].speciesId = getRivalCounterStarter(playerStarter);
  } else if (trainerId === 'rival_cerulean') {
    const ace = getRivalEvolvedCounter(playerStarter);
    cloned.party[2].speciesId = ace;
    if (ace === 'wartortle') cloned.party[2].customMoves = ['surf', 'ice_beam', 'bite'];
    if (ace === 'charmeleon') cloned.party[2].customMoves = ['flamethrower', 'flame_wheel', 'bite'];
    if (ace === 'ivysaur') cloned.party[2].customMoves = ['razor_leaf', 'sludge_bomb', 'sleep_powder'];
  }

  return cloned;
}
