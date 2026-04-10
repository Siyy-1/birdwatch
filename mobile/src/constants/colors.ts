export const Colors = {
  // 브랜드
  primary:   '#1B4332',   // 딥 포레스트 그린 (앱 주색)
  secondary: '#52B788',   // 밝은 그린 (액션, 강조)
  accent:    '#D8F3DC',   // 연한 민트 (배경 강조)

  // 희귀도 등급
  rarity: {
    common:    '#6C757D',  // 회색
    migrant:   '#2196F3',  // 파란색
    rare:      '#FF9800',  // 주황색
    legendary: '#FFD700',  // 골드
  },

  // 배경
  bg: {
    primary:   '#FFFFFF',
    secondary: '#F8F9FA',
    card:      '#FFFFFF',
    overlay:   'rgba(0,0,0,0.5)',
  },

  // 텍스트
  text: {
    primary:   '#1C1C1E',
    secondary: '#6C6C70',
    disabled:  '#AEAEB2',
    inverse:   '#FFFFFF',
  },

  // 시스템
  success:  '#34C759',
  warning:  '#FF9500',
  error:    '#FF3B30',
  info:     '#007AFF',

  // 다크 모드 오버라이드 (useColorScheme으로 선택)
  dark: {
    bg: {
      primary:   '#000000',
      secondary: '#1C1C1E',
      card:      '#2C2C2E',
    },
    text: {
      primary:   '#FFFFFF',
      secondary: '#EBEBF5',
    },
  },
} as const

export type RarityTier = keyof typeof Colors.rarity
