import { useState, useRef, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps'
import * as Location from 'expo-location'
import { useFocusEffect, useRouter } from 'expo-router'

import { Colors } from '../../src/constants/colors'
import { formatRelativeTime } from '../../src/utils/time'
import { sightingsApi } from '../../src/services/api'
import type { Sighting, Paginated } from '../../src/types/api'

const SEOUL = { latitude: 37.5665, longitude: 126.978 }
const INITIAL_DELTA = { latitudeDelta: 0.08, longitudeDelta: 0.08 }

type SelectedSighting = {
  sighting_id: string
  species_id: string
  name_ko: string
  ai_confidence: number | null
  points_earned: number
  observed_at: string
}

export default function MapScreen() {
  const router = useRouter()
  const mapRef = useRef<MapView>(null)

  const [sightings, setSightings] = useState<Sighting[]>([])
  const [selected, setSelected] = useState<SelectedSighting | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [myLocation, setMyLocation] = useState<{ latitude: number; longitude: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status !== 'granted') return
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        .then((loc) => {
          if (!cancelled) {
            setMyLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude })
          }
        })
        .catch(() => {})
    })
    return () => { cancelled = true }
  }, [])

  const loadSightings = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await sightingsApi.list({ limit: 50, page: 1 })
      setSightings((res.data as Paginated<Sighting>).data)
      setSelected(null)
    } catch {
      Alert.alert('오류', '목격 기록을 불러올 수 없습니다')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadSightings()
    }, [loadSightings]),
  )

  const goToMyLocation = useCallback(() => {
    const target = myLocation ?? SEOUL
    mapRef.current?.animateToRegion({
      latitude: target.latitude,
      longitude: target.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    }, 500)
  }, [myLocation])

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{ ...SEOUL, ...INITIAL_DELTA }}
        showsUserLocation
        showsMyLocationButton={false}
        toolbarEnabled={false}
        onPress={() => setSelected(null)}
      >
        {sightings.map((s) => (
          <Marker
            key={s.sighting_id}
            coordinate={{ latitude: s.lat, longitude: s.lng }}
            onPress={() =>
              setSelected({
                sighting_id: s.sighting_id,
                species_id: s.species_id,
                name_ko: s.name_ko,
                ai_confidence: s.ai_confidence ?? null,
                points_earned: s.points_earned,
                observed_at: s.observed_at,
              })
            }
          >
            <View style={styles.markerWrap}>
              <View style={styles.markerDot} />
              <Text style={styles.markerLabel} numberOfLines={1}>
                {s.name_ko}
              </Text>
            </View>
          </Marker>
        ))}
      </MapView>

      <View style={styles.header} pointerEvents="none">
        <Text style={styles.headerTitle}>BirdWatch</Text>
      </View>

      <TouchableOpacity
        style={styles.myLocBtn}
        onPress={goToMyLocation}
        accessibilityLabel="내 위치로 이동"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.myLocIcon}>📍</Text>
      </TouchableOpacity>

      {selected ? (
        <View style={styles.bottomCardWrap}>
          <TouchableOpacity
            activeOpacity={0.95}
            style={styles.bottomCard}
            onPress={() => {
              setSelected(null)
              router.push(`/species/${selected.species_id}`)
            }}
          >
            <View style={styles.bottomCardContent}>
              <View style={styles.bottomCardInfo}>
                <Text style={styles.bottomCardSpecies} numberOfLines={1}>
                  {selected.name_ko}
                </Text>
                <Text style={styles.bottomCardMeta}>
                  {formatRelativeTime(selected.observed_at)}
                </Text>
                <Text style={styles.bottomCardPoints}>+{selected.points_earned}pt</Text>
              </View>
              <Text style={styles.bottomCardArrow}>›</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bottomCardClose}
            onPress={() => setSelected(null)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.bottomCardCloseText}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : null}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  map: {
    flex: 1,
  },
  markerWrap: {
    alignItems: 'center',
  },
  markerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  markerLabel: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    color: Colors.text.primary,
    fontSize: 12,
    overflow: 'hidden',
  },
  header: {
    position: 'absolute',
    top: 56,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.3,
  },
  myLocBtn: {
    position: 'absolute',
    top: 128,
    right: 12,
    backgroundColor: Colors.primary,
    borderRadius: 28,
    padding: 12,
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  myLocIcon: {
    fontSize: 18,
  },
  bottomCardWrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 24,
  },
  bottomCard: {
    backgroundColor: Colors.bg.card,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  bottomCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bottomCardInfo: {
    flex: 1,
  },
  bottomCardArrow: {
    fontSize: 22,
    color: Colors.text.disabled,
    marginLeft: 8,
  },
  bottomCardClose: {
    position: 'absolute',
    top: -10,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.text.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomCardCloseText: {
    fontSize: 11,
    color: Colors.text.inverse,
    fontWeight: '700',
  },
  bottomCardSpecies: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  bottomCardMeta: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  bottomCardPoints: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.secondary,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
})
