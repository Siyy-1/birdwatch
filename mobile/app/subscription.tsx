import React from 'react'
import { useRouter } from 'expo-router'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  SafeAreaView,
} from 'react-native'

const BENEFITS = [
  '🔍 무제한 AI 조류 식별',
  '📚 전체 300종 도감 열람',
  '🗺️ 목격 위치 상세 지도',
  '🏆 희귀종 목격 2배 포인트',
  '📊 개인 탐조 통계 분석',
  '☁️ 클라우드 사진 백업',
]

export default function SubscriptionScreen() {
  const router = useRouter()

  const showComingSoonAlert = () => {
    Alert.alert('준비 중', '결제 시스템 준비 중입니다. 곧 오픈됩니다! 🎉')
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>

          <Text style={styles.title}>✨ Explorer Pass</Text>
          <Text style={styles.subtitle}>조류 탐조의 모든 것</Text>
        </View>

        <View style={styles.priceCard}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>월 6,900원</Text>
            <Text style={styles.priceUnit}>/ month</Text>
          </View>
          <Text style={styles.annualPrice}>연간 결제 시 55,000원 (34% 할인)</Text>
        </View>

        <View style={styles.benefitsCard}>
          {BENEFITS.map((benefit) => (
            <View key={benefit} style={styles.benefitRow}>
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>

        <View style={styles.ctaSection}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={showComingSoonAlert}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>월간 구독 시작하기</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={showComingSoonAlert}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryButtonText}>연간 구독으로 34% 절약</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={styles.laterButtonText}>나중에</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>구독은 언제든지 취소 가능합니다</Text>
          <Text style={styles.footerText}>구독 관련 문의: support@birdwatch.kr</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  contentContainer: {
    paddingBottom: 32,
  },
  header: {
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 12,
    alignItems: 'center',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 24,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#1B4332',
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginTop: 16,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  priceCard: {
    backgroundColor: '#1B4332',
    borderRadius: 20,
    margin: 16,
    padding: 24,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  price: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '700',
  },
  priceUnit: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    marginBottom: 6,
  },
  annualPrice: {
    marginTop: 12,
    fontSize: 15,
    color: '#D8F3DC',
  },
  benefitsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    margin: 16,
    marginTop: 0,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  benefitRow: {
    paddingVertical: 12,
  },
  benefitText: {
    fontSize: 16,
    color: '#1F2937',
  },
  ctaSection: {
    marginHorizontal: 16,
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: '#1B4332',
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1B4332',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  secondaryButtonText: {
    color: '#1B4332',
    fontSize: 16,
    fontWeight: '700',
  },
  laterButtonText: {
    marginTop: 18,
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
  },
  footer: {
    marginTop: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
})
