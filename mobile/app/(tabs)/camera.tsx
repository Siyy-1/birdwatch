/**
 * camera.tsx — 카메라 + AI 조류 식별 화면
 *
 * 플로우:
 * 1. 카메라 권한 요청
 * 2. GPS 동의 확인 (없으면 ConsentModal)
 * 3. 촬영 → 클라이언트 EXIF 제거 → S3 업로드 → AI 식별 API 호출
 * 4. AI 결과 바텀시트 표시
 * 5. 사용자 확인 → 오프라인 큐 또는 바로 POST /api/v1/sightings
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as Location from 'expo-location'
import * as Network from 'expo-network'
import { useFocusEffect, useRouter } from 'expo-router'
import {
  GestureHandlerRootView,
  GestureDetector,
  Gesture,
} from 'react-native-gesture-handler'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  withTiming,
  Easing,
} from 'react-native-reanimated'

import { Colors } from '../../src/constants/colors'
import { useAuthStore } from '../../src/store/authStore'
import {
  completePendingReview,
  enqueuePendingPhoto,
  enqueuePendingSighting,
  getNextPendingReview,
  type PendingReviewItem,
} from '../../src/services/storage/offlineQueue'
import { persistSanitizedImageForQueue, sanitizeImageForUpload } from '../../src/services/media/imageSanitizer'
import { identifyPhotoByS3Key, uploadPhotoAsset } from '../../src/services/media/photoPipeline'
import { sightingsApi, galleryApi } from '../../src/services/api'
import type { AiIdentifyResult, CreateSightingRequest } from '../../src/types/api'
import { AIResultReviewSheet } from '../../src/components/AIResultReviewSheet'

// ---------------------------------------------------------------------------
// 상수
// ---------------------------------------------------------------------------

/** expo-camera zoom prop 범위: 0~1. 배율 범위: 1x~10x */
const MIN_MAGNIFICATION = 1
const MAX_MAGNIFICATION = 10
const SLIDER_HEIGHT = 240 // 슬라이더 트랙 높이 (px)

/** 배율 → zoom prop 변환 */
function magnificationToZoomProp(mag: number): number {
  'worklet'
  return (mag - MIN_MAGNIFICATION) / (MAX_MAGNIFICATION - MIN_MAGNIFICATION)
}

/** zoom prop → 배율 변환 */
function zoomPropToMagnification(zoom: number): number {
  'worklet'
  return zoom * (MAX_MAGNIFICATION - MIN_MAGNIFICATION) + MIN_MAGNIFICATION
}

/** 배율을 슬라이더 트랙 위치(0=하단=1x, SLIDER_HEIGHT=상단=10x)로 변환 */
function magToSliderY(mag: number): number {
  'worklet'
  const ratio = (mag - MIN_MAGNIFICATION) / (MAX_MAGNIFICATION - MIN_MAGNIFICATION)
  return SLIDER_HEIGHT * (1 - ratio)
}

/** 슬라이더 Y 위치 → 배율 변환 */
function sliderYToMag(y: number): number {
  'worklet'
  const clamped = Math.max(0, Math.min(SLIDER_HEIGHT, y))
  const ratio = 1 - clamped / SLIDER_HEIGHT
  return MIN_MAGNIFICATION + ratio * (MAX_MAGNIFICATION - MIN_MAGNIFICATION)
}

const PRESET_MAGNIFICATIONS = [1, 2, 5] as const

type CameraState = 'ready' | 'capturing' | 'sanitizing' | 'uploading' | 'identifying' | 'result'

interface CapturedPhoto {
  uri: string
  s3Key: string
}

interface CapturedLocation {
  lat: number | null
  lng: number | null
  locationAccuracyM?: number
}

interface CelebrationData {
  species_name: string
  points: number
  rarity_tier: string
}

// ---------------------------------------------------------------------------
// ZoomSlider 컴포넌트
// ---------------------------------------------------------------------------

interface ZoomSliderProps {
  magnification: number
  onMagnificationChange: (mag: number) => void
}

function ZoomSlider({ magnification, onMagnificationChange }: ZoomSliderProps) {
  // 슬라이더 썸 위치 (Y축, 0=상단=10x, SLIDER_HEIGHT=하단=1x)
  const thumbY = useSharedValue(magToSliderY(magnification))
  // 팬 시작 시점의 thumbY 스냅샷
  const panStartY = useSharedValue(magToSliderY(magnification))

  // 외부 magnification 변경(핀치 등) → 슬라이더 동기화
  useEffect(() => {
    thumbY.value = withTiming(magToSliderY(magnification), {
      duration: 80,
      easing: Easing.out(Easing.quad),
    })
  }, [magnification])

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      panStartY.value = thumbY.value
    })
    .onUpdate((e) => {
      const nextY = Math.max(0, Math.min(SLIDER_HEIGHT, panStartY.value + e.translationY))
      thumbY.value = nextY
      const newMag = sliderYToMag(nextY)
      runOnJS(onMagnificationChange)(newMag)
    })

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: thumbY.value - 12 }], // 12 = 썸 반지름
  }))

  return (
    <View style={sliderStyles.wrapper}>
      {/* 프리셋 버튼 — 슬라이더 상단 */}
      <View style={sliderStyles.presetTop}>
        {[...PRESET_MAGNIFICATIONS].reverse().map((preset) => (
          <TouchableOpacity
            key={preset}
            style={[
              sliderStyles.presetBtn,
              Math.abs(magnification - preset) < 0.15 && sliderStyles.presetBtnActive,
            ]}
            onPress={() => onMagnificationChange(preset)}
            hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
          >
            <Text
              style={[
                sliderStyles.presetText,
                Math.abs(magnification - preset) < 0.15 && sliderStyles.presetTextActive,
              ]}
            >
              {preset}x
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 슬라이더 트랙 + 썸 */}
      <GestureDetector gesture={panGesture}>
        <View style={sliderStyles.trackContainer}>
          {/* 트랙 배경 */}
          <View style={sliderStyles.track} />
          {/* 활성 트랙 (하단=1x 기준으로 채워짐) */}
          <Animated.View
            style={[
              sliderStyles.trackActive,
              useAnimatedStyle(() => ({
                height: SLIDER_HEIGHT - thumbY.value,
                top: thumbY.value,
              })),
            ]}
          />
          {/* 썸 */}
          <Animated.View style={[sliderStyles.thumb, thumbStyle]} />
        </View>
      </GestureDetector>
    </View>
  )
}

const sliderStyles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -(SLIDER_HEIGHT / 2 + 90), // 프리셋 버튼 높이 보정
    alignItems: 'center',
    gap: 8,
  },
  presetTop: {
    gap: 4,
    alignItems: 'center',
  },
  presetBtn: {
    width: 44,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  presetBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  presetText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
  },
  presetTextActive: {
    color: '#FFFFFF',
  },
  trackContainer: {
    width: 44,
    height: SLIDER_HEIGHT,
    alignItems: 'center',
    // 터치 영역을 넓혀 44pt 기준 충족
    paddingHorizontal: 14,
  },
  track: {
    position: 'absolute',
    width: 4,
    height: SLIDER_HEIGHT,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  trackActive: {
    position: 'absolute',
    width: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  thumb: {
    position: 'absolute',
    left: '50%',
    marginLeft: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
  },
})

// ---------------------------------------------------------------------------
// 줌 표시 배지
// ---------------------------------------------------------------------------

function ZoomBadge({ magnification }: { magnification: number }) {
  const label = magnification.toFixed(1).replace(/\.0$/, '') + 'x'
  return (
    <View style={zoomBadgeStyles.badge}>
      <Text style={zoomBadgeStyles.text}>{label}</Text>
    </View>
  )
}

const zoomBadgeStyles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: 16,
    right: 72, // 슬라이더와 겹치지 않도록
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
})

// ---------------------------------------------------------------------------
// 메인 화면
// ---------------------------------------------------------------------------

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions()
  const [cameraState, setCameraState] = useState<CameraState>('ready')
  const [capturedPhoto, setCapturedPhoto] = useState<CapturedPhoto | null>(null)
  const [aiResult, setAiResult] = useState<AiIdentifyResult | null>(null)
  const [queuedReview, setQueuedReview] = useState<PendingReviewItem | null>(null)
  const [showGpsConsent, setShowGpsConsent] = useState(false)
  const [celebrationData, setCelebrationData] = useState<CelebrationData | null>(null)
  const [sharePrompt, setSharePrompt] = useState<{
    sighting_id: string
    species_name: string
  } | null>(null)
  const pendingCelebrationRef = useRef<CelebrationData | null>(null)

  // 줌 상태 — 배율(1~10) 기준으로 관리
  const [magnification, setMagnification] = useState(1)
  // 핀치 시작 시점의 배율 스냅샷 (UI 스레드 공유값)
  const pinchStartMag = useSharedValue(1)
  const currentMagShared = useSharedValue(1)

  const cameraRef = useRef<CameraView>(null)
  const router = useRouter()
  const { user, updateGpsConsent } = useAuthStore()

  useEffect(() => {
    if (!permission?.granted) requestPermission()
  }, [])

  // 카메라 화면 벗어날 때 줌 초기화
  useEffect(() => {
    return () => {
      setMagnification(1)
    }
  }, [])

  useEffect(() => {
    currentMagShared.value = magnification
  }, [magnification, currentMagShared])

  const loadPendingReview = useCallback(async () => {
    if (cameraState !== 'ready' || capturedPhoto || aiResult) return

    try {
      const pending = await getNextPendingReview()
      if (!pending) return

      setQueuedReview(pending)
      setCapturedPhoto({
        uri: pending.payload.local_photo_uri,
        s3Key: pending.payload.photo_s3_key,
      })
      setAiResult(pending.payload.ai_result)
      setCameraState('result')
    } catch {
      // 대기 검토 불러오기 실패는 조용히 처리
    }
  }, [cameraState, capturedPhoto, aiResult])

  useFocusEffect(
    useCallback(() => {
      loadPendingReview()
    }, [loadPendingReview]),
  )

  // ---------------------------------------------------------------------------
  // 줌 핸들러
  // ---------------------------------------------------------------------------

  const handleMagnificationChange = useCallback((mag: number) => {
    const clamped = Math.max(MIN_MAGNIFICATION, Math.min(MAX_MAGNIFICATION, mag))
    setMagnification(parseFloat(clamped.toFixed(1)))
  }, [])

  // ---------------------------------------------------------------------------
  // 핀치 제스처
  // ---------------------------------------------------------------------------

  const pinchGesture = Gesture.Pinch()
    .onBegin(() => {
      'worklet'
      pinchStartMag.value = currentMagShared.value
    })
    .onUpdate((e) => {
      const nextMag = Math.max(
        MIN_MAGNIFICATION,
        Math.min(MAX_MAGNIFICATION, pinchStartMag.value * e.scale),
      )
      runOnJS(handleMagnificationChange)(nextMag)
    })

  // ---------------------------------------------------------------------------
  // 갤러리 공유 핸들러 (hooks — early return 전에 선언)
  // ---------------------------------------------------------------------------

  const handleGalleryShare = useCallback(async (shareLocation: boolean) => {
    if (!sharePrompt) return
    try {
      await galleryApi.share({
        sighting_id: sharePrompt.sighting_id,
        share_location: shareLocation,
      })
    } catch {
      // 공유 실패는 조용히 처리 — 목격 저장은 이미 완료됨
    } finally {
      const pending = pendingCelebrationRef.current
      pendingCelebrationRef.current = null
      setSharePrompt(null)
      if (pending) {
        setCelebrationData(pending)
      } else {
        router.push('/(tabs)/collection')
      }
    }
  }, [sharePrompt, router])

  const handleShareSkip = useCallback(() => {
    const pending = pendingCelebrationRef.current
    pendingCelebrationRef.current = null
    setSharePrompt(null)
    if (pending) {
      setCelebrationData(pending)
    } else {
      router.push('/(tabs)/collection')
    }
  }, [router])

  // ---------------------------------------------------------------------------
  // 권한 없음
  // ---------------------------------------------------------------------------

  if (!permission?.granted) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>카메라 접근 권한이 필요합니다</Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>권한 허용</Text>
          </TouchableOpacity>
        </View>
      </GestureHandlerRootView>
    )
  }

  // ---------------------------------------------------------------------------
  // 촬영
  // ---------------------------------------------------------------------------

  const captureAndIdentify = async () => {
    if (cameraState !== 'ready' || !cameraRef.current) return

    setCameraState('capturing')
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 })
      if (!photo) return

      setCameraState('sanitizing')
      const sanitizedPhoto = await sanitizeImageForUpload(photo.uri)

      setCameraState('uploading')
      const { s3Key } = await uploadPhotoAsset(sanitizedPhoto)
      const captured: CapturedPhoto = { uri: sanitizedPhoto.uri, s3Key }
      setCapturedPhoto(captured)

      // AI 식별
      setCameraState('identifying')
      const identifyData = await identifyPhotoByS3Key(s3Key)
      setAiResult(identifyData)
      setCameraState('result')
    } catch (err) {
      Alert.alert('촬영 오류', err instanceof Error ? err.message : '다시 시도해주세요')
      setCameraState('ready')
    }
  }

  const resolveCurrentLocation = async (): Promise<CapturedLocation> => {
    if (!user?.gps_consent) {
      return { lat: null, lng: null }
    }

    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
      return {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        locationAccuracyM:
          loc.coords.accuracy != null && Number.isFinite(loc.coords.accuracy)
            ? Math.round(loc.coords.accuracy)
            : undefined,
      }
    } catch {
      return { lat: null, lng: null }
    }
  }

  const queueOfflineCapture = async () => {
    if (!cameraRef.current || cameraState !== 'ready') return

    setCameraState('capturing')

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 })
      if (!photo) {
        setCameraState('ready')
        return
      }

      setCameraState('sanitizing')
      const sanitizedPhoto = await persistSanitizedImageForQueue(photo.uri)
      const location = await resolveCurrentLocation()

      await enqueuePendingPhoto({
        kind: 'identify_and_review',
        local_photo_uri: sanitizedPhoto.uri,
        lat: location.lat,
        lng: location.lng,
        location_accuracy_m: location.locationAccuracyM,
        observed_at: new Date().toISOString(),
      })

      Alert.alert('오프라인', '사진을 보관했습니다. 연결 복구 후 확인하면 분석과 저장을 진행합니다.')
      setCameraState('ready')
      setMagnification(1)
    } catch (err) {
      Alert.alert('오프라인 보관 실패', err instanceof Error ? err.message : '다시 시도해주세요')
      setCameraState('ready')
    }
  }

  const startCaptureFlow = async () => {
    const network = await Network.getNetworkStateAsync()
    if (!network.isConnected || !network.isInternetReachable) {
      await queueOfflineCapture()
      return
    }

    await captureAndIdentify()
  }

  const handleCapture = async () => {
    if (cameraState !== 'ready' || !cameraRef.current) return

    if (!user?.gps_consent) {
      setShowGpsConsent(true)
      return
    }

    await startCaptureFlow()
  }

  // ---------------------------------------------------------------------------
  // 목격 저장 (AI 결과 확인 후)
  // ---------------------------------------------------------------------------

  const handleSaveSighting = async (
    speciesId: string,
    speciesName: string,
    rarityTier: string,
    aiTrainingConsent: boolean,
  ) => {
    if (!capturedPhoto || !aiResult) return

    const observed_at = new Date().toISOString()
    const location = await resolveCurrentLocation()

    const sightingPayload: CreateSightingRequest = {
      species_id:       speciesId,
      lat: location.lat,
      lng: location.lng,
      location_accuracy_m: location.locationAccuracyM,
      photo_s3_key:     capturedPhoto.s3Key,
      exif_stripped:    true,   // 클라이언트 재인코딩 + 서버/Lambda 2차 제거
      ai_species_id:    aiResult.species_id,
      ai_confidence:    aiResult.confidence,
      ai_top3:          aiResult.top3.map((t) => ({ species_id: t.species.species_id, confidence: t.confidence })),
      ai_model_version: aiResult.model_version,
      ai_inference_ms:  aiResult.inference_ms,
      ai_training_consent: aiTrainingConsent,
      observed_at,
    }

    const network = await Network.getNetworkStateAsync()
    if (network.isConnected && network.isInternetReachable) {
      try {
        const response = await sightingsApi.create(sightingPayload)
        const responseData = response.data.data

        setCameraState('ready')

        const rarity = rarityTier ?? 'common'
        const canShare =
          capturedPhoto != null &&
          rarity !== 'rare' &&
          rarity !== 'legendary'

        const celebData: CelebrationData | null = responseData.is_first_for_user
          ? {
              species_name: speciesName,
              points: responseData.points_earned,
              rarity_tier: rarity,
            }
          : null

        setCapturedPhoto(null)
        setAiResult(null)

        if (canShare) {
          pendingCelebrationRef.current = celebData
          setSharePrompt({
            sighting_id: responseData.sighting_id,
            species_name: speciesName,
          })
        } else {
          if (celebData) {
            setCelebrationData(celebData)
          } else {
            router.push('/(tabs)/collection')
          }
        }
      } catch {
        // 온라인인데 실패 → 큐에 넣기
        await enqueuePendingSighting(sightingPayload)
        setCameraState('ready')
        setCapturedPhoto(null)
        setAiResult(null)
        setQueuedReview(null)
        router.push('/(tabs)/collection')
      }
    } else {
      await enqueuePendingSighting(sightingPayload)
      Alert.alert('오프라인', '목격 기록을 보관했습니다. 연결 복구 후 확인하면 업로드를 진행합니다.')
      setCameraState('ready')
      setCapturedPhoto(null)
      setAiResult(null)
      setQueuedReview(null)
      router.push('/(tabs)/collection')
    }
  }

  const handleQueuedReviewSave = async (speciesId: string, aiTrainingConsent: boolean) => {
    if (!queuedReview || !capturedPhoto || !aiResult) return

    try {
      await completePendingReview(
        queuedReview.queue_id,
        queuedReview.payload,
        speciesId,
        aiTrainingConsent,
      )

      setQueuedReview(null)
      setCapturedPhoto(null)
      setAiResult(null)
      setCameraState('ready')
      setMagnification(1)

      const nextReview = await getNextPendingReview()
      if (nextReview) {
        setQueuedReview(nextReview)
        setCapturedPhoto({
          uri: nextReview.payload.local_photo_uri,
          s3Key: nextReview.payload.photo_s3_key,
        })
        setAiResult(nextReview.payload.ai_result)
        setCameraState('result')
      } else {
        router.push('/(tabs)/collection')
      }
    } catch (err) {
      Alert.alert('저장 실패', err instanceof Error ? err.message : '다시 시도해주세요')
    }
  }

  // ---------------------------------------------------------------------------
  // 렌더
  // ---------------------------------------------------------------------------

  const zoomProp = magnificationToZoomProp(magnification)

  return (
    <GestureHandlerRootView style={styles.container}>
      {cameraState !== 'result' ? (
        <>
          {/* 핀치 제스처는 카메라 뷰 전체 영역에 적용 */}
          <GestureDetector gesture={pinchGesture}>
            <CameraView
              style={styles.camera}
              facing="back"
              ref={cameraRef}
              zoom={zoomProp}
            >
              {/* 조준선 */}
              <View style={styles.crosshair} />

              {/* 줌 배율 표시 — 1x일 때는 숨김 */}
              {magnification > 1.05 && (
                <ZoomBadge magnification={magnification} />
              )}

              {/* 상태 오버레이 */}
              {cameraState !== 'ready' && (
                <View style={styles.statusOverlay}>
                  <ActivityIndicator size="large" color="#FFFFFF" />
                  <Text style={styles.statusText}>
                    {cameraState === 'capturing'   ? '촬영 중...' :
                     cameraState === 'sanitizing'  ? '사진 정리 중...' :
                     cameraState === 'uploading'   ? '업로드 중...' :
                     cameraState === 'identifying' ? 'AI 분석 중...' : ''}
                  </Text>
                </View>
              )}
            </CameraView>
          </GestureDetector>

          {/* 오른쪽 줌 슬라이더 — ready 상태에서만 표시 */}
          {cameraState === 'ready' && (
            <ZoomSlider
              magnification={magnification}
              onMagnificationChange={handleMagnificationChange}
            />
          )}

          {/* 촬영 버튼 */}
          <View style={styles.controls}>
            <TouchableOpacity
              style={[styles.captureBtn, cameraState !== 'ready' && styles.captureBtnDisabled]}
              onPress={handleCapture}
              disabled={cameraState !== 'ready'}
            >
              <View style={styles.captureBtnInner} />
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <AIResultReviewSheet
          photoUri={capturedPhoto!.uri}
          result={aiResult!}
          defaultTrainingConsent={user?.ai_training_opt_in ?? false}
          mode={queuedReview ? 'queued' : 'live'}
          onConfirm={({ speciesId, speciesName, rarityTier, aiTrainingConsent }) => {
            if (queuedReview) {
              void handleQueuedReviewSave(speciesId, aiTrainingConsent)
            } else {
              void handleSaveSighting(speciesId, speciesName, rarityTier, aiTrainingConsent)
            }
          }}
          onSecondaryAction={() => {
            setCameraState('ready')
            if (queuedReview) {
              setQueuedReview(null)
            }
            setCapturedPhoto(null)
            setAiResult(null)
            setMagnification(1)
          }}
        />
      )}

      {/* GPS 동의 모달 */}
      <GpsConsentModal
        visible={showGpsConsent}
        onAgree={async () => {
          await updateGpsConsent(true)
          setShowGpsConsent(false)
          await startCaptureFlow()
        }}
        onSkip={async () => {
          setShowGpsConsent(false)
          await startCaptureFlow()
        }}
      />

      {/* 갤러리 공유 모달 */}
      <GalleryShareModal
        prompt={sharePrompt}
        onShare={handleGalleryShare}
        onSkip={handleShareSkip}
      />

      {/* 첫 목격 축하 모달 */}
      <FirstSightingCelebration
        data={celebrationData}
        onClose={() => {
          setCelebrationData(null)
          router.push('/(tabs)/collection')
        }}
      />
    </GestureHandlerRootView>
  )
}

// ---------------------------------------------------------------------------
// GPS 동의 모달
// ---------------------------------------------------------------------------
// GalleryShareModal
// ---------------------------------------------------------------------------

function GalleryShareModal({
  prompt,
  onShare,
  onSkip,
}: {
  prompt: { sighting_id: string; species_name: string } | null
  onShare: (shareLocation: boolean) => Promise<void>
  onSkip: () => void
}) {
  const [shareLocation, setShareLocation] = useState(false)
  const [isSharing, setIsSharing] = useState(false)

  if (!prompt) return null

  const handleShare = async () => {
    setIsSharing(true)
    await onShare(shareLocation)
    setIsSharing(false)
  }

  return (
    <Modal visible transparent animationType="slide">
      <View style={styles.shareOverlay}>
        <View style={styles.shareContent}>
          <Text style={styles.shareTitle}>갤러리에 공유할까요?</Text>
          <Text style={styles.shareSubtitle}>{prompt.species_name}</Text>

          <TouchableOpacity
            style={styles.shareLocRow}
            onPress={() => setShareLocation((prev) => !prev)}
            activeOpacity={0.7}
          >
            <View style={[styles.shareLocCheck, shareLocation && styles.shareLocCheckOn]}>
              {shareLocation && <Text style={styles.shareLocCheckMark}>✓</Text>}
            </View>
            <Text style={styles.shareLocLabel}>관찰 지역 공개 (도 단위)</Text>
          </TouchableOpacity>

          <View style={styles.shareButtons}>
            <TouchableOpacity style={styles.shareSkipBtn} onPress={onSkip}>
              <Text style={styles.shareSkipBtnText}>건너뛰기</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.shareConfirmBtn, isSharing && { opacity: 0.6 }]}
              onPress={handleShare}
              disabled={isSharing}
            >
              {isSharing
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.shareConfirmBtnText}>공유하기</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ---------------------------------------------------------------------------

function GpsConsentModal({
  visible, onAgree, onSkip,
}: {
  visible: boolean
  onAgree: () => void
  onSkip: () => void
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>📍 위치 정보 동의</Text>
          <Text style={styles.modalBody}>
            목격 위치를 기록하면 나만의 조류 지도를 만들 수 있어요.{'\n'}
            민감종(천연기념물 등)의 좌표는 자동 보호됩니다.
          </Text>
          <TouchableOpacity style={styles.modalAgreeBtn} onPress={onAgree}>
            <Text style={styles.modalAgreeBtnText}>동의하고 계속</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.modalSkipBtn} onPress={onSkip}>
            <Text style={styles.modalSkipBtnText}>위치 없이 촬영</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// 첫 목격 축하 모달
// ---------------------------------------------------------------------------

function FirstSightingCelebration({
  data,
  onClose,
}: {
  data: CelebrationData | null
  onClose: () => void
}) {
  if (!data) return null
  return (
    <Modal visible={true} transparent animationType="fade">
      <View style={styles.celebrationOverlay}>
        <View style={styles.celebrationCard}>
          <Text style={styles.celebrationEmoji}>🎉</Text>
          <Text style={styles.celebrationTitle}>첫 발견!</Text>
          <Text style={styles.celebrationSpecies}>{data.species_name}</Text>
          <View style={styles.celebrationRow}>
            <View style={styles.celebrationBadge}>
              <Text style={styles.celebrationBadgeText}>+{data.points}pt</Text>
            </View>
            <View style={styles.celebrationBadge}>
              <Text style={styles.celebrationBadgeText}>{data.rarity_tier}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.celebrationBtn} onPress={onClose}>
            <Text style={styles.celebrationBtnText}>훌륭해요!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// 스타일
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  permissionContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#FFFFFF', gap: 16,
  },
  permissionText: { fontSize: 16, color: '#1C1C1E' },
  permissionBtn: {
    backgroundColor: '#1B4332', paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 10,
  },
  permissionBtnText: { color: '#FFFFFF', fontWeight: '600' },
  camera: { flex: 1 },
  crosshair: {
    position: 'absolute', top: '50%', left: '50%',
    marginTop: -40, marginLeft: -40,
    width: 80, height: 80,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)',
    borderRadius: 8,
  },
  statusOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', gap: 16,
  },
  statusText: { color: '#FFFFFF', fontSize: 16 },
  controls: {
    height: 140, backgroundColor: '#000000',
    justifyContent: 'center', alignItems: 'center',
  },
  captureBtn: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 4, borderColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center',
  },
  captureBtnDisabled: { opacity: 0.4 },
  captureBtnInner: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFFFFF',
  },
  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 32, gap: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1C1C1E' },
  modalBody: { fontSize: 15, color: '#6C6C70', lineHeight: 22 },
  modalAgreeBtn: {
    backgroundColor: '#1B4332', height: 52, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  modalAgreeBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  modalSkipBtn: {
    height: 44, justifyContent: 'center', alignItems: 'center',
  },
  modalSkipBtnText: { color: '#6C6C70', fontSize: 15 },
  // 첫 목격 축하 모달
  celebrationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  celebrationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  celebrationEmoji: { fontSize: 48 },
  celebrationTitle: { fontSize: 26, fontWeight: '800', color: '#1C1C1E' },
  celebrationSpecies: { fontSize: 20, fontWeight: '600', color: '#1B4332' },
  celebrationRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  celebrationBadge: {
    backgroundColor: '#D8F3DC',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  celebrationBadgeText: { fontSize: 14, fontWeight: '600', color: '#1B4332' },
  celebrationBtn: {
    marginTop: 8,
    backgroundColor: '#1B4332',
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  celebrationBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  // 갤러리 공유 모달
  shareOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  shareContent: {
    backgroundColor: Colors.bg.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  shareTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  shareSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 20,
  },
  shareLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  shareLocCheck: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareLocCheckOn: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  shareLocCheckMark: {
    fontSize: 13,
    color: Colors.text.inverse,
    fontWeight: '700',
  },
  shareLocLabel: {
    fontSize: 14,
    color: Colors.text.primary,
  },
  shareButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  shareSkipBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.bg.secondary,
    alignItems: 'center',
  },
  shareSkipBtnText: {
    fontSize: 15,
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  shareConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  shareConfirmBtnText: {
    fontSize: 15,
    color: Colors.text.inverse,
    fontWeight: '700',
  },
})
