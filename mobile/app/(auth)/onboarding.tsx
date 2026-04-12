/**
 * onboarding.tsx — PIPA 동의 + GPS 동의 온보딩 플로우
 * 3단계: 이용약관 → 개인정보처리방침 → GPS 동의 (선택)
 */
import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuthStore } from '../../src/store/authStore'

type Step = 'terms' | 'privacy' | 'gps'

const STEPS: Step[] = ['terms', 'privacy', 'gps']

export default function OnboardingScreen() {
  const [currentStep, setCurrentStep] = useState<Step>('terms')
  const [agreed, setAgreed] = useState({
    terms:     false,
    privacy:   false,
    marketing: false,
    gps:       false,
    aiTraining: false,
  })
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { completeOnboarding } = useAuthStore()

  const stepIndex = STEPS.indexOf(currentStep)

  const canProceed = () => {
    if (currentStep === 'terms')   return agreed.terms
    if (currentStep === 'privacy') return agreed.privacy
    return true  // GPS는 선택
  }

  const handleNext = async () => {
    if (currentStep !== STEPS[STEPS.length - 1]) {
      setCurrentStep(STEPS[stepIndex + 1])
      return
    }

    // 최종 단계: 동의 저장 후 앱으로
    setIsLoading(true)
    try {
      await completeOnboarding({
        marketingAgreed: agreed.marketing,
        gpsConsented: agreed.gps,
        aiTrainingOptIn: agreed.aiTraining,
      })
      router.replace('/(tabs)')
    } catch {
      Alert.alert('오류', '동의 저장 중 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      {/* 진행 표시 */}
      <View style={styles.progress}>
        {STEPS.map((step, i) => (
          <View
            key={step}
            style={[styles.progressDot, i <= stepIndex && styles.progressDotActive]}
          />
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {currentStep === 'terms' && (
          <TermsStep
            agreed={agreed.terms}
            onAgree={(v) => setAgreed((s) => ({ ...s, terms: v }))}
          />
        )}
        {currentStep === 'privacy' && (
          <PrivacyStep
            agreed={agreed.privacy}
            marketingAgreed={agreed.marketing}
            aiTrainingAgreed={agreed.aiTraining}
            onAgree={(v) => setAgreed((s) => ({ ...s, privacy: v }))}
            onMarketingAgree={(v) => setAgreed((s) => ({ ...s, marketing: v }))}
            onAiTrainingAgree={(v) => setAgreed((s) => ({ ...s, aiTraining: v }))}
          />
        )}
        {currentStep === 'gps' && (
          <GpsStep
            agreed={agreed.gps}
            onAgree={(v) => setAgreed((s) => ({ ...s, gps: v }))}
          />
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextBtn, !canProceed() && styles.nextBtnDisabled]}
          onPress={handleNext}
          disabled={!canProceed() || isLoading}
        >
          <Text style={styles.nextBtnText}>
            {currentStep === 'gps' ? '시작하기' : '다음'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// 하위 컴포넌트
// ---------------------------------------------------------------------------

function TermsStep({ agreed, onAgree }: { agreed: boolean; onAgree: (v: boolean) => void }) {
  return (
    <View style={styles.step}>
      <Text style={styles.stepTitle}>서비스 이용약관</Text>
      <Text style={styles.stepSubtitle}>BirdWatch 이용을 위해 약관에 동의해주세요.</Text>

      <View style={styles.docBox}>
        <Text style={styles.docText}>
          제1조 (목적){'\n'}
          본 약관은 BirdWatch 서비스의 이용 조건 및 절차, 이용자와 회사 간의 권리·의무에 관한 사항을 규정합니다.{'\n\n'}
          제2조 (서비스 내용){'\n'}
          BirdWatch는 조류 관찰 데이터 기록, AI 기반 조류 식별, 게임화 요소를 포함한 모바일 서비스입니다.{'\n\n'}
          제3조 (개인정보){'\n'}
          개인정보 수집·이용에 관한 사항은 별도의 개인정보처리방침에 따릅니다.
        </Text>
      </View>

      <TouchableOpacity style={styles.checkRow} onPress={() => onAgree(!agreed)}>
        <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
          {agreed && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.checkLabel}>이용약관에 동의합니다 (필수)</Text>
      </TouchableOpacity>
    </View>
  )
}

function PrivacyStep({
  agreed, marketingAgreed, aiTrainingAgreed, onAgree, onMarketingAgree, onAiTrainingAgree,
}: {
  agreed: boolean
  marketingAgreed: boolean
  aiTrainingAgreed: boolean
  onAgree: (v: boolean) => void
  onMarketingAgree: (v: boolean) => void
  onAiTrainingAgree: (v: boolean) => void
}) {
  return (
    <View style={styles.step}>
      <Text style={styles.stepTitle}>개인정보처리방침</Text>
      <Text style={styles.stepSubtitle}>한국 개인정보보호법(PIPA)에 따라 정보를 처리합니다.</Text>

      <View style={styles.docBox}>
        <Text style={styles.docText}>
          수집 항목: 이름, 이메일, OAuth 연동 정보{'\n'}
          수집 목적: 서비스 제공, 사용자 식별{'\n'}
          보유 기간: 회원 탈퇴 후 30일 이내 파기{'\n'}
          서버 위치: AWS 서울 리전 (ap-northeast-2){'\n\n'}
          귀하는 언제든지 개인정보 열람·수정·삭제를 요청할 수 있으며, 동의를 철회할 수 있습니다.
        </Text>
      </View>

      <TouchableOpacity style={styles.checkRow} onPress={() => onAgree(!agreed)}>
        <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
          {agreed && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.checkLabel}>개인정보처리방침에 동의합니다 (필수)</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.checkRow} onPress={() => onMarketingAgree(!marketingAgreed)}>
        <View style={[styles.checkbox, marketingAgreed && styles.checkboxChecked]}>
          {marketingAgreed && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.checkLabel}>마케팅 정보 수신에 동의합니다 (선택)</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.checkRow} onPress={() => onAiTrainingAgree(!aiTrainingAgreed)}>
        <View style={[styles.checkbox, aiTrainingAgreed && styles.checkboxChecked]}>
          {aiTrainingAgreed && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.checkLabel}>
          촬영 이미지를 AI 품질 개선과 재학습에 활용하는 데 동의합니다 (선택)
        </Text>
      </TouchableOpacity>

      <Text style={styles.optionalNote}>
        동의하지 않아도 앱 기능은 동일하게 사용할 수 있으며, 설정에서 언제든 변경할 수 있습니다.
      </Text>
    </View>
  )
}

function GpsStep({ agreed, onAgree }: { agreed: boolean; onAgree: (v: boolean) => void }) {
  return (
    <View style={styles.step}>
      <Text style={styles.stepTitle}>GPS 위치 동의</Text>
      <Text style={styles.stepSubtitle}>
        조류 목격 위치를 기록하면 나만의 조류 지도를 만들 수 있어요.
      </Text>

      <View style={styles.gpsInfoBox}>
        <Text style={styles.gpsIcon}>📍</Text>
        <View style={styles.gpsInfoText}>
          <Text style={styles.gpsInfoTitle}>위치 정보 활용 방식</Text>
          <Text style={styles.gpsInfoDesc}>
            • 사진 촬영 시 위치만 기록 (상시 추적 없음){'\n'}
            • 민감종(천연기념물 등)은 좌표를 자동 난독화{'\n'}
            • 배터리 소모: 시간당 5% 이하{'\n'}
            • 언제든 설정에서 철회 가능
          </Text>
        </View>
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>GPS 위치 수집 동의 (선택)</Text>
        <Switch
          value={agreed}
          onValueChange={onAgree}
          trackColor={{ true: '#1B4332', false: '#E0E0E0' }}
          thumbColor="#FFFFFF"
        />
      </View>

      <Text style={styles.gpsNote}>
        동의하지 않아도 BirdWatch를 이용할 수 있지만,{'\n'}
        목격 지도 기능은 사용할 수 없습니다.
      </Text>
    </View>
  )
}

// ---------------------------------------------------------------------------
// 스타일
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  progress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 60,
    paddingBottom: 16,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
  },
  progressDotActive: {
    backgroundColor: '#1B4332',
    width: 24,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  step: {
    paddingTop: 16,
    gap: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  stepSubtitle: {
    fontSize: 15,
    color: '#6C6C70',
    lineHeight: 22,
  },
  docBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    maxHeight: 240,
  },
  docText: {
    fontSize: 13,
    color: '#3C3C43',
    lineHeight: 20,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#1B4332',
    borderColor: '#1B4332',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  checkLabel: {
    fontSize: 15,
    color: '#1C1C1E',
    flex: 1,
  },
  optionalNote: {
    fontSize: 13,
    color: '#6C6C70',
    lineHeight: 18,
  },
  gpsInfoBox: {
    flexDirection: 'row',
    backgroundColor: '#D8F3DC',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  gpsIcon: {
    fontSize: 32,
  },
  gpsInfoText: {
    flex: 1,
  },
  gpsInfoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1B4332',
    marginBottom: 8,
  },
  gpsInfoDesc: {
    fontSize: 13,
    color: '#2D6A4F',
    lineHeight: 20,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  switchLabel: {
    fontSize: 15,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  gpsNote: {
    fontSize: 13,
    color: '#AEAEB2',
    textAlign: 'center',
    lineHeight: 18,
  },
  footer: {
    padding: 24,
    paddingBottom: 40,
  },
  nextBtn: {
    backgroundColor: '#1B4332',
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextBtnDisabled: {
    backgroundColor: '#C7C7CC',
  },
  nextBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
})
