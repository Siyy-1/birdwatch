# Mobile Phase 1 스펙 — React Native (Expo) 스캐폴딩

## 목적
BirdWatch 모바일 앱 기반 구조 생성.
React Native + Expo SDK 51 + TypeScript + Expo Router v3 (파일 기반 라우팅)

## Codex 담당 출력 파일 (4개)

| 파일 | 내용 |
|------|------|
| `mobile/package.json` | 의존성 + 스크립트 |
| `mobile/app.json` | Expo 설정 (권한, 번들 ID) |
| `mobile/tsconfig.json` | TypeScript 설정 |
| `mobile/src/constants/colors.ts` | BirdWatch 디자인 컬러 토큰 |

---

## 파일 1: package.json

```json
{
  "name": "birdwatch-mobile",
  "version": "0.1.0",
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "lint": "eslint . --ext .ts,.tsx",
    "test": "jest --passWithNoTests"
  },
  "dependencies": {
    "expo": "~51.0.28",
    "expo-router": "~3.5.23",
    "react": "18.2.0",
    "react-native": "0.74.5",
    "expo-camera": "~15.0.16",
    "expo-location": "~17.0.1",
    "expo-sqlite": "~14.0.6",
    "expo-secure-store": "~13.0.2",
    "expo-auth-session": "~5.5.2",
    "expo-crypto": "~13.0.2",
    "expo-web-browser": "~13.0.3",
    "expo-apple-authentication": "~6.4.2",
    "expo-image": "~1.12.15",
    "expo-haptics": "~13.0.1",
    "expo-status-bar": "~1.12.1",
    "expo-network": "~6.0.1",
    "expo-file-system": "~17.0.1",
    "expo-image-manipulator": "~12.0.5",
    "@react-navigation/native": "^6.1.18",
    "react-native-safe-area-context": "4.10.5",
    "react-native-screens": "3.31.1",
    "react-native-gesture-handler": "~2.16.1",
    "react-native-reanimated": "~3.10.1",
    "zustand": "^4.5.4",
    "@tanstack/react-query": "^5.51.1",
    "axios": "^1.7.3"
  },
  "devDependencies": {
    "@babel/core": "^7.24.0",
    "@types/react": "~18.2.79",
    "typescript": "^5.3.3",
    "jest": "^29.7.0",
    "jest-expo": "~51.0.4",
    "@testing-library/react-native": "^12.5.1",
    "eslint": "^8.57.0",
    "@typescript-eslint/eslint-plugin": "^7.18.0",
    "@typescript-eslint/parser": "^7.18.0",
    "eslint-plugin-react": "^7.35.0",
    "eslint-plugin-react-hooks": "^4.6.2"
  },
  "jest": {
    "preset": "jest-expo"
  }
}
```

---

## 파일 2: app.json

```json
{
  "expo": {
    "name": "BirdWatch",
    "slug": "birdwatch",
    "version": "0.1.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#1B4332"
    },
    "ios": {
      "bundleIdentifier": "kr.birdwatch.app",
      "supportsTablet": false,
      "infoPlist": {
        "NSCameraUsageDescription": "조류 사진 촬영을 위해 카메라 접근이 필요합니다.",
        "NSLocationWhenInUseUsageDescription": "조류 목격 위치 기록을 위해 위치 접근이 필요합니다.",
        "NSPhotoLibraryUsageDescription": "갤러리에서 조류 사진을 선택하기 위해 필요합니다."
      }
    },
    "android": {
      "package": "kr.birdwatch.app",
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#1B4332"
      },
      "permissions": [
        "android.permission.CAMERA",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.READ_EXTERNAL_STORAGE"
      ]
    },
    "plugins": [
      "expo-router",
      ["expo-camera", { "cameraPermission": "조류 사진 촬영을 위해 카메라 접근이 필요합니다." }],
      ["expo-location", { "locationWhenInUsePermission": "조류 목격 위치 기록을 위해 위치 접근이 필요합니다." }]
    ],
    "scheme": "birdwatch",
    "extra": {
      "router": { "origin": false }
    }
  }
}
```

---

## 파일 3: tsconfig.json

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.d.ts", "expo-env.d.ts"]
}
```

---

## 파일 4: src/constants/colors.ts

BirdWatch 브랜드 컬러 토큰. 라이트/다크 모드 지원.

```typescript
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
```

---

## 참조
- `backend/src/db/types.ts` — API 응답 타입과 일치해야 함
- `_workspace/spec_backend_phase1.md` — API 엔드포인트 구조
