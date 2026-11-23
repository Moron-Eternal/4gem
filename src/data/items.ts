import { ItemData } from '../types/game';

export const ITEMS: Record<string, ItemData> = {
  poke_ball: {
    id: 'poke_ball',
    name: 'POKé BALL',
    category: 'ball',
    price: 200,
    catchMultiplier: 1.0,
    description: 'A device for catching wild POKéMON. Thrown like a ball at the target.',
  },
  great_ball: {
    id: 'great_ball',
    name: 'GREAT BALL',
    category: 'ball',
    price: 600,
    catchMultiplier: 1.65,
    description: 'A good, high-performance BALL with a higher catch rate than a POKé BALL.',
  },
  ultra_ball: {
    id: 'ultra_ball',
    name: 'ULTRA BALL',
    category: 'ball',
    price: 1200,
    catchMultiplier: 2.3,
    description: 'An ultra-performance BALL that offers a very high catch rate.',
  },
  potion: {
    id: 'potion',
    name: 'POTION',
    category: 'heal',
    price: 200,
    healAmount: 25,
    description: 'A spray-type medicine for wounds. Restores 25 HP to one POKéMON.',
  },
  super_potion: {
    id: 'super_potion',
    name: 'SUPER POTION',
    category: 'heal',
    price: 500,
    healAmount: 65,
    description: 'A spray-type medicine for wounds. Restores 65 HP to one POKéMON.',
  },
  hyper_potion: {
    id: 'hyper_potion',
    name: 'HYPER POTION',
    category: 'heal',
    price: 1000,
    healAmount: 180,
    description: 'A spray-type medicine for wounds. Restores 180 HP to one POKéMON.',
  },
  antidote: {
    id: 'antidote',
    name: 'ANTIDOTE',
    category: 'status',
    price: 100,
    curesStatus: 'poison',
    description: 'A spray-type medicine. It lifts the effect of poison from one POKéMON.',
  },
  paralyze_heal: {
    id: 'paralyze_heal',
    name: 'PARLYZ HEAL',
    category: 'status',
    price: 150,
    curesStatus: 'paralyze',
    description: 'A spray-type medicine. It eliminates paralysis from a single POKéMON.',
  },
  full_heal: {
    id: 'full_heal',
    name: 'FULL HEAL',
    category: 'status',
    price: 400,
    curesStatus: 'all',
    description: 'A spray-type medicine that cures all status problems of a POKéMON.',
  },
  rare_candy: {
    id: 'rare_candy',
    name: 'RARE CANDY',
    category: 'candy',
    price: 800,
    description: 'A candy packed with energy. Raises a POKéMON by 1 level to test growth & evolution!',
  },
};

export const MART_STOCK_VIRIDIAN = [
  'poke_ball',
  'potion',
  'antidote',
  'paralyze_heal',
  'rare_candy',
];

export const MART_STOCK_CERULEAN = [
  'poke_ball',
  'great_ball',
  'super_potion',
  'hyper_potion',
  'full_heal',
  'rare_candy',
];
