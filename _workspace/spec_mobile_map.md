# Mobile 지도 화면 스펙 — app/(tabs)/index.tsx

## 목적
BirdWatch 앱의 메인 지도 탭. 사용자 주변 최근 목격 기록을 지도 위에 마커로 표시한다.

## 의존성 추가 (mobile/package.json에 추가)
```json
"react-native-maps": "1.14.0"
```
expo-managed workflow에서 동작. app.json plugins 배열에 추가 불필요 (expo managed).

## 출력 파일
- `mobile/app/(tabs)/index.tsx` (지도 화면, 단일 파일로 완성)

## 참조 파일 (반드시 읽을 것)
- `mobile/src/types/api.ts` — Sighting, Species 타입
- `mobile/src/services/api.ts` — sightingsApi.list()
- `mobile/src/store/authStore.ts` — useAuthStore (user 상태)
- `mobile/src/constants/colors.ts` — Colors 토큰
- `mobile/app/(tabs)/camera.tsx` — 스타일 패턴 참조

## 화면 구성

### 레이아웃
```
┌─────────────────────────────┐
│  [BirdWatch]    [내 위치 ↺]  │  ← 헤더 (SafeArea)
├─────────────────────────────┤
│                             │
│        MapView              │
│    (fullscreen)             │
│  ● ● markers                │
│                             │
├─────────────────────────────┤
│  📷  탭바 (기존 _layout)    │
└─────────────────────────────┘
```

### 마커 CalloutView
마커 탭 시 표시:
```
┌─────────────────────┐
│ [썸네일 60x60]  종명 │
│                 ★3점 │
│           2시간 전   │
└─────────────────────┘
```

## 기능 상세

### 1. 지도 초기화
- MapView (react-native-maps) provider: 기본(PROVIDER_DEFAULT, iOS/Android 자동)
- 초기 region: 사용자 현재 위치 or 서울(lat:37.5665, lng:126.9780) fallback
- mapType: 'standard'
- showsUserLocation: true
- showsMyLocationButton: false (직접 구현)

### 2. 목격 마커 로드
```typescript
// 앱 포커스 시 + 초기 마운트 시 호출
const loadSightings = async () => {
  const res = await sightingsApi.list({ limit: 50, page: 1 })
  // res.data.data: Sighting[]
}
```
- 로딩 중: ActivityIndicator (지도 위 오버레이)
- 에러 시: Alert('목격 기록을 불러올 수 없습니다')

### 3. 마커 색상 (rarity_tier 기반)
마커는 MapView의 Marker 컴포넌트 사용. pinColor로 색상 구분:
- common: '#6C757D' (회색)
- migrant: '#2196F3' (파란색)
- rare: '#FF9800' (주황색)
- legendary: '#FFD700' (골드)

rarity_tier는 sighting에 없으므로, sighting.species_id로 로컬 species 매핑 불필요.
→ 대신, ai_confidence가 있으면 초록, 없으면 회색 핀 사용 (단순화).

### 4. Callout (마커 탭)
```tsx
<Callout onPress={() => {/* 상세 화면 이동 (future) */}}>
  <View style={styles.callout}>
    {sighting.photo_cdn_url
      ? <Image source={{ uri: sighting.photo_cdn_url }} style={styles.calloutImg} />
      : <View style={styles.calloutImgPlaceholder} />
    }
    <View style={styles.calloutInfo}>
      <Text style={styles.calloutSpecies}>{sighting.species_id}</Text>
      <Text style={styles.calloutTime}>{formatRelativeTime(sighting.observed_at)}</Text>
      <Text style={styles.calloutPoints}>+{sighting.points_earned}pt</Text>
    </View>
  </View>
</Callout>
```

### 5. 내 위치 버튼
```tsx
// 지도 우상단 FAB
<TouchableOpacity style={styles.myLocBtn} onPress={goToMyLocation}>
  <Text style={{ fontSize: 18 }}>📍</Text>
</TouchableOpacity>
```
- 탭 시: mapRef.current?.animateToRegion(currentRegion, 500)

### 6. useFocusEffect
탭 포커스 시마다 loadSightings() 재호출.

## 상태 (useState)
```typescript
const [sightings, setSightings] = useState<Sighting[]>([])
const [isLoading, setIsLoading] = useState(false)
const [myRegion, setMyRegion] = useState<Region | null>(null)
```

## 헬퍼
```typescript
function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}분 전`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}시간 전`
  return `${Math.floor(hrs / 24)}일 전`
}
```

## 위치 권한
expo-location으로 현재 위치 취득 (useEffect 초기 1회):
```typescript
const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
setMyRegion({ latitude: loc.coords.latitude, longitude: loc.coords.longitude,
               latitudeDelta: 0.05, longitudeDelta: 0.05 })
```
권한 거부 시: 서울 fallback region 사용.

## 스타일 규칙
- SafeAreaView로 전체 감싸기
- mapView: flex:1, 전체 화면
- header: absolute 상단 (backgroundColor: 'rgba(255,255,255,0.95)', padding:12, borderRadius:12, margin:12)
- myLocBtn: absolute 우상단 (backgroundColor: Colors.primary, borderRadius:28, padding:12)
- callout: width:180, flexDirection:'row', gap:8, padding:8
- calloutImg: width:60, height:60, borderRadius:8
- calloutImgPlaceholder: width:60, height:60, borderRadius:8, backgroundColor:'#F0F0F0'

## 주의사항
- MapView import: `import MapView, { Marker, Callout, PROVIDER_DEFAULT } from 'react-native-maps'`
- Region import: `import type { Region } from 'react-native-maps'`
- mapRef: `const mapRef = useRef<MapView>(null)`
- useFocusEffect import: `import { useFocusEffect } from 'expo-router'`
- useCallback으로 useFocusEffect 내부 감싸기
- Colors import: `import { Colors } from '../../src/constants/colors'`
