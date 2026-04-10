# Mobile 프로필 화면 스펙 — app/(tabs)/profile.tsx

## 목적
BirdWatch 프로필 탭. 유저 통계, 구독 상태, GPS 동의 설정, 로그아웃을 제공한다.

## 출력 파일
- `mobile/app/(tabs)/profile.tsx` (단일 파일로 완성)

## 참조 파일
- `mobile/src/types/api.ts` — User, Sighting
- `mobile/src/services/api.ts` — sightingsApi.list(), usersApi
- `mobile/src/store/authStore.ts` — useAuthStore (user, signOut, updateGpsConsent)
- `mobile/src/constants/colors.ts` — Colors

## 화면 구성 (ScrollView)

```
┌─────────────────────────────────┐
│  프로필                          │  ← 헤더
├─────────────────────────────────┤
│    [아바타 72x72]                │
│    닉네임                        │  ← 프로필 섹션
│    [FREE] or [PREMIUM] 뱃지     │
├─────────────────────────────────┤
│  [총 포인트] [스트릭] [종 수집]  │  ← 통계 3열
│   1,234pt    7일 🔥   47종      │
├─────────────────────────────────┤
│  ▼ 최근 목격                    │  ← 섹션 헤더
│  ┌─ 황새  2시간 전  +1pt ──────┐ │
│  └──────────────────────────────┘ │
│  ┌─ 왜가리 어제  +1pt ──────────┐ │
│  └──────────────────────────────┘ │
├─────────────────────────────────┤
│  ▼ 설정                         │
│  [📍 GPS 위치 동의  ──○──]      │  ← Switch
│  [🌟 Explorer Pass 업그레이드]   │  ← premium 아니면 표시
├─────────────────────────────────┤
│  [로그아웃]                      │
└─────────────────────────────────┘
```

## 기능 상세

### 1. 프로필 섹션
```typescript
const { user, signOut, updateGpsConsent } = useAuthStore()
```
- 아바타: user.profile_image_key 있으면 CDN URL로 Image, 없으면 닉네임 첫 글자 원형 텍스트
  - CDN URL: `https://${process.env.EXPO_PUBLIC_CDN_DOMAIN}/${user.profile_image_key}`
  - 아바타 크기: 72x72, borderRadius:36
  - 플레이스홀더: backgroundColor=Colors.primary, 흰 텍스트 (첫 글자 대문자)
- 구독 뱃지:
  - free: backgroundColor='#E0E0E0', color='#666', 'FREE'
  - premium: backgroundColor=Colors.rarity.legendary, color='white', '✨ PREMIUM'

### 2. 통계 3열
```typescript
const stats = [
  { label: '포인트', value: formatNumber(user.total_points) + 'pt', icon: '🏆' },
  { label: '스트릭', value: `${user.streak_days}일`, icon: '🔥' },
  { label: '수집 종', value: `${user.species_count}종`, icon: '🐦' },
]
```
- 각 stat: flex:1, alignItems:'center', padding:16, backgroundColor:Colors.bg.card, borderRadius:12
- 3개 가로 배치 (flexDirection:'row', gap:8)

```typescript
function formatNumber(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n)
}
```

### 3. 최근 목격 (최대 5개)
```typescript
const loadRecentSightings = async () => {
  const res = await sightingsApi.list({ limit: 5, page: 1 })
  setRecentSightings(res.data.data)
}
```
useFocusEffect 시 호출.

#### SightingRow (인라인 컴포넌트)
```
┌─────────────────────────────────────┐
│ [썸네일 44x44] species_id  관찰시간  │
│               +{points}pt           │
└─────────────────────────────────────┘
```
- 썸네일: photo_cdn_url 있으면 Image, 없으면 🐦 플레이스홀더
- 관찰 시간: formatRelativeTime(observed_at)
- points_earned: '+{n}pt' (Colors.secondary 색)

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

목격 없을 시:
```tsx
<Text style={{ color: Colors.text.secondary, textAlign: 'center', padding: 16 }}>
  아직 목격 기록이 없습니다 🐦
</Text>
```

### 4. GPS 동의 Switch
```tsx
<View style={styles.settingRow}>
  <Text style={styles.settingLabel}>📍 GPS 위치 동의</Text>
  <Switch
    value={user?.gps_consent ?? false}
    onValueChange={handleGpsConsent}
    trackColor={{ false: '#E0E0E0', true: Colors.secondary }}
    thumbColor={user?.gps_consent ? Colors.primary : '#FFFFFF'}
  />
</View>
```

```typescript
const handleGpsConsent = async (value: boolean) => {
  try {
    await updateGpsConsent(value)
  } catch {
    Alert.alert('오류', 'GPS 동의 변경에 실패했습니다')
  }
}
```

### 5. Explorer Pass 업그레이드 CTA
user.subscription_tier === 'free'일 때만 표시:
```tsx
<TouchableOpacity style={styles.upgradeBtn} onPress={() => Alert.alert('준비 중', 'Explorer Pass 구독은 곧 오픈됩니다!')}>
  <Text style={styles.upgradeBtnText}>🌟 Explorer Pass 업그레이드</Text>
  <Text style={styles.upgradeBtnSub}>월 6,900원 · 무제한 AI 식별 · 전체 300종 도감</Text>
</TouchableOpacity>
```
- backgroundColor: Colors.primary, borderRadius:12, padding:16

### 6. 로그아웃
```tsx
<TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
  <Text style={styles.signOutText}>로그아웃</Text>
</TouchableOpacity>
```

```typescript
const handleSignOut = () => {
  Alert.alert('로그아웃', '정말 로그아웃 하시겠습니까?', [
    { text: '취소', style: 'cancel' },
    { text: '로그아웃', style: 'destructive', onPress: () => signOut() },
  ])
}
```

### 7. 섹션 헤더 (인라인 컴포넌트)
```typescript
function SectionHeader({ title }: { title: string }) {
  return (
    <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.text.secondary,
                   paddingH: 16, paddingV: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
      {title}
    </Text>
  )
}
```

## 상태
```typescript
const [recentSightings, setRecentSightings] = useState<Sighting[]>([])
const [isLoading, setIsLoading] = useState(false)
```

## 스타일 규칙
- container: flex:1, backgroundColor:Colors.bg.secondary
- headerText: fontSize:20, fontWeight:'700', color:Colors.text.primary, padding:16
- profileCard: backgroundColor:Colors.bg.card, alignItems:'center', padding:24, margin:8, borderRadius:16
- nickname: fontSize:18, fontWeight:'600', color:Colors.text.primary, marginTop:8
- subscriptionBadge: marginTop:6, paddingH:10, paddingV:3, borderRadius:20
- statsContainer: flexDirection:'row', gap:8, marginH:8, marginB:8
- settingRow: flexDirection:'row', justifyContent:'space-between', alignItems:'center',
             paddingH:16, paddingV:14, backgroundColor:Colors.bg.card
- settingLabel: fontSize:15, color:Colors.text.primary
- signOutBtn: margin:16, padding:14, borderRadius:12, borderWidth:1, borderColor:Colors.error,
             alignItems:'center'
- signOutText: color:Colors.error, fontWeight:'600', fontSize:15
- upgradeBtn: margin:16, padding:16, borderRadius:12, backgroundColor:Colors.primary
- upgradeBtnText: color:'white', fontWeight:'700', fontSize:15
- upgradeBtnSub: color:'rgba(255,255,255,0.8)', fontSize:12, marginTop:4

## 주의사항
- ScrollView (not FlatList) — 고정 콘텐츠
- user가 null일 경우 처리: user가 null이면 ActivityIndicator 표시
- useFocusEffect import: `import { useFocusEffect } from 'expo-router'`
- useCallback으로 useFocusEffect 내부 감싸기
- paddingH/paddingV 는 React Native에 없음 → paddingHorizontal/paddingVertical 사용
- Switch import: `import { Switch } from 'react-native'`
