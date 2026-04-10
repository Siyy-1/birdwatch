/**
 * auth.ts — JWT 검증 플러그인
 *
 * 두 가지 토큰을 모두 지원:
 * 1. Cognito Access Token (Kakao/Google OAuth)
 * 2. 자체 발급 HS256 JWT (Apple Sign-In — POST /api/v1/auth/apple 응답)
 */
import type { FastifyPluginAsync, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import { CognitoJwtVerifier } from 'aws-jwt-verify'
import { jwtVerify } from 'jose'
import { env } from '../config/env.js'

declare module 'fastify' {
  interface FastifyRequest {
    user: {
      userId: string      // users.user_id (UUID)
      cognitoSub: string  // Cognito sub 또는 Apple sub
    }
  }
}

const cognitoVerifier = CognitoJwtVerifier.create({
  userPoolId: env.COGNITO_USER_POOL_ID,
  tokenUse: 'access',
  clientId: env.COGNITO_CLIENT_ID,
})

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorateRequest('user', null)

  /**
   * preHandler: Bearer 토큰을 검증하고 request.user를 채운다.
   * Cognito 검증 실패 시 자체 HS256 JWT로 폴백.
   * 라우트에서 onRequest: [fastify.authenticate] 로 사용.
   */
  fastify.decorate(
    'authenticate',
    async (request: FastifyRequest): Promise<void> => {
      const authHeader = request.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) {
        throw fastify.httpErrors.unauthorized('Bearer 토큰이 필요합니다')
      }
      const token = authHeader.slice(7)

      // ── 1차: Cognito Access Token 검증 ──────────────────────────────────
      try {
        const payload = await cognitoVerifier.verify(token)
        const cognitoSub = payload.sub

        const result = await fastify.pg.query<{ user_id: string }>(
          'SELECT user_id FROM users WHERE cognito_sub = $1 AND deleted_at IS NULL',
          [cognitoSub],
        )
        if (result.rowCount === 0) {
          throw fastify.httpErrors.unauthorized('등록되지 않은 사용자입니다')
        }

        request.user = { userId: result.rows[0].user_id, cognitoSub }
        return
      } catch (err) {
        // Cognito 검증 실패면 HS256 폴백으로 진행
        if ((err as { statusCode?: number }).statusCode === 401) throw err
      }

      // ── 2차: 자체 HS256 JWT 검증 (Apple Sign-In) ─────────────────────────
      try {
        const secret = new TextEncoder().encode(env.JWT_SECRET)
        const { payload } = await jwtVerify(token, secret)

        const userId = payload.sub
        const cognitoSub = (payload as { cognitoSub?: string }).cognitoSub ?? ''

        if (!userId) throw new Error('sub missing')

        // user_id로 직접 조회 (Apple 유저는 user_id가 sub)
        const result = await fastify.pg.query<{ user_id: string }>(
          'SELECT user_id FROM users WHERE user_id = $1 AND deleted_at IS NULL',
          [userId],
        )
        if (result.rowCount === 0) {
          throw fastify.httpErrors.unauthorized('등록되지 않은 사용자입니다')
        }

        request.user = { userId: result.rows[0].user_id, cognitoSub }
      } catch {
        throw fastify.httpErrors.unauthorized('유효하지 않은 토큰입니다')
      }
    },
  )
}

export default fp(authPlugin, { name: 'auth' })
