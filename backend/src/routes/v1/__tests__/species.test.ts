import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { pgResult } from '../../../__tests__/helpers.js'

const { mockQuery } = vi.hoisted(() => ({ mockQuery: vi.fn() }))

vi.mock('@fastify/postgres', async () => {
  const fp = (await import('fastify-plugin')).default
  return {
    default: fp(async (fastify: any) => {
      fastify.decorate('pg', { query: mockQuery })
    }),
  }
})

vi.mock('aws-jwt-verify', () => ({
  CognitoJwtVerifier: {
    create: () => ({ verify: vi.fn().mockRejectedValue(new Error('test-mode')) }),
  },
}))

import { buildApp } from '../../../app.js'
import type { FastifyInstance } from 'fastify'

const mockSpecies = (override: Record<string, unknown> = {}) => ({
  species_id: 'KR-001',
  name_ko: '황새',
  name_sci: 'Ciconia boyciana',
  name_en: 'Oriental Stork',
  rarity_tier: 'legendary',
  sensitivity_tier: 1,
  points: 100,
  is_locked_free: false,
  cultural_heritage_no: '제199호',
  iucn_status: 'EN',
  size_cm: 112,
  habitat_ko: '논, 습지',
  seasonal_presence: null,
  fun_fact_ko: null,
  ...override,
})

describe('GET /api/v1/species', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    vi.clearAllMocks()
    app = await buildApp()
    await app.ready()
  })

  afterEach(async () => {
    await app.close()
  })

  it('인증 없이도 200 반환 (공개 엔드포인트)', async () => {
    // species 라우트: COUNT 먼저, 데이터 나중
    mockQuery.mockResolvedValueOnce(pgResult([{ total: '1' }]))
    mockQuery.mockResolvedValueOnce(pgResult([mockSpecies()]))

    const res = await app.inject({ method: 'GET', url: '/api/v1/species' })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data).toHaveLength(1)
    expect(body.pagination).toBeDefined()
  })

  it('pagination 구조 포함', async () => {
    mockQuery.mockResolvedValueOnce(pgResult([{ total: '300' }]))
    mockQuery.mockResolvedValueOnce(pgResult([mockSpecies(), mockSpecies({ species_id: 'KR-002', name_ko: '두루미' })]))

    const res = await app.inject({ method: 'GET', url: '/api/v1/species?page=1&limit=2' })

    const { pagination } = res.json()
    expect(pagination.page).toBe(1)
    expect(pagination.limit).toBe(2)
    expect(pagination.total).toBe(300)
    expect(pagination.total_pages).toBe(150)
  })

  it('rarity_tier 필터 쿼리 파라미터 전달', async () => {
    mockQuery.mockResolvedValueOnce(pgResult([mockSpecies()]))
    mockQuery.mockResolvedValueOnce(pgResult([{ total: '1' }]))

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/species?rarity_tier=legendary',
    })

    expect(res.statusCode).toBe(200)
    // 실제 필터는 DB가 처리 — 여기서는 mock이므로 쿼리 호출 여부만 확인
    expect(mockQuery).toHaveBeenCalled()
  })

  it('검색어(search) 파라미터 전달 시 200', async () => {
    mockQuery.mockResolvedValueOnce(pgResult([mockSpecies()]))
    mockQuery.mockResolvedValueOnce(pgResult([{ total: '1' }]))

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/species?search=황새',
    })

    expect(res.statusCode).toBe(200)
  })
})

describe('GET /api/v1/species/:id', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    vi.clearAllMocks()
    app = await buildApp()
    await app.ready()
  })

  afterEach(async () => {
    await app.close()
  })

  it('존재하는 종 → 200 + species 객체', async () => {
    mockQuery.mockResolvedValueOnce(pgResult([mockSpecies()]))

    const res = await app.inject({ method: 'GET', url: '/api/v1/species/KR-001' })

    expect(res.statusCode).toBe(200)
    expect(res.json().data.species_id).toBe('KR-001')
    expect(res.json().data.name_ko).toBe('황새')
  })

  it('존재하지 않는 종 → 404', async () => {
    mockQuery.mockResolvedValueOnce(pgResult([], 0))

    const res = await app.inject({ method: 'GET', url: '/api/v1/species/KR-999' })

    expect(res.statusCode).toBe(404)
  })
})
