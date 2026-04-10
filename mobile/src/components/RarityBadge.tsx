import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import type { RarityTier } from '../types/api'
import { RARITY_LABEL, RARITY_COLOR } from '../constants/rarity'

interface RarityBadgeProps {
  rarity_tier: RarityTier
}

export function RarityBadge({ rarity_tier }: RarityBadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: RARITY_COLOR[rarity_tier] }]}>
      <Text style={styles.badgeText}>{RARITY_LABEL[rarity_tier]}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
})
