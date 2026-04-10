/**
 * auth/index.ts — OAuth 통합 인증 (Kakao / Apple / Google)
 * PKCE 사용, Cognito User Pool에 토큰 교환
 */
import * as AuthSession from 'expo-auth-session'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as Crypto from 'expo-crypto'
import * as SecureStore from 'expo-secure-store'
import * as WebBrowser from 'expo-web-browser'
import { apiClient, STORAGE_KEYS } from '../api'

WebBrowser.maybeCompleteAuthSession()

// ---------------------------------------------------------------------------
// 환경 상수
// ---------------------------------------------------------------------------

const COGNITO_DOMAIN   = process.env.EXPO_PUBLIC_COGNITO_DOMAIN ?? ''
const COGNITO_CLIENT_ID = process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID ?? ''
const REDIRECT_URI     = AuthSession.makeRedirectUri({ scheme: 'birdwatch' })

export type AuthProvider = 'kakao' | 'apple' | 'google'

export interface AuthResult {
  userId: string
  accessToken: string
  idToken: string | null
}

// ---------------------------------------------------------------------------
// Kakao OAuth (Cognito hosted UI → Kakao identity provider)
// ---------------------------------------------------------------------------

export async function signInWithKakao(): Promise<AuthResult> {
  const state    = await generateState()
  const verifier = await generateCodeVerifier()
  const challenge = await generateCodeChallenge(verifier)

  const request = new AuthSession.AuthRequest({
    clientId:            COGNITO_CLIENT_ID,
    redirectUri:         REDIRECT_URI,
    responseType:        AuthSession.ResponseType.Code,
    scopes:              ['openid', 'profile', 'email'],
    extraParams: {
      identity_provider: 'Kakao',
      code_challenge:    challenge,
      code_challenge_method: 'S256',
    },
    state,
  })

  const discovery = AuthSession.useAutoDiscovery(
    `https://cognito-idp.ap-northeast-2.amazonaws.com/${process.env.EXPO_PUBLIC_COGNITO_USER_POOL_ID}`,
  )

  const result = await request.promptAsync(
    discovery ?? { authorizationEndpoint: `${COGNITO_DOMAIN}/oauth2/authorize` },
  )

  if (result.type !== 'success') {
    throw new Error('Kakao 로그인 취소됨')
  }

  return exchangeCodeForTokens(result.params.code, verifier)
}

// ---------------------------------------------------------------------------
// Apple Sign-In
// ---------------------------------------------------------------------------

export async function signInWithApple(): Promise<AuthResult> {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  })

  if (!credential.identityToken) {
    throw new Error('Apple ID 토큰 없음')
  }

  // 백엔드로 Apple identity token 전달 → Cognito 연동
  const response = await apiClient.post<{ access_token: string; user_id: string }>(
    '/api/v1/auth/apple',
    {
      identity_token:    credential.identityToken,
      authorization_code: credential.authorizationCode,
      full_name: credential.fullName
        ? `${credential.fullName.familyName ?? ''}${credential.fullName.givenName ?? ''}`
        : undefined,
    },
  )

  const { access_token, user_id } = response.data
  await persistTokens(user_id, access_token, null)

  return { userId: user_id, accessToken: access_token, idToken: null }
}

// ---------------------------------------------------------------------------
// Google OAuth (PKCE)
// ---------------------------------------------------------------------------

export async function signInWithGoogle(): Promise<AuthResult> {
  const verifier  = await generateCodeVerifier()
  const challenge = await generateCodeChallenge(verifier)

  const request = new AuthSession.AuthRequest({
    clientId:   COGNITO_CLIENT_ID,
    redirectUri: REDIRECT_URI,
    responseType: AuthSession.ResponseType.Code,
    scopes:     ['openid', 'profile', 'email'],
    extraParams: {
      identity_provider:    'Google',
      code_challenge:       challenge,
      code_challenge_method: 'S256',
    },
  })

  const result = await request.promptAsync({
    authorizationEndpoint: `${COGNITO_DOMAIN}/oauth2/authorize`,
  })

  if (result.type !== 'success') {
    throw new Error('Google 로그인 취소됨')
  }

  return exchangeCodeForTokens(result.params.code, verifier)
}

// ---------------------------------------------------------------------------
// 로그아웃
// ---------------------------------------------------------------------------

export async function signOut(): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN)
  await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN)
  await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_ID)
}

// ---------------------------------------------------------------------------
// 저장된 토큰으로 세션 복원
// ---------------------------------------------------------------------------

export async function restoreSession(): Promise<AuthResult | null> {
  const accessToken = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN)
  const userId      = await SecureStore.getItemAsync(STORAGE_KEYS.USER_ID)
  if (!accessToken || !userId) return null
  return { userId, accessToken, idToken: null }
}

// ---------------------------------------------------------------------------
// 내부 유틸
// ---------------------------------------------------------------------------

async function exchangeCodeForTokens(code: string, verifier: string): Promise<AuthResult> {
  const response = await apiClient.post<{
    access_token: string
    refresh_token: string
    user_id: string
  }>('/api/v1/auth/token', {
    code,
    code_verifier: verifier,
    redirect_uri:  REDIRECT_URI,
    grant_type:    'authorization_code',
  })

  const { access_token, refresh_token, user_id } = response.data
  await persistTokens(user_id, access_token, refresh_token)

  return { userId: user_id, accessToken: access_token, idToken: null }
}

async function persistTokens(
  userId: string,
  accessToken: string,
  refreshToken: string | null,
): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEYS.USER_ID, userId)
  await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, accessToken)
  if (refreshToken) {
    await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, refreshToken)
  }
}

async function generateState(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(16)
  return Buffer.from(bytes).toString('hex')
}

async function generateCodeVerifier(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(32)
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    verifier,
    { encoding: Crypto.CryptoEncoding.BASE64 },
  )
  return hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

// ---------------------------------------------------------------------------
// 개발 전용 Mock 로그인
// ---------------------------------------------------------------------------

export async function signInWithDevLogin(email: string): Promise<AuthResult> {
  const response = await apiClient.post<{ access_token: string; user_id: string }>(
    '/api/v1/auth/dev-login',
    { email, nickname: email.split('@')[0] },
  )
  const { access_token, user_id } = response.data
  await persistTokens(user_id, access_token, null)
  return { userId: user_id, accessToken: access_token, idToken: null }
}
