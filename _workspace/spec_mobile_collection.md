# Mobile 도감 화면 스펙 — app/(tabs)/collection.tsx

## 목적
BirdWatch 도감 탭. 전체 종 목록을 표시하며, 수집 여부·희귀도 필터·검색을 제공한다.
free 사용자는 is_locked_free=true 종은 잠금 표시.

## 출력 파일
- `mobile/app/(tabs)/collection.tsx` (단일 파일로 완성)

## 참조 파일
- `mobile/src/types/api.ts` — Species, Paginated, RarityTier
- `mobile/src/services/api.ts` — speciesApi.list(), sightingsApi.list()
- `mobile/src/store/authStore.ts` — useAuthStore (user.subscription_tier)
- `mobile/src/constants/colors.ts` — Colors

## 화면 구성

```
┌─────────────────────────────────┐
│  도감  (300종)                   │  ← 헤더
├─────────────────────────────────┤
│  🔍 [검색창________________]    │
├─────────────────────────────────┤
│ [전체] [common] [migrant] [rare] [legendary] │  ← 필터 탭
├─────────────────────────────────┤
│ ┌───┬──────────────────────┐   │
│ │ 🖼 │ 황새          ★legendary│  │
│ │   │ Ciconia boyciana      │   │
│ │   │ 천연기념물 제199호 🔒   │   │
│ └───┴──────────────────────┘   │
│ ┌───┬──────────────────────┐   │
│ │ 🖼 │ 참수리        ★rare   │  │
│ │   │ Haliaeetus pelagicus  │   │
│ └───┴──────────────────────┘   │
│  ... (FlatList 무한 스크롤)      │
└─────────────────────────────────┘
```

## 기능 상세

### 1. 종 목록 로드 (페이지네이션)
```typescript
const loadSpecies = async (page: number, reset = false) => {
  const res = await speciesApi.list({
    page,
    limit: 20,
    rarity_tier: selectedRarity !== 'all' ? selectedRarity : undefined,
    search: searchText.trim() || undefined,
  })
  const items: Species[] = res.data.data
  const pagination = res.data.pagination
  setSspecies(reset ? items : prev => [...prev, ...items])
  setHasMore(page < pagination.total_pages)
}
```
- 초기: page=1, reset=true
- onEndReached: page+1 로드

### 2. 수집 여부 (collectedIds)
```typescript
// 내 목격 기록에서 species_id Set 구성
const loadCollected = async () => {
  const res = await sightingsApi.list({ limit: 300 })
  const ids = new Set((res.data.data as Sighting[]).map(s => s.species_id))
  setCollectedIds(ids)
}
```
화면 초기 1회 + useFocusEffect 시 호출.

### 3. 검색
TextInput onChange → debounce 500ms → page=1 reset 재로드.
debounce는 useRef + setTimeout으로 직접 구현 (라이브러리 없이).

### 4. 필터 탭
```
[전체] [common] [migrant] [rare] [legendary]
```
- ScrollView horizontal
- 선택된 탭: backgroundColor=Colors.primary, color=white
- 미선택: backgroundColor=Colors.accent, color=Colors.text.primary

변경 시 → page=1 reset 재로드.

### 5. SpeciesItem 컴포넌트 (화면 내 인라인 정의)
```typescript
interface SpeciesItemProps {
  species: Species
  isCollected: boolean
  isLocked: boolean  // is_locked_free && subscription_tier === 'free'
}
```

#### 레이아웃
```
┌─────────────────────────────────┐
│ [80x80 이미지/플레이스홀더] │ 이름Ko │
│                            │ 이름Sci │
│                            │ [RarityBadge] [포인트]pt │
│                            │ [수집됨 ✓] or [미수집] │
└─────────────────────────────────┘
```
- 이미지: 없으면 새 이모지 플레이스홀더 (🐦, 배경색은 rarity별 연한 색)
- isLocked: 이미지 위에 반투명 검정 오버레이 + 🔒 텍스트
- isCollected: 우측 상단에 초록 ✓ 뱃지

#### RarityBadge (인라인 컴포넌트)
```typescript
const RARITY_LABEL: Record<RarityTier, string> = {
  common: '일반',
  migrant: '나그네',
  rare: '희귀',
  legendary: '전설',
}
const RARITY_COLOR: Record<RarityTier, string> = {
  common: Colors.rarity.common,
  migrant: Colors.rarity.migrant,
  rare: Colors.rarity.rare,
  legendary: Colors.rarity.legendary,
}
```
뱃지: `{RARITY_LABEL[rarity_tier]}` 텍스트, borderRadius:4, paddingH:6, paddingV:2, backgroundColor=RARITY_COLOR

### 6. 상태
```typescript
const [species, setSpecies] = useState<Species[]>([])
const [collectedIds, setCollectedIds] = useState<Set<string>>(new Set())
const [isLoading, setIsLoading] = useState(false)
const [isRefreshing, setIsRefreshing] = useState(false)
const [hasMore, setHasMore] = useState(true)
const [page, setPage] = useState(1)
const [searchText, setSearchText] = useState('')
const [selectedRarity, setSelectedRarity] = useState<RarityTier | 'all'>('all')
```

### 7. Pull-to-refresh
FlatList의 refreshing + onRefresh prop 사용.
onRefresh: page=1 reset 재로드 + collectedIds 재로드.

### 8. ListFooterComponent
```tsx
{isLoading && !isRefreshing && <ActivityIndicator color={Colors.primary} style={{ padding: 16 }} />}
```

### 9. ListEmptyComponent
```tsx
<View style={{ padding: 40, alignItems: 'center' }}>
  <Text style={{ fontSize: 40 }}>🐦</Text>
  <Text style={{ color: Colors.text.secondary, marginTop: 8 }}>검색 결과가 없습니다</Text>
</View>
```

## 헤더
SafeAreaView 내 상단:
```
도감   [종 총 개수 / 수집 개수]
```
예: `도감  47 / 300종`

## 스타일 규칙
- container: flex:1, backgroundColor:Colors.bg.secondary
- headerRow: flexDirection:row, justifyContent:'space-between', paddingH:16, paddingV:12, backgroundColor:Colors.bg.primary
- searchInput: margin:8, padding:10, backgroundColor:Colors.bg.secondary, borderRadius:10, fontSize:14
- filterScroll: paddingH:8, paddingV:6, backgroundColor:Colors.bg.primary
- filterBtn: paddingH:12, paddingV:6, borderRadius:20, marginH:4
- itemContainer: flexDirection:row, backgroundColor:Colors.bg.card, marginH:8, marginV:4, borderRadius:12, overflow:'hidden', elevation:1

## 주의사항
- FlatList keyExtractor: item => item.species_id
- onEndReachedThreshold: 0.3
- import Sighting from types (collectedIds 로드 시 필요)
- useFocusEffect import: `import { useFocusEffect } from 'expo-router'`
- useCallback으로 useFocusEffect 내부 감싸기
