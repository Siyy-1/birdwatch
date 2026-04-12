/**
 * auth.ts — /api/v1/auth 라우터
 * POST /api/v1/auth/token   Cognito Authorization Code → 토큰 교환 + 유저 조회/생성
 * POST /api/v1/auth/apple   Apple Sign In → 자체 JWT 발급 + 유저 조회/생성
 */
import type { FastifyPluginAsync } from 'fastify'
import { CognitoJwtVerifier } from 'aws-jwt-verify'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { SignJWT } from 'jose'
import { env } from '../../config/env.js'

// ---------------------------------------------------------------------------
// 타입 정의
// ---------------------------------------------------------------------------

interface TokenBody {
  code: string
  code_verifier: string
  redirect_uri: string
  grant_type: 'authorization_code'
  oauth_provider: 'kakao' | 'google'
}

interface AppleBody {
  identity_token: string
  authorization_code?: string
  full_name?: string
}

interface DevLoginBody {
  email: string
  nickname?: string
}

// ---------------------------------------------------------------------------
// Cognito JWT 검증기 (모듈 로드 시 1회 생성)
// ---------------------------------------------------------------------------

const cognitoVerifier = CognitoJwtVerifier.create({
  userPoolId: env.COGNITO_USER_POOL_ID,
  clientId: env.COGNITO_CLIENT_ID,
  tokenUse: 'access',
})

// Apple JWKS
const APPLE_JWKS_URL = new URL('https://appleid.apple.com/auth/keys')
const appleJwks = createRemoteJWKSet(APPLE_JWKS_URL)

// ---------------------------------------------------------------------------
// 헬퍼
// ---------------------------------------------------------------------------

function randomNickname(): string {
  const suffix = String(Math.floor(1000 + Math.random() * 9000))
  return `Bird${suffix}`
}

// ---------------------------------------------------------------------------
// 라우터
// ---------------------------------------------------------------------------

const authRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/v1/auth/token
   * Cognito Authorization Code Flow (PKCE) 처리.
   * 1. Cognito /oauth2/token 엔드포인트로 코드 교환
   * 2. access_token 을 aws-jwt-verify 로 검증해 sub 추출
   * 3. users 테이블 조회/신규 생성
   * 4. { access_token, refresh_token, user_id } 반환
   */
  fastify.post<{ Body: TokenBody }>(
    '/token',
    {
      schema: {
        tags: ['auth'],
        body: {
          type: 'object',
          required: ['code', 'code_verifier', 'redirect_uri', 'grant_type', 'oauth_provider'],
          properties: {
            code:          { type: 'string' },
            code_verifier: { type: 'string' },
            redirect_uri:  { type: 'string' },
            grant_type:    { type: 'string', enum: ['authorization_code'] },
            oauth_provider: { type: 'string', enum: ['kakao', 'google'] },
          },
        },
      },
    },
    async (request, reply) => {
      const { code, code_verifier, redirect_uri, grant_type, oauth_provider } = request.body

      // 1. Cognito 토큰 엔드포인트 호출
      const tokenEndpoint = new URL('/oauth2/token', env.COGNITO_DOMAIN)
      const formBody = new URLSearchParams({
        grant_type,
        code,
        code_verifier,
        redirect_uri,
        client_id: env.COGNITO_CLIENT_ID,
      })

      const cognitoRes = await fetch(tokenEndpoint.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody.toString(),
      })

      if (!cognitoRes.ok) {
        const text = await cognitoRes.text()
        request.log.warn({ status: cognitoRes.status, body: text }, 'Cognito token exchange failed')
        throw fastify.httpErrors.badRequest('인증 코드 교환에 실패했습니다')
      }

      const cognitoTokens = await cognitoRes.json() as {
        access_token: string
        refresh_token: string
        id_token: string
        token_type: string
        expires_in: number
      }

      // 2. access_token 검증 → sub 추출
      let sub: string
      try {
        const payload = await cognitoVerifier.verify(cognitoTokens.access_token)
        sub = payload.sub
      } catch (err) {
        request.log.warn({ err }, 'Cognito access_token verification failed')
        throw fastify.httpErrors.unauthorized('토큰 검증에 실패했습니다')
      }

      // 3. users 테이블 조회
      const existing = await fastify.pg.query(
        `SELECT user_id FROM users WHERE cognito_sub = $1 AND deleted_at IS NULL`,
        [sub],
      )

      let userId: string

      if (existing.rowCount && existing.rowCount > 0) {
        userId = existing.rows[0].user_id as string
      } else {
        // 4. 신규 유저 생성
        const inserted = await fastify.pg.query(
          `INSERT INTO users
             (user_id, cognito_sub, oauth_sub, nickname, subscription_tier, oauth_provider)
           VALUES
             (gen_random_uuid(), $1, $1, $2, 'free', $3)
           RETURNING user_id`,
          [sub, randomNickname(), oauth_provider],
        )
        userId = inserted.rows[0].user_id as string
      }

      return reply.send({
        access_token:  cognitoTokens.access_token,
        refresh_token: cognitoTokens.refresh_token,
        user_id:       userId,
      })
    },
  )

  /**
   * POST /api/v1/auth/apple
   * Apple Sign In 처리.
   * 1. jose 로 Apple identity_token 검증 → sub 추출
   * 2. users 테이블 조회/신규 생성 (oauth_provider='apple')
   * 3. HS256 자체 JWT 발급 후 { access_token, user_id } 반환
   */
  fastify.post<{ Body: AppleBody }>(
    '/apple',
    {
      schema: {
        tags: ['auth'],
        body: {
          type: 'object',
          required: ['identity_token'],
          properties: {
            identity_token:    { type: 'string' },
            authorization_code: { type: 'string' },
            full_name:         { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { identity_token, full_name } = request.body

      // 1. Apple identity_token 검증
      let sub: string
      try {
        const { payload } = await jwtVerify(identity_token, appleJwks, {
          issuer: 'https://appleid.apple.com',
        })
        if (!payload.sub) throw new Error('sub missing')
        sub = payload.sub
      } catch (err) {
        request.log.warn({ err }, 'Apple identity_token verification failed')
        throw fastify.httpErrors.unauthorized('Apple 토큰 검증에 실패했습니다')
      }

      // 2. users 테이블 조회
      const existing = await fastify.pg.query(
        `SELECT user_id FROM users
           WHERE oauth_provider = 'apple' AND cognito_sub = $1 AND deleted_at IS NULL`,
        [sub],
      )

      let userId: string

      if (existing.rowCount && existing.rowCount > 0) {
        userId = existing.rows[0].user_id as string
      } else {
        // 신규 유저 생성
        const nickname = full_name?.trim() || randomNickname()
        const inserted = await fastify.pg.query(
          `INSERT INTO users
             (user_id, cognito_sub, oauth_sub, nickname, subscription_tier, oauth_provider)
           VALUES
             (gen_random_uuid(), $1, $1, $2, 'free', 'apple')
           RETURNING user_id`,
          [sub, nickname],
        )
        userId = inserted.rows[0].user_id as string
      }

      // 3. HS256 자체 JWT 발급
      const secret = new TextEncoder().encode(env.JWT_SECRET)
      const accessToken = await new SignJWT({ sub: userId, cognitoSub: sub })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('30d')
        .sign(secret)

      return reply.send({
        access_token: accessToken,
        user_id:      userId,
      })
    },
  )

  /**
   * POST /api/v1/auth/refresh
   * Cognito Refresh Token → 새 Access Token 발급
   * Apple Sign In 유저는 30일 만료 자체 JWT를 사용하므로 이 엔드포인트 불필요
   */
  fastify.post<{ Body: { refresh_token: string } }>(
    '/refresh',
    {
      schema: {
        tags: ['auth'],
        body: {
          type: 'object',
          required: ['refresh_token'],
          properties: {
            refresh_token: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const { refresh_token } = request.body

      const tokenEndpoint = new URL('/oauth2/token', env.COGNITO_DOMAIN)
      const formBody = new URLSearchParams({
        grant_type:    'refresh_token',
        refresh_token,
        client_id:     env.COGNITO_CLIENT_ID,
      })

      const cognitoRes = await fetch(tokenEndpoint.toString(), {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    formBody.toString(),
      })

      if (!cognitoRes.ok) {
        const text = await cognitoRes.text()
        request.log.warn({ status: cognitoRes.status, body: text }, 'Cognito refresh failed')
        return reply.code(401).send({ error: '토큰 갱신에 실패했습니다. 다시 로그인해 주세요.' })
      }

      const tokens = await cognitoRes.json() as {
        access_token: string
        id_token:     string
        token_type:   string
        expires_in:   number
      }

      return reply.send({ access_token: tokens.access_token })
    },
  )

  /**
   * POST /api/v1/auth/dev-login
   * 개발 전용 Mock 로그인. NODE_ENV=development 에서만 동작.
   */
  fastify.post<{ Body: DevLoginBody }>(
    '/dev-login',
    {
      schema: {
        tags: ['auth'],
        body: {
          type: 'object',
          required: ['email'],
          properties: {
            email:    { type: 'string', format: 'email' },
            nickname: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      if (env.NODE_ENV !== 'development') {
        return reply.code(404).send({ error: 'Not found' })
      }

      const { email, nickname } = request.body
      const cognitoSub = `dev:${email}`

      const existing = await fastify.pg.query(
        `SELECT user_id FROM users WHERE cognito_sub = $1 AND deleted_at IS NULL`,
        [cognitoSub],
      )

      let userId: string

      if (existing.rowCount && existing.rowCount > 0) {
        userId = existing.rows[0].user_id as string
      } else {
        const inserted = await fastify.pg.query(
          `INSERT INTO users
             (user_id, cognito_sub, oauth_sub, nickname, oauth_provider, subscription_tier,
              terms_agreed_at, privacy_agreed_at, gps_consent, gps_consent_at)
           VALUES
             (gen_random_uuid(), $1, $1, $2, 'kakao', 'free', NOW(), NOW(), TRUE, NOW())
           RETURNING user_id`,
          [cognitoSub, nickname?.trim() || email.split('@')[0]],
        )
        userId = inserted.rows[0].user_id as string
      }

      const secret = new TextEncoder().encode(env.JWT_SECRET)
      const accessToken = await new SignJWT({ sub: userId, cognitoSub })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('30d')
        .sign(secret)

      return reply.send({
        access_token: accessToken,
        user_id:      userId,
        message:      '개발 전용 로그인입니다',
      })
    },
  )
}

export default authRoutes
