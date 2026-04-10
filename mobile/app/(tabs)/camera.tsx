/**
 * camera.tsx — 카메라 + AI 조류 식별 화면
 *
 * 플로우:
 * 1. 카메라 권한 요청
 * 2. GPS 동의 확인 (없으면 ConsentModal)
 * 3. 촬영 → S3 업로드 → AI 식별 API 호출
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
  Dimensions,
} from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as FileSystem from 'expo-file-system'
import * as Location from 'expo-location'
import * as Network from 'expo-network'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
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
import { enqueue } from '../../src/services/storage/offlineQueue'
import type { QueuedSighting } from '../../src/services/storage/offlineQueue'
import { sightingsApi, apiClient, galleryApi } from '../../src/services/api'
import type { AiIdentifyResult } from '../../src/types/api'

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

type CameraState = 'ready' | 'capturing' | 'uploading' | 'identifying' | 'result'

interface CapturedPhoto {
  uri: string
  s3Key: string
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

  const handleCapture = async () => {
    if (cameraState !== 'ready' || !cameraRef.current) return

    // GPS 동의 확인
    if (!user?.gps_consent) {
      setShowGpsConsent(true)
      return
    }

    setCameraState('capturing')
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 })
      if (!photo) return

      setCameraState('uploading')

      // S3 Presigned URL 요청 → 업로드
      const { data: presignData } = await apiClient.post<{ data: { upload_url: string; s3_key: string } }>(
        '/api/v1/upload/presign',
        { content_type: 'image/jpeg' },
      )
      const { upload_url, s3_key } = presignData.data

      const isLocalUploadUrl = upload_url.includes('localhost') || upload_url.includes('127.0.0.1')

      if (isLocalUploadUrl) {
        const base64 = await FileSystem.readAsStringAsync(photo.uri, {
          encoding: FileSystem.EncodingType.Base64,
        })
        await apiClient.post(upload_url, { s3_key, data: base64 })
      } else {
        const uploadResult = await FileSystem.uploadAsync(upload_url, photo.uri, {
          httpMethod: 'PUT',
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          headers: {
            'Content-Type': 'image/jpeg',
          },
        })

        if (uploadResult.status < 200 || uploadResult.status >= 300) {
          throw new Error(`S3 upload failed with status ${uploadResult.status}`)
        }
      }

      const captured: CapturedPhoto = { uri: photo.uri, s3Key: s3_key }
      setCapturedPhoto(captured)

      // AI 식별
      setCameraState('identifying')
      const { data: identifyData } = await apiClient.post<{ data: AiIdentifyResult }>(
        '/api/v1/ai/identify',
        { s3_key },
      )
      setAiResult(identifyData.data)
      setCameraState('result')
    } catch (err) {
      Alert.alert('촬영 오류', err instanceof Error ? err.message : '다시 시도해주세요')
      setCameraState('ready')
    }
  }

  // ---------------------------------------------------------------------------
  // 목격 저장 (AI 결과 확인 후)
  // ---------------------------------------------------------------------------

  const handleSaveSighting = async (speciesId: string) => {
    if (!capturedPhoto || !aiResult) return

    const observed_at = new Date().toISOString()
    let lat: number | null = null
    let lng: number | null = null

    // 위치 취득 (GPS 동의한 경우만)
    if (user?.gps_consent) {
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
        lat = loc.coords.latitude
        lng = loc.coords.longitude
      } catch {
        // GPS 실패 시 null 유지
      }
    }

    const sightingPayload: QueuedSighting = {
      species_id:       speciesId,
      lat,
      lng,
      photo_s3_key:     capturedPhoto.s3Key,
      exif_stripped:    true,   // S3 업로드 전 Lambda@Edge에서 처리
      ai_species_id:    aiResult.species_id,
      ai_confidence:    aiResult.confidence,
      ai_top3:          aiResult.top3.map((t) => ({ species_id: t.species.species_id, confidence: t.confidence })),
      ai_model_version: aiResult.model_version,
      ai_inference_ms:  aiResult.inference_ms,
      observed_at,
    }

    const network = await Network.getNetworkStateAsync()
    if (network.isConnected && network.isInternetReachable) {
      try {
        const response = await sightingsApi.create(sightingPayload)
        const responseData = response.data.data

        setCameraState('ready')

        const rarity = aiResult.species.rarity_tier ?? 'common'
        const canShare =
          capturedPhoto != null &&
          rarity !== 'rare' &&
          rarity !== 'legendary'

        const celebData: CelebrationData | null = responseData.is_first_for_user
          ? {
              species_name: aiResult.species.name_ko,
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
            species_name: aiResult.species.name_ko,
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
        await enqueue(sightingPayload)
        setCameraState('ready')
        setCapturedPhoto(null)
        setAiResult(null)
        router.push('/(tabs)/collection')
      }
    } else {
      await enqueue(sightingPayload)
      Alert.alert('오프라인', '네트워크 연결 시 자동으로 업로드됩니다.')
      setCameraState('ready')
      setCapturedPhoto(null)
      setAiResult(null)
      router.push('/(tabs)/collection')
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
        // AI 결과 화면
        <AIResultView
          photo={capturedPhoto!}
          result={aiResult!}
          onConfirm={handleSaveSighting}
          onRetake={() => {
            setCameraState('ready')
            setCapturedPhoto(null)
            setAiResult(null)
            // 세션 종료 후 줌 초기화
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
          handleCapture()
        }}
        onSkip={() => setShowGpsConsent(false)}
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
// AI 결과 뷰
// ---------------------------------------------------------------------------

function AIResultView({
  photo,
  result,
  onConfirm,
  onRetake,
}: {
  photo: CapturedPhoto
  result: AiIdentifyResult
  onConfirm: (speciesId: string) => void
  onRetake: () => void
}) {
  const confidence = Math.round(result.confidence * 100)
  const isHighConfidence = result.confidence >= 0.85

  return (
    <View style={styles.resultContainer}>
      <Image source={{ uri: photo.uri }} style={styles.resultPhoto} contentFit="cover" />

      <View style={styles.resultSheet}>
        <Text style={styles.resultTitle}>AI 식별 결과</Text>

        {/* 1위 결과 */}
        <View style={[styles.resultCard, isHighConfidence && styles.resultCardHigh]}>
          <View style={styles.resultCardHeader}>
            <View>
              <Text style={styles.resultSpeciesKo}>{result.species.name_ko}</Text>
              <Text style={styles.resultSpeciesSci}>{result.species.name_sci}</Text>
            </View>
            <View style={[styles.confidenceBadge, isHighConfidence && styles.confidenceBadgeHigh]}>
              <Text style={styles.confidenceText}>{confidence}%</Text>
            </View>
          </View>
          {result.species.fun_fact_ko && (
            <Text style={styles.funFact}>{result.species.fun_fact_ko}</Text>
          )}
        </View>

        {/* Top 3 */}
        {result.top3.length > 1 && (
          <View style={styles.top3}>
            <Text style={styles.top3Title}>다른 가능성</Text>
            {result.top3.slice(1).map((item) => (
              <TouchableOpacity
                key={item.species.species_id}
                style={styles.top3Item}
                onPress={() => onConfirm(item.species.species_id)}
              >
                <Text style={styles.top3Name}>{item.species.name_ko}</Text>
                <Text style={styles.top3Confidence}>{Math.round(item.confidence * 100)}%</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 버튼 */}
        <View style={styles.resultButtons}>
          <TouchableOpacity style={styles.retakeBtn} onPress={onRetake}>
            <Text style={styles.retakeBtnText}>다시 찍기</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={() => onConfirm(result.species_id)}
          >
            <Text style={styles.confirmBtnText}>
              {isHighConfidence ? '✓ 목격 기록' : '이대로 기록'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
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
  // Result
  resultContainer: { flex: 1 },
  resultPhoto: { flex: 1 },
  resultSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, gap: 16,
  },
  resultTitle: { fontSize: 13, color: '#AEAEB2', fontWeight: '600', textTransform: 'uppercase' },
  resultCard: {
    backgroundColor: '#F8F9FA', borderRadius: 14, padding: 16, gap: 8,
    borderWidth: 2, borderColor: 'transparent',
  },
  resultCardHigh: { borderColor: '#52B788' },
  resultCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  resultSpeciesKo: { fontSize: 22, fontWeight: '700', color: '#1C1C1E' },
  resultSpeciesSci: { fontSize: 14, color: '#6C6C70', fontStyle: 'italic' },
  confidenceBadge: {
    backgroundColor: '#F2F2F7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  confidenceBadgeHigh: { backgroundColor: '#D8F3DC' },
  confidenceText: { fontSize: 15, fontWeight: '700', color: '#1C1C1E' },
  funFact: { fontSize: 13, color: '#6C6C70', lineHeight: 18 },
  top3: { gap: 8 },
  top3Title: { fontSize: 13, color: '#AEAEB2', fontWeight: '600' },
  top3Item: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F2F2F7',
  },
  top3Name: { fontSize: 15, color: '#1C1C1E' },
  top3Confidence: { fontSize: 15, color: '#AEAEB2' },
  resultButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  retakeBtn: {
    flex: 1, height: 48, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E0E0E0',
    justifyContent: 'center', alignItems: 'center',
  },
  retakeBtnText: { fontSize: 15, fontWeight: '600', color: '#1C1C1E' },
  confirmBtn: {
    flex: 2, height: 48, borderRadius: 12,
    backgroundColor: '#1B4332', justifyContent: 'center', alignItems: 'center',
  },
  confirmBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
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
