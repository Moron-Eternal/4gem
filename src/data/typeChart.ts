import { ElementType } from '../types/game';

export const TYPE_COLORS: Record<ElementType, { bg: string; border: string; text: string }> = {
  normal: { bg: '#9ca3af', border: '#6b7280', text: '#111827' },
  fire: { bg: '#f0642c', border: '#b83a14', text: '#ffffff' },
  water: { bg: '#3b82f6', border: '#1d4ed8', text: '#ffffff' },
  electric: { bg: '#facc15', border: '#ca8a04', text: '#1c1917' },
  grass: { bg: '#22c55e', border: '#15803d', text: '#ffffff' },
  ice: { bg: '#67e8f9', border: '#0891b2', text: '#083344' },
  fighting: { bg: '#c2410c', border: '#7c2d12', text: '#ffffff' },
  poison: { bg: '#a855f7', border: '#7e22ce', text: '#ffffff' },
  ground: { bg: '#d97706', border: '#92400e', text: '#ffffff' },
  flying: { bg: '#818cf8', border: '#4f46e5', text: '#ffffff' },
  psychic: { bg: '#ec4899', border: '#be185d', text: '#ffffff' },
  bug: { bg: '#84cc16', border: '#4d7c0f', text: '#1a2e05' },
  rock: { bg: '#a8895c', border: '#785a32', text: '#ffffff' },
  ghost: { bg: '#6d28d9', border: '#4c1d95', text: '#ffffff' },
  dragon: { bg: '#4f46e5', border: '#312e81', text: '#ffffff' },
};

type EffectivenessMap = Partial<Record<ElementType, Partial<Record<ElementType, number>>>>;

const CHART: EffectivenessMap = {
  normal: { rock: 0.5, ghost: 0 },
  fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5 },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5 },
  ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0 },
  poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5 },
  ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2 },
  flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5 },
  bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5 },
  rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2 },
  ghost: { normal: 0, psychic: 2, ghost: 2 },
  dragon: { dragon: 2 },
};

export function getTypeEffectiveness(moveType: ElementType, defenderTypes: ElementType[]): number {
  const row = CHART[moveType] ?? {};
  let multiplier = 1;
  for (const defType of defenderTypes) {
    const val = row[defType];
    if (val !== undefined) {
      multiplier *= val;
    }
  }
  return multiplier;
}

export function getEffectivenessLabel(multiplier: number): string | null {
  if (multiplier === 0) return "It doesn't affect the target...";
  if (multiplier >= 2) return "It's super effective!";
  if (multiplier < 1) return "It's not very effective...";
  return null;
}
