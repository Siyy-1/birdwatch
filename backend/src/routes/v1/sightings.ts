/**
 * sightings.ts — /api/v1/sightings 라우터
 *
 * PIPA 준수 원칙:
 * - POST: user.gps_consent = TRUE 확인 후에만 location 저장
 * - GET:  obscure_coordinate(location, species.sensitivity_tier, is_owner) 적용
 *         is_owner = sighting.user_id === request.user.userId
 */
import type { FastifyPluginAsync } from 'fastify'

// ---- 타입 ----------------------------------------------------------------

interface CreateSightingBody {
  species_id: string
  lat: number
  lng: number
  location_accuracy_m?: number
  altitude_m?: number
  photo_s3_key: string
  thumbnail_s3_key?: string
  exif_stripped: boolean
  ai_species_id?: string
  ai_confidence?: number
  ai_top3?: Array<{ species_id: string; confidence: number }>
  ai_model_version?: string
  ai_inference_ms?: number
  observed_at: string  // ISO 8601
}

interface SightingsListQuery {
  page?: number
  limit?: number
  species_id?: string
}

interface SightingParams {
  id: string
}

// ---- 라우터 ---------------------------------------------------------------

const sightingsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/v1/sightings
   * 인증 필수. 본인 목격 기록 목록 반환 (좌표 난독화 적용).
   */
  fastify.get<{ Querystring: SightingsListQuery }>(
    '/',
    {
      onRequest: [fastify.authenticate],
      schema: {
        tags: ['sightings'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            page:       { type: 'integer', minimum: 1, default: 1 },
            limit:      { type: 'integer', minimum: 1, maximum: 50, default: 20 },
            species_id: { type: 'string', pattern: '^KR-\\d{3}$' },
          },
        },
      },
    },
    async (request, reply) => {
      const { page = 1, limit = 20, species_id } = request.query
      const offset = (page - 1) * limit
      const userId = request.user.userId

      const conditions = ['s.user_id = $1', 's.deleted_at IS NULL']
      const params: unknown[] = [userId]
      let idx = 2

      if (species_id) {
        conditions.push(`s.species_id = $${idx++}`)
        params.push(species_id)
      }

      const where = conditions.join(' AND ')
      params.push(limit, offset)

      // 본인 목격 → is_owner=TRUE → obscure_coordinate가 원본 반환
      const result = await fastify.pg.query(
        `SELECT
            s.sighting_id, s.user_id, s.species_id, sp.name_ko,
            ST_Y(obscure_coordinate(s.location, sp.sensitivity_tier, TRUE)::geometry) AS lat,
            ST_X(obscure_coordinate(s.location, sp.sensitivity_tier, TRUE)::geometry) AS lng,
            s.location_accuracy_m, s.altitude_m,
            s.photo_s3_key, s.photo_cdn_url, s.thumbnail_s3_key,
            s.exif_stripped,
            s.ai_species_id, s.ai_confidence, s.ai_top3,
            s.ai_model_version, s.ai_inference_ms,
            s.is_ai_confirmed, s.is_manually_verified,
            s.points_earned, s.is_first_for_user,
            s.observed_at, s.created_at
           FROM sightings s
           JOIN species sp ON sp.species_id = s.species_id
           WHERE ${where}
           ORDER BY s.observed_at DESC
           LIMIT $${idx++} OFFSET $${idx++}`,
        params,
      )

      const countResult = await fastify.pg.query<{ total: string }>(
        `SELECT COUNT(*) AS total FROM sightings s WHERE ${conditions.join(' AND ')}`,
        [userId, ...(species_id ? [species_id] : [])],
      )
      const total = parseInt(countResult.rows[0].total, 10)

      return reply.send({
        data: result.rows,
        pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
      })
    },
  )

  /**
   * GET /api/v1/sightings/collected-species
   * 인증 필수. 사용자가 수집한 species_id 목록만 반환.
   */
  fastify.get(
    '/collected-species',
    {
      onRequest: [fastify.authenticate],
      schema: {
        tags: ['sightings'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const userId = request.user.userId

      const result = await fastify.pg.query<{ species_id: string }>(
        `SELECT DISTINCT species_id
         FROM sightings
         WHERE user_id = $1
           AND deleted_at IS NULL`,
        [userId],
      )

      return reply.send({
        data: {
          species_ids: result.rows.map((row) => row.species_id),
        },
      })
    },
  )

  /**
   * GET /api/v1/sightings/:id
   * 인증 필수. 타인 목격은 민감종 좌표 난독화 적용.
   */
  fastify.get<{ Params: SightingParams }>(
    '/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        tags: ['sightings'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', format: 'uuid' } },
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.userId
      const { id } = request.params

      const result = await fastify.pg.query(
        `SELECT
            s.sighting_id, s.user_id, s.species_id,
            ST_Y(obscure_coordinate(
              s.location,
              sp.sensitivity_tier,
              s.user_id = $2
            )::geometry) AS lat,
            ST_X(obscure_coordinate(
              s.location,
              sp.sensitivity_tier,
              s.user_id = $2
            )::geometry) AS lng,
            s.location_accuracy_m, s.altitude_m,
            s.photo_cdn_url, s.thumbnail_s3_key,
            s.ai_species_id, s.ai_confidence, s.ai_top3,
            s.is_ai_confirmed, s.is_manually_verified,
            s.points_earned, s.is_first_for_user,
            s.observed_at, s.created_at
           FROM sightings s
           JOIN species sp ON sp.species_id = s.species_id
           WHERE s.sighting_id = $1 AND s.deleted_at IS NULL`,
        [id, userId],
      )

      if (result.rowCount === 0) {
        return reply.code(404).send({ error: '목격 기록을 찾을 수 없습니다' })
      }

      return reply.send({ data: result.rows[0] })
    },
  )

  /**
   * POST /api/v1/sightings
   * PIPA: gps_consent 확인 필수. exif_stripped 검증.
   */
  fastify.post<{ Body: CreateSightingBody }>(
    '/',
    {
      onRequest: [fastify.authenticate],
      schema: {
        tags: ['sightings'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['species_id', 'lat', 'lng', 'photo_s3_key', 'exif_stripped', 'observed_at'],
          properties: {
            species_id:         { type: 'string', pattern: '^KR-\\d{3}$' },
            lat:                { type: 'number', minimum: -90,  maximum: 90 },
            lng:                { type: 'number', minimum: -180, maximum: 180 },
            location_accuracy_m: { type: 'integer', minimum: 0 },
            altitude_m:         { type: 'number' },
            photo_s3_key:       { type: 'string', minLength: 1, maxLength: 500 },
            thumbnail_s3_key:   { type: 'string', maxLength: 500 },
            exif_stripped:      { type: 'boolean' },
            ai_species_id:      { type: 'string', pattern: '^KR-\\d{3}$' },
            ai_confidence:      { type: 'number', minimum: 0, maximum: 1 },
            ai_top3:            { type: 'array', maxItems: 3 },
            ai_model_version:   { type: 'string', maxLength: 20 },
            ai_inference_ms:    { type: 'integer', minimum: 0 },
            observed_at:        { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.userId
      const body = request.body

      // PIPA 제15조: GPS 동의 확인
      const consentResult = await fastify.pg.query<{ gps_consent: boolean }>(
        'SELECT gps_consent FROM users WHERE user_id = $1 AND deleted_at IS NULL',
        [userId],
      )
      if (consentResult.rowCount === 0) {
        return reply.code(401).send({ error: '사용자를 찾을 수 없습니다' })
      }
      if (!consentResult.rows[0].gps_consent) {
        return reply.code(403).send({
          error: 'GPS 위치정보 수집에 동의하지 않았습니다',
          code: 'GPS_CONSENT_REQUIRED',
        })
      }

      // PIPA: EXIF 제거 확인
      if (!body.exif_stripped) {
        return reply.code(422).send({
          error: 'EXIF가 제거되지 않은 사진은 업로드할 수 없습니다',
          code: 'EXIF_NOT_STRIPPED',
        })
      }

      // 종 존재 확인
      const speciesResult = await fastify.pg.query<{ species_id: string }>(
        'SELECT species_id FROM species WHERE species_id = $1',
        [body.species_id],
      )
      if (speciesResult.rowCount === 0) {
        return reply.code(404).send({ error: '존재하지 않는 종입니다' })
      }

      // AI 신뢰도 기준 확인 여부
      const isAiConfirmed =
        body.ai_confidence != null &&
        body.ai_species_id === body.species_id &&
        body.ai_confidence >= 0.85

      // 이 유저의 이 종 첫 목격 여부
      const firstResult = await fastify.pg.query<{ exists: boolean }>(
        `SELECT EXISTS(
           SELECT 1 FROM sightings
           WHERE user_id = $1 AND species_id = $2
             AND deleted_at IS NULL AND is_first_for_user = TRUE
         ) AS exists`,
        [userId, body.species_id],
      )
      const isFirstForUser = !firstResult.rows[0].exists

      // 점수 계산 (DB에서 직접 조회)
      const pointsResult = await fastify.pg.query<{ points: number }>(
        'SELECT points FROM species WHERE species_id = $1',
        [body.species_id],
      )
      const pointsEarned = isFirstForUser ? (pointsResult.rows[0]?.points ?? 0) : 0

      // 사진 CDN URL 생성 (CloudFront)
      const photoCdnUrl = `https://${process.env.CLOUDFRONT_DOMAIN}/${body.photo_s3_key}`

      const insertResult = await fastify.pg.query(
        `INSERT INTO sightings (
            user_id, species_id,
            location, location_accuracy_m, altitude_m,
            photo_s3_key, photo_cdn_url, thumbnail_s3_key, exif_stripped,
            ai_species_id, ai_confidence, ai_top3, ai_model_version, ai_inference_ms,
            is_ai_confirmed, points_earned, is_first_for_user,
            observed_at
          ) VALUES (
            $1, $2,
            ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography,
            $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15,
            $16, $17, $18,
            $19
          )
          RETURNING sighting_id, created_at`,
        [
          userId, body.species_id,
          body.lat, body.lng,
          body.location_accuracy_m ?? null,
          body.altitude_m ?? null,
          body.photo_s3_key,
          photoCdnUrl,
          body.thumbnail_s3_key ?? null,
          body.exif_stripped,
          body.ai_species_id ?? null,
          body.ai_confidence ?? null,
          body.ai_top3 ? JSON.stringify(body.ai_top3) : null,
          body.ai_model_version ?? null,
          body.ai_inference_ms ?? null,
          isAiConfirmed,
          pointsEarned,
          isFirstForUser,
          body.observed_at,
        ],
      )

      // 유저 stats 업데이트 (비동기, 실패해도 응답은 성공)
      fastify.pg
        .query(
          `UPDATE users SET
             total_points = total_points + $2,
             last_sighting_at = NOW(),
             species_count = species_count + $3,
             streak_days = CASE
               WHEN last_sighting_at::date = CURRENT_DATE - 1 THEN streak_days + 1
               WHEN last_sighting_at::date = CURRENT_DATE THEN streak_days
               ELSE 1
             END
           WHERE user_id = $1`,
          [userId, pointsEarned, isFirstForUser ? 1 : 0],
        )
        .catch((err: unknown) => fastify.log.error(err, 'users stats 업데이트 실패'))

      return reply.code(201).send({
        data: {
          sighting_id: insertResult.rows[0].sighting_id,
          points_earned: pointsEarned,
          is_first_for_user: isFirstForUser,
          is_ai_confirmed: isAiConfirmed,
          created_at: insertResult.rows[0].created_at,
        },
      })
    },
  )

  /**
   * DELETE /api/v1/sightings/:id  — 소프트 삭제
   */
  fastify.delete<{ Params: SightingParams }>(
    '/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        tags: ['sightings'],
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const userId = request.user.userId
      const { id } = request.params

      const result = await fastify.pg.query(
        `UPDATE sightings
           SET deleted_at = NOW(), updated_at = NOW()
           WHERE sighting_id = $1 AND user_id = $2 AND deleted_at IS NULL
           RETURNING sighting_id`,
        [id, userId],
      )

      if (result.rowCount === 0) {
        return reply.code(404).send({ error: '목격 기록을 찾을 수 없습니다' })
      }

      return reply.code(204).send()
    },
  )
}

export default sightingsRoutes
