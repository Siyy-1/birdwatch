/**
 * species.ts — /api/v1/species 라우터
 * GET  /api/v1/species          종 목록 (페이지네이션)
 * GET  /api/v1/species/:id      종 상세
 */
import type { FastifyPluginAsync } from 'fastify'

// ---- 쿼리/파라미터 타입 ------------------------------------------------

interface SpeciesListQuery {
  page?: number
  limit?: number
  rarity_tier?: 'common' | 'migrant' | 'rare' | 'legendary'
  search?: string   // name_ko 또는 name_sci 부분 검색
}

interface SpeciesParams {
  id: string   // species_id (KR-001 등)
}

// ---- 라우터 ---------------------------------------------------------------

const speciesRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/v1/species
   * 잠긴 종(is_locked_free=TRUE)은 name_ko, rarity_tier, points만 반환.
   */
  fastify.get<{ Querystring: SpeciesListQuery }>(
    '/',
    {
      schema: {
        tags: ['species'],
        querystring: {
          type: 'object',
          properties: {
            page:        { type: 'integer', minimum: 1, default: 1 },
            limit:       { type: 'integer', minimum: 1, maximum: 100, default: 50 },
            rarity_tier: { type: 'string', enum: ['common', 'migrant', 'rare', 'legendary'] },
            search:      { type: 'string', maxLength: 100 },
          },
        },
      },
    },
    async (request, reply) => {
      const { page = 1, limit = 50, rarity_tier, search } = request.query
      const offset = (page - 1) * limit

      const conditions: string[] = []
      const params: unknown[] = []
      let idx = 1

      if (rarity_tier) {
        conditions.push(`rarity_tier = $${idx++}`)
        params.push(rarity_tier)
      }
      if (search) {
        conditions.push(`(name_ko ILIKE $${idx} OR name_sci ILIKE $${idx})`)
        params.push(`%${search}%`)
        idx++
      }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

      const countResult = await fastify.pg.query<{ total: string }>(
        `SELECT COUNT(*) AS total FROM species ${where}`,
        params,
      )
      const total = parseInt(countResult.rows[0].total, 10)

      params.push(limit, offset)
      const rows = await fastify.pg.query(
        `SELECT species_id, name_ko, name_sci, name_en,
                rarity_tier, sensitivity_tier, points, aba_code,
                is_locked_free, cultural_heritage_no, iucn_status, size_cm,
                habitat_ko, seasonal_presence, fun_fact_ko
           FROM species
           ${where}
           ORDER BY species_id
           LIMIT $${idx++} OFFSET $${idx++}`,
        params,
      )

      const items = rows.rows.map(maskLockedSpecies)

      return reply.send({
        data: items,
        pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
      })
    },
  )

  /**
   * GET /api/v1/species/:id
   */
  fastify.get<{ Params: SpeciesParams }>(
    '/:id',
    {
      schema: {
        tags: ['species'],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', pattern: '^KR-\\d{3}$' } },
        },
      },
    },
    async (request, reply) => {
      const result = await fastify.pg.query(
        `SELECT species_id, name_ko, name_sci, name_en,
                rarity_tier, sensitivity_tier, points, aba_code,
                is_locked_free, cultural_heritage_no, iucn_status, size_cm,
                habitat_ko, seasonal_presence, fun_fact_ko
           FROM species
           WHERE species_id = $1`,
        [request.params.id],
      )

      if (result.rowCount === 0) {
        return reply.code(404).send({ error: '종을 찾을 수 없습니다' })
      }

      return reply.send({ data: maskLockedSpecies(result.rows[0]) })
    },
  )
}

/** 잠긴 종은 상세 필드를 null로 마스킹 */
function maskLockedSpecies(row: Record<string, unknown>) {
  if (!row.is_locked_free) return row
  return {
    species_id: row.species_id,
    name_ko: row.name_ko,
    rarity_tier: row.rarity_tier,
    sensitivity_tier: row.sensitivity_tier,
    points: row.points,
    is_locked_free: true,
    // 잠긴 종: 아래 상세 정보 숨김
    name_sci: null,
    name_en: null,
    aba_code: null,
    cultural_heritage_no: null,
    iucn_status: null,
    size_cm: null,
    habitat_ko: null,
    seasonal_presence: null,
    fun_fact_ko: null,
  }
}

export default speciesRoutes
