/**
 * users.ts — /api/v1/users 라우터
 * GET   /api/v1/users/me         내 프로필
 * PATCH /api/v1/users/me         프로필 수정
 * POST  /api/v1/users/me/consent GPS 동의 업데이트 (PIPA)
 * DELETE /api/v1/users/me        회원 탈퇴 (소프트 삭제)
 */
import type { FastifyPluginAsync } from 'fastify'

interface PatchUserBody {
  nickname?: string
  profile_image_key?: string
  marketing_agreed?: boolean
}

interface ConsentBody {
  gps_consent: boolean
}

const usersRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/v1/users/me
   */
  fastify.get(
    '/me',
    {
      onRequest: [fastify.authenticate],
      schema: { tags: ['users'], security: [{ bearerAuth: [] }] },
    },
    async (request, reply) => {
      const result = await fastify.pg.query(
        `SELECT user_id, nickname, profile_image_key,
                oauth_provider, gps_consent, gps_consent_at,
                terms_agreed_at, privacy_agreed_at, marketing_agreed_at,
                total_points, streak_days, last_sighting_at, species_count,
                subscription_tier, subscription_expires_at,
                created_at, updated_at
           FROM users
           WHERE user_id = $1 AND deleted_at IS NULL`,
        [request.user.userId],
      )

      if (result.rowCount === 0) {
        return reply.code(404).send({ error: '사용자를 찾을 수 없습니다' })
      }

      return reply.send({ data: result.rows[0] })
    },
  )

  /**
   * PATCH /api/v1/users/me
   * nickname, profile_image_key, marketing_agreed 수정 가능.
   */
  fastify.patch<{ Body: PatchUserBody }>(
    '/me',
    {
      onRequest: [fastify.authenticate],
      schema: {
        tags: ['users'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            nickname:          { type: 'string', minLength: 2, maxLength: 50 },
            profile_image_key: { type: 'string', maxLength: 500 },
            marketing_agreed:  { type: 'boolean' },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.userId
      const { nickname, profile_image_key, marketing_agreed } = request.body

      const sets: string[] = ['updated_at = NOW()']
      const params: unknown[] = [userId]
      let idx = 2

      if (nickname !== undefined) {
        sets.push(`nickname = $${idx++}`)
        params.push(nickname)
      }
      if (profile_image_key !== undefined) {
        sets.push(`profile_image_key = $${idx++}`)
        params.push(profile_image_key)
      }
      if (marketing_agreed !== undefined) {
        sets.push(`marketing_agreed_at = $${idx++}`)
        params.push(marketing_agreed ? new Date() : null)
      }

      if (sets.length === 1) {
        return reply.code(400).send({ error: '변경할 항목이 없습니다' })
      }

      const result = await fastify.pg.query(
        `UPDATE users SET ${sets.join(', ')}
           WHERE user_id = $1 AND deleted_at IS NULL
           RETURNING user_id, nickname, profile_image_key, marketing_agreed_at, updated_at`,
        params,
      )

      if (result.rowCount === 0) {
        return reply.code(404).send({ error: '사용자를 찾을 수 없습니다' })
      }

      return reply.send({ data: result.rows[0] })
    },
  )

  /**
   * POST /api/v1/users/me/consent
   * PIPA 제15조: GPS 위치정보 수집 동의 변경.
   * 동의 철회 시 이미 저장된 sightings.location은 유지 (본인 접근은 원본, 타인은 난독화).
   */
  fastify.post<{ Body: ConsentBody }>(
    '/me/consent',
    {
      onRequest: [fastify.authenticate],
      schema: {
        tags: ['users'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['gps_consent'],
          properties: { gps_consent: { type: 'boolean' } },
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.userId
      const { gps_consent } = request.body

      await fastify.pg.query(
        `UPDATE users
           SET gps_consent = $2,
               gps_consent_at = CASE WHEN $2 = TRUE THEN NOW() ELSE gps_consent_at END,
               updated_at = NOW()
           WHERE user_id = $1 AND deleted_at IS NULL`,
        [userId, gps_consent],
      )

      return reply.send({
        data: { gps_consent, message: gps_consent ? 'GPS 동의가 완료되었습니다' : 'GPS 동의가 철회되었습니다' },
      })
    },
  )

  /**
   * DELETE /api/v1/users/me
   * PIPA 제21조: 탈퇴 = deleted_at 설정. 30일 후 배치 잡이 PII 파기.
   */
  fastify.delete(
    '/me',
    {
      onRequest: [fastify.authenticate],
      schema: { tags: ['users'], security: [{ bearerAuth: [] }] },
    },
    async (request, reply) => {
      await fastify.pg.query(
        `UPDATE users
           SET deleted_at = NOW(), updated_at = NOW()
           WHERE user_id = $1 AND deleted_at IS NULL`,
        [request.user.userId],
      )

      // 참고: 실제 PII 파기(nickname, oauth_sub 등 NULL 처리)는 30일 후 배치 잡에서 수행
      return reply.code(204).send()
    },
  )
}

export default usersRoutes
