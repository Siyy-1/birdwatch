/**
 * gallery.ts — /api/v1/gallery 라우터
 *
 * 갤러리 피드 공유 API.
 *
 * 주요 제약:
 * - rarity_tier IN ('rare', 'legendary') 종은 피드에서 완전 배제 (쿼리 WHERE 항상 포함)
 * - 무료 유저(subscription_tier = 'free' OR subscription_expires_at < NOW()):
 *   gallery_posts 30장 초과 시 402 반환
 * - 역지오코딩: 외부 API 없이 한국 도 경계 근사값으로 처리
 * - gallery_hearts.hearts_count는 DB 트리거로 자동 동기화됨
 */
import type { FastifyPluginAsync } from 'fastify'

// ---- 한국 도 경계 근사값 역지오코딩 ----------------------------------------

interface ProvinceBounds {
  name: string
  latMin: number
  latMax: number
  lngMin: number
  lngMax: number
}

const PROVINCE_BOUNDS: ProvinceBounds[] = [
  { name: '서울특별시',   latMin: 37.4,  latMax: 37.7,  lngMin: 126.8, lngMax: 127.2 },
  { name: '경기도',       latMin: 37.0,  latMax: 38.3,  lngMin: 126.7, lngMax: 127.9 },
  { name: '강원도',       latMin: 37.0,  latMax: 38.6,  lngMin: 127.5, lngMax: 129.4 },
  { name: '충청남도',     latMin: 36.0,  latMax: 37.2,  lngMin: 126.2, lngMax: 127.5 },
  { name: '충청북도',     latMin: 36.3,  latMax: 37.6,  lngMin: 127.3, lngMax: 128.5 },
  { name: '전라남도',     latMin: 34.1,  latMax: 35.5,  lngMin: 126.0, lngMax: 127.9 },
  { name: '전라북도',     latMin: 35.4,  latMax: 36.1,  lngMin: 126.4, lngMax: 127.9 },
  { name: '경상남도',     latMin: 34.6,  latMax: 35.8,  lngMin: 127.6, lngMax: 129.2 },
  { name: '경상북도',     latMin: 35.7,  latMax: 37.1,  lngMin: 128.2, lngMax: 129.6 },
  { name: '제주특별자치도', latMin: 33.1, latMax: 33.6, lngMin: 126.1, lngMax: 126.9 },
]

/**
 * 위경도로 한국 도 이름을 반환한다.
 * 경계가 겹치는 경우 배열 앞쪽(더 좁은 범위) 항목이 우선.
 */
function getProvince(lat: number, lng: number): string | null {
  for (const p of PROVINCE_BOUNDS) {
    if (lat >= p.latMin && lat <= p.latMax && lng >= p.lngMin && lng <= p.lngMax) {
      return p.name
    }
  }
  return null
}

// ---- 구독 활성 여부 판별 ----------------------------------------------------

/**
 * subscription_tier = 'premium' 이고 아직 만료되지 않은 경우만 활성으로 본다.
 */
function isActiveSubscriber(
  tier: string,
  expiresAt: Date | null,
): boolean {
  if (tier !== 'premium') return false
  if (expiresAt === null) return false
  return expiresAt > new Date()
}

// ---- 타입 -------------------------------------------------------------------

interface GalleryFeedQuery {
  page?: number
  limit?: number
  species_id?: string
  province?: string
  rarity_tier?: 'common' | 'migrant'
  mine?: boolean
}

interface CreateGalleryPostBody {
  sighting_id: string
  share_location: boolean
}

interface PostParams {
  post_id: string
}

// ---- 라우터 -----------------------------------------------------------------

const galleryRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/v1/gallery
   * 갤러리 피드 조회 (인증 필요).
   *
   * - rarity_tier IN ('rare', 'legendary') 종은 항상 제외.
   * - is_hearted: 현재 유저가 해당 포스트에 좋아요를 눌렀는지 여부.
   */
  fastify.get<{ Querystring: GalleryFeedQuery }>(
    '/',
    {
      onRequest: [fastify.authenticate],
      schema: {
        tags: ['gallery'],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            page:        { type: 'integer', minimum: 1, default: 1 },
            limit:       { type: 'integer', minimum: 1, maximum: 50, default: 20 },
            species_id:  { type: 'string', pattern: '^KR-\\d{3}$' },
            province:    { type: 'string', maxLength: 100 },
            rarity_tier: { type: 'string', enum: ['common', 'migrant'] },
            mine:        { type: 'boolean', default: false },
          },
        },
      },
    },
    async (request, reply) => {
      const { page = 1, limit = 20, species_id, province, rarity_tier, mine } = request.query
      const offset = (page - 1) * limit
      const userId = request.user.userId

      // rare/legendary는 항상 제외 — WHERE에 고정
      const conditions: string[] = [
        `sp.rarity_tier NOT IN ('rare', 'legendary')`,
      ]
      const params: unknown[] = [userId]
      let idx = 2  // $1 = userId (LEFT JOIN + mine 필터에서 사용)

      // mine=true: 내 포스트만 조회 ($1 = userId 재사용)
      if (mine) {
        conditions.push(`gp.user_id = $1`)
      }

      if (species_id) {
        conditions.push(`gp.species_id = $${idx++}`)
        params.push(species_id)
      }
      if (province) {
        const provinces = province.split(',').map((p) => p.trim()).filter(Boolean)
        if (provinces.length === 1) {
          conditions.push(`gp.location_province = $${idx++}`)
          params.push(provinces[0])
        } else if (provinces.length > 1) {
          const placeholders = provinces.map((_, i) => `$${idx + i}`).join(', ')
          conditions.push(`gp.location_province IN (${placeholders})`)
          params.push(...provinces)
          idx += provinces.length
        }
      }
      if (rarity_tier) {
        conditions.push(`sp.rarity_tier = $${idx++}`)
        params.push(rarity_tier)
      }

      const where = conditions.join(' AND ')

      // LIMIT / OFFSET 파라미터 추가
      const limitIdx  = idx++
      const offsetIdx = idx++
      params.push(limit, offset)

      const feedResult = await fastify.pg.query<{
        post_id: string
        species_id: string
        species_name_ko: string
        rarity_tier: string
        photo_cdn_url: string
        location_province: string | null
        hearts_count: number
        is_hearted: boolean
        nickname: string
        created_at: string
      }>(
        `SELECT
            gp.post_id,
            gp.species_id,
            sp.name_ko        AS species_name_ko,
            sp.rarity_tier,
            gp.photo_cdn_url,
            gp.location_province,
            gp.hearts_count,
            (gh.user_id IS NOT NULL) AS is_hearted,
            u.nickname,
            gp.created_at
         FROM gallery_posts gp
         JOIN species sp ON sp.species_id = gp.species_id
         JOIN users   u  ON u.user_id     = gp.user_id
         LEFT JOIN gallery_hearts gh
                        ON gh.post_id = gp.post_id
                       AND gh.user_id = $1
         WHERE ${where}
           AND u.deleted_at IS NULL
         ORDER BY gp.created_at DESC
         LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        params,
      )

      // total 카운트 — LIMIT/OFFSET 파라미터 제외하고 동일 WHERE 재사용
      const countParams = params.slice(0, params.length - 2)
      const countResult = await fastify.pg.query<{ total: string }>(
        `SELECT COUNT(*) AS total
         FROM gallery_posts gp
         JOIN species sp ON sp.species_id = gp.species_id
         JOIN users   u  ON u.user_id     = gp.user_id
         LEFT JOIN gallery_hearts gh ON gh.post_id = gp.post_id AND gh.user_id = $1
         WHERE ${where}
           AND u.deleted_at IS NULL`,
        countParams,
      )
      const total = parseInt(countResult.rows[0].total, 10)

      return reply.send({
        data: feedResult.rows,
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit),
        },
      })
    },
  )

  /**
   * POST /api/v1/gallery
   * 사이팅을 갤러리에 공유 (인증 필요).
   *
   * 1. 사이팅 소유자 확인
   * 2. 희귀도 필터 (rare/legendary → 403)
   * 3. 역지오코딩 (share_location=true)
   * 4. 무료 유저 30장 한도 체크
   * 5. INSERT gallery_posts
   */
  fastify.post<{ Body: CreateGalleryPostBody }>(
    '/',
    {
      onRequest: [fastify.authenticate],
      schema: {
        tags: ['gallery'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['sighting_id', 'share_location'],
          properties: {
            sighting_id:    { type: 'string', format: 'uuid' },
            share_location: { type: 'boolean' },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.userId
      const { sighting_id, share_location } = request.body

      // 1. 사이팅 조회 + 소유자 확인 + 종 rarity_tier 동시 조회
      const sightingResult = await fastify.pg.query<{
        user_id: string
        species_id: string
        rarity_tier: string
        photo_cdn_url: string
        lat: number
        lng: number
      }>(
        `SELECT
            s.user_id,
            s.species_id,
            sp.rarity_tier,
            s.photo_cdn_url,
            ST_Y(s.location::geometry) AS lat,
            ST_X(s.location::geometry) AS lng
         FROM sightings s
         JOIN species sp ON sp.species_id = s.species_id
         WHERE s.sighting_id = $1
           AND s.deleted_at IS NULL`,
        [sighting_id],
      )

      if (sightingResult.rowCount === 0) {
        return reply.code(404).send({ error: '사이팅을 찾을 수 없습니다' })
      }

      const sighting = sightingResult.rows[0]

      // 소유자 확인
      if (sighting.user_id !== userId) {
        return reply.code(403).send({ error: '본인의 사이팅만 공유할 수 있습니다' })
      }

      // 사진 없는 사이팅은 갤러리 공유 불가
      if (!sighting.photo_cdn_url) {
        return reply.code(422).send({ error: '사진이 없는 사이팅은 갤러리에 공유할 수 없습니다' })
      }

      // 2. 희귀도 제한
      if (sighting.rarity_tier === 'rare' || sighting.rarity_tier === 'legendary') {
        return reply.code(403).send({
          error: '희귀종(rare/legendary)은 갤러리에 공유할 수 없습니다',
          code: 'RARITY_RESTRICTED',
        })
      }

      // 3. 역지오코딩 (share_location=true인 경우)
      let locationProvince: string | null = null
      if (share_location) {
        locationProvince = getProvince(sighting.lat, sighting.lng)
        // 매칭 안되면 null — DB에도 null 저장
      }

      // 4. 구독 상태 확인
      const userResult = await fastify.pg.query<{
        subscription_tier: string
        subscription_expires_at: Date | null
      }>(
        `SELECT subscription_tier, subscription_expires_at
         FROM users
         WHERE user_id = $1 AND deleted_at IS NULL`,
        [userId],
      )

      if (userResult.rowCount === 0) {
        return reply.code(401).send({ error: '사용자를 찾을 수 없습니다' })
      }

      const { subscription_tier, subscription_expires_at } = userResult.rows[0]
      const isPremium = isActiveSubscriber(subscription_tier, subscription_expires_at)

      // 5. INSERT gallery_posts
      //    sighting UNIQUE 제약(uq_gallery_posts_sighting)으로 중복 삽입 방지
      try {
        const insertQuery = isPremium
          ? `INSERT INTO gallery_posts (sighting_id, user_id, species_id, photo_cdn_url, location_province)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING post_id`
          : `INSERT INTO gallery_posts (sighting_id, user_id, species_id, photo_cdn_url, location_province)
             SELECT $1, $2, $3, $4, $5
             WHERE (SELECT COUNT(*) FROM gallery_posts WHERE user_id = $2) < 30
             RETURNING post_id`

        const insertResult = await fastify.pg.query<{ post_id: string }>(
          insertQuery,
          [
            sighting_id,
            userId,
            sighting.species_id,
            sighting.photo_cdn_url,
            locationProvince,
          ],
        )

        if (!isPremium && (insertResult.rowCount === 0 || insertResult.rowCount === null)) {
          return reply.code(402).send({
            error: '무료 플랜에서는 갤러리에 최대 30개까지 공유할 수 있습니다. Explorer Pass를 구독하면 무제한으로 공유할 수 있어요.',
            code: 'FREE_GALLERY_LIMIT',
          })
        }

        return reply.code(201).send({
          data: { post_id: insertResult.rows[0].post_id },
        })
      } catch (err: unknown) {
        // PostgreSQL unique_violation = 23505
        const pgErr = err as { code?: string }
        if (pgErr.code === '23505') {
          return reply.code(409).send({
            error: '이미 갤러리에 공유된 사이팅입니다',
            code: 'ALREADY_SHARED',
          })
        }
        throw err
      }
    },
  )

  /**
   * DELETE /api/v1/gallery/:post_id
   * 갤러리 공유 취소 (인증 필요, 본인 포스트만).
   */
  fastify.delete<{ Params: PostParams }>(
    '/:post_id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        tags: ['gallery'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['post_id'],
          properties: {
            post_id: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.userId
      const { post_id } = request.params

      const result = await fastify.pg.query(
        `DELETE FROM gallery_posts
         WHERE post_id = $1 AND user_id = $2
         RETURNING post_id`,
        [post_id, userId],
      )

      if (result.rowCount === 0) {
        return reply.code(404).send({ error: '포스트를 찾을 수 없습니다' })
      }

      return reply.code(204).send()
    },
  )

  /**
   * POST /api/v1/gallery/:post_id/heart
   * 좋아요 (인증 필요).
   * hearts_count는 DB 트리거(trg_gallery_hearts_count)가 자동 동기화.
   */
  fastify.post<{ Params: PostParams }>(
    '/:post_id/heart',
    {
      onRequest: [fastify.authenticate],
      schema: {
        tags: ['gallery'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['post_id'],
          properties: {
            post_id: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.userId
      const { post_id } = request.params

      try {
        await fastify.pg.query(
          `INSERT INTO gallery_hearts (user_id, post_id) VALUES ($1, $2)`,
          [userId, post_id],
        )
      } catch (err: unknown) {
        const pgErr = err as { code?: string }
        if (pgErr.code === '23505') {
          return reply.code(409).send({
            error: '이미 좋아요를 눌렀습니다',
            code: 'ALREADY_HEARTED',
          })
        }
        if (pgErr.code === '23503') {
          return reply.code(404).send({ error: '포스트를 찾을 수 없습니다' })
        }
        throw err
      }

      return reply.code(201).send({ data: { post_id } })
    },
  )

  /**
   * DELETE /api/v1/gallery/:post_id/heart
   * 좋아요 취소 (인증 필요).
   */
  fastify.delete<{ Params: PostParams }>(
    '/:post_id/heart',
    {
      onRequest: [fastify.authenticate],
      schema: {
        tags: ['gallery'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['post_id'],
          properties: {
            post_id: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.userId
      const { post_id } = request.params

      const result = await fastify.pg.query(
        `DELETE FROM gallery_hearts
         WHERE user_id = $1 AND post_id = $2
         RETURNING post_id`,
        [userId, post_id],
      )

      if (result.rowCount === 0) {
        return reply.code(404).send({ error: '좋아요 기록을 찾을 수 없습니다' })
      }

      return reply.code(204).send()
    },
  )
}

export default galleryRoutes
