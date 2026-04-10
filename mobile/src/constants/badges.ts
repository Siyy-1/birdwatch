export type BadgeId =
  | 'first_sighting'
  | 'streak_3'
  | 'streak_7'
  | 'streak_30'
  | 'species_10'
  | 'species_50'
  | 'species_100'
  | 'points_1000'
  | 'points_5000'

export interface Badge {
  id: BadgeId
  name: string
  description: string
  icon: string
  condition: (user: { total_points: number; streak_days: number; species_count: number }) => boolean
}

export const BADGES: Badge[] = [
  { id: 'first_sighting', name: '첫 발견', description: '첫 번째 조류 목격', icon: '🐣', condition: (u) => u.species_count >= 1 },
  { id: 'streak_3', name: '3일 연속', description: '3일 연속 목격', icon: '🔥', condition: (u) => u.streak_days >= 3 },
  { id: 'streak_7', name: '1주일 연속', description: '7일 연속 목격', icon: '🔥🔥', condition: (u) => u.streak_days >= 7 },
  { id: 'streak_30', name: '한 달 연속', description: '30일 연속 목격', icon: '💫', condition: (u) => u.streak_days >= 30 },
  { id: 'species_10', name: '조류학자', description: '10종 수집', icon: '📚', condition: (u) => u.species_count >= 10 },
  { id: 'species_50', name: '탐조 전문가', description: '50종 수집', icon: '🔭', condition: (u) => u.species_count >= 50 },
  { id: 'species_100', name: '조류 마스터', description: '100종 수집', icon: '🏆', condition: (u) => u.species_count >= 100 },
  { id: 'points_1000', name: '1000점 달성', description: '누적 포인트 1,000점', icon: '⭐', condition: (u) => u.total_points >= 1000 },
  { id: 'points_5000', name: '5000점 달성', description: '누적 포인트 5,000점', icon: '🌟', condition: (u) => u.total_points >= 5000 },
]
