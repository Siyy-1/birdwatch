import { Colors } from './colors'
import type { RarityTier } from '../types/api'

export const RARITY_LABEL: Record<RarityTier, string> = {
  common:    '일반',
  migrant:   '나그네',
  rare:      '희귀',
  legendary: '전설',
}

export const RARITY_COLOR: Record<RarityTier, string> = {
  common:    Colors.rarity.common,
  migrant:   Colors.rarity.migrant,
  rare:      Colors.rarity.rare,
  legendary: Colors.rarity.legendary,
}

export const RARITY_BG: Record<RarityTier, string> = {
  common:    '#F0F0F0',
  migrant:   '#E3F2FD',
  rare:      '#FFF3E0',
  legendary: '#FFFDE7',
}
