/**
 * login.tsx — 로그인 화면
 * Kakao / Apple / Google OAuth 진입점
 */
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  TextInput,
} from 'react-native'
import * as AppleAuthentication from 'expo-apple-authentication'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'

import { useAuthStore } from '../../src/store/authStore'

export default function LoginScreen() {
  const { signInWithKakao, signInWithApple, signInWithGoogle, signInWithDevLogin, isLoading, error, clearError, needsOnboarding, status } =
    useAuthStore()
  const router = useRouter()
  const [devEmail, setDevEmail] = useState('dev@test.com')

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace(needsOnboarding ? '/auth/onboarding' : '/(tabs)')
    }
  }, [status, needsOnboarding])

  useEffect(() => {
    if (error) {
      Alert.alert('로그인 실패', error, [{ text: '확인', onPress: clearError }])
    }
  }, [error])

  return (
    <View style={styles.container}>
      {/* 로고 영역 */}
      <View style={styles.hero}>
        <Text style={styles.logoText}>🐦</Text>
        <Text style={styles.appName}>BirdWatch</Text>
        <Text style={styles.tagline}>한국 조류 수집 도감</Text>
      </View>

      {/* 로그인 버튼들 */}
      <View style={styles.buttons}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#1B4332" />
        ) : (
          <>
            {/* 카카오 로그인 */}
            <TouchableOpacity
              style={[styles.btn, styles.kakaoBtn]}
              onPress={signInWithKakao}
              activeOpacity={0.85}
            >
              <Text style={styles.kakaoBtnText}>카카오로 시작하기</Text>
            </TouchableOpacity>

            {/* Apple 로그인 (iOS만) */}
            {Platform.OS === 'ios' && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={12}
                style={styles.appleBtn}
                onPress={signInWithApple}
              />
            )}

            {/* Google 로그인 */}
            <TouchableOpacity
              style={[styles.btn, styles.googleBtn]}
              onPress={signInWithGoogle}
              activeOpacity={0.85}
            >
              <Text style={styles.googleBtnText}>Google로 시작하기</Text>
            </TouchableOpacity>

            {/* 개발 전용 빠른 로그인 */}
            {__DEV__ && (
              <>
                <TextInput
                  style={styles.devInput}
                  value={devEmail}
                  onChangeText={setDevEmail}
                  placeholder="dev@test.com"
                  placeholderTextColor="#8E8E93"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={[styles.btn, styles.devBtn]}
                  onPress={() => signInWithDevLogin(devEmail)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.devBtnText}>개발용 로그인</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}
      </View>

      {/* 약관 안내 */}
      <Text style={styles.terms}>
        로그인하면{' '}
        <Text style={styles.termsLink}>서비스 이용약관</Text>
        {' '}및{' '}
        <Text style={styles.termsLink}>개인정보처리방침</Text>
        에 동의하는 것으로 간주됩니다.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
    justifyContent: 'space-between',
    paddingVertical: 80,
  },
  hero: {
    alignItems: 'center',
    gap: 8,
  },
  logoText: {
    fontSize: 72,
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1B4332',
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16,
    color: '#6C6C70',
    marginTop: 4,
  },
  buttons: {
    gap: 12,
    alignItems: 'center',
  },
  btn: {
    width: '100%',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kakaoBtn: {
    backgroundColor: '#FEE500',
  },
  kakaoBtnText: {
    color: '#191919',
    fontSize: 16,
    fontWeight: '600',
  },
  appleBtn: {
    width: '100%',
    height: 52,
  },
  googleBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
  },
  googleBtnText: {
    color: '#1C1C1E',
    fontSize: 16,
    fontWeight: '600',
  },
  terms: {
    textAlign: 'center',
    fontSize: 12,
    color: '#AEAEB2',
    lineHeight: 18,
  },
  termsLink: {
    color: '#1B4332',
    textDecorationLine: 'underline',
  },
  devInput: {
    width: '100%',
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D1D1D6',
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#1C1C1E',
    backgroundColor: '#FFFFFF',
  },
  devBtn: {
    backgroundColor: '#1B4332',
  },
  devBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
})
