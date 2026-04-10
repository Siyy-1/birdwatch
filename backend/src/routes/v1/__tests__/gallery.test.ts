import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { pgResult, mockUserRow, createTestJwt } from '../../../__tests__/helpers.js'

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

const SIGHTING_ID = '11111111-1111-1111-1111-111111111111'
const USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

const mockSightingRow = {
  user_id: USER_ID,
  species_id: 'KR-001',
  rarity_tier: 'common',
  photo_cdn_url: 'https://cdn.birdwatch.kr/photos/test.jpg',
  lat: 37.5,
  lng: 127.0,
}

describe('Gallery API', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    vi.clearAllMocks()
    app = await buildApp()
    await app.ready()
  })

  afterEach(async () => {
    await app.close()
  })

  // ── GET /api/v1/gallery ───────────────────────────────────────────────────

  describe('GET /api/v1/gallery', () => {
    it('인증 없으면 401', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/gallery' })
      expect(res.statusCode).toBe(401)
    })

    it('인증 있으면 피드 목록 반환', async () => {
      const token = await createTestJwt(USER_ID)
      // 0) AUTH: HS256 user lookup
      mockQuery.mockResolvedValueOnce(pgResult([{ user_id: USER_ID }]))
      // 1) feed query
      mockQuery.mockResolvedValueOnce(pgResult([
        { post_id: 'post-1', name_ko: '황새', rarity_tier: 'common', hearts_count: 5, is_hearted: false },
      ]))
      // 2) count query
      mockQuery.mockResolvedValueOnce(pgResult([{ total: '1' }]))

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/gallery',
        headers: { authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.data).toHaveLength(1)
      expect(body.pagination.total).toBe(1)
    })
  })

  // ── POST /api/v1/gallery ──────────────────────────────────────────────────

  describe('POST /api/v1/gallery', () => {
    it('인증 없으면 401', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/gallery',
        payload: { sighting_id: SIGHTING_ID, share_location: false },
      })
      expect(res.statusCode).toBe(401)
    })

    it('free 유저 30장 한도 미만이면 201 반환', async () => {
      const token = await createTestJwt(USER_ID)
      // 0) AUTH: HS256 user lookup
      mockQuery.mockResolvedValueOnce(pgResult([{ user_id: USER_ID }]))
      // 1) sighting 조회
      mockQuery.mockResolvedValueOnce(pgResult([mockSightingRow]))
      // 2) user 구독 상태 → free
      mockQuery.mockResolvedValueOnce(pgResult([mockUserRow({ user_id: USER_ID, subscription_tier: 'free', subscription_expires_at: null })]))
      // 3) INSERT (WHERE COUNT < 30 조건 충족) → post_id 반환
      mockQuery.mockResolvedValueOnce(pgResult([{ post_id: 'new-post-uuid' }]))

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/gallery',
        headers: { authorization: `Bearer ${token}` },
        payload: { sighting_id: SIGHTING_ID, share_location: false },
      })

      expect(res.statusCode).toBe(201)
      expect(res.json().data.post_id).toBe('new-post-uuid')
    })

    it('free 유저 30장 한도 초과 시 402 반환', async () => {
      const token = await createTestJwt(USER_ID)
      // 0) AUTH: HS256 user lookup
      mockQuery.mockResolvedValueOnce(pgResult([{ user_id: USER_ID }]))
      // 1) sighting 조회
      mockQuery.mockResolvedValueOnce(pgResult([mockSightingRow]))
      // 2) user 구독 → free
      mockQuery.mockResolvedValueOnce(pgResult([mockUserRow({ user_id: USER_ID, subscription_tier: 'free', subscription_expires_at: null })]))
      // 3) INSERT → rowCount=0 (WHERE COUNT < 30 조건 실패)
      mockQuery.mockResolvedValueOnce(pgResult([], 0))

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/gallery',
        headers: { authorization: `Bearer ${token}` },
        payload: { sighting_id: SIGHTING_ID, share_location: false },
      })

      expect(res.statusCode).toBe(402)
      expect(res.json().code).toBe('FREE_GALLERY_LIMIT')
    })

    it('premium 유저는 30장 제한 없이 201 반환', async () => {
      const token = await createTestJwt(USER_ID)
      // 0) AUTH: HS256 user lookup
      mockQuery.mockResolvedValueOnce(pgResult([{ user_id: USER_ID }]))
      // sighting
      mockQuery.mockResolvedValueOnce(pgResult([mockSightingRow]))
      // user → premium
      mockQuery.mockResolvedValueOnce(pgResult([mockUserRow({
        user_id: USER_ID,
        subscription_tier: 'premium',
        subscription_expires_at: new Date(Date.now() + 86400000),
      })]))
      // INSERT 무조건 성공 (WHERE COUNT 조건 없는 쿼리)
      mockQuery.mockResolvedValueOnce(pgResult([{ post_id: 'premium-post-uuid' }]))

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/gallery',
        headers: { authorization: `Bearer ${token}` },
        payload: { sighting_id: SIGHTING_ID, share_location: false },
      })

      expect(res.statusCode).toBe(201)
    })

    it('rare 종은 갤러리 공유 불가 → 403', async () => {
      const token = await createTestJwt(USER_ID)
      // 0) AUTH: HS256 user lookup
      mockQuery.mockResolvedValueOnce(pgResult([{ user_id: USER_ID }]))
      mockQuery.mockResolvedValueOnce(pgResult([{ ...mockSightingRow, rarity_tier: 'rare' }]))

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/gallery',
        headers: { authorization: `Bearer ${token}` },
        payload: { sighting_id: SIGHTING_ID, share_location: false },
      })

      expect(res.statusCode).toBe(403)
      expect(res.json().code).toBe('RARITY_RESTRICTED')
    })

    it('legendary 종도 갤러리 공유 불가 → 403', async () => {
      const token = await createTestJwt(USER_ID)
      // 0) AUTH: HS256 user lookup
      mockQuery.mockResolvedValueOnce(pgResult([{ user_id: USER_ID }]))
      mockQuery.mockResolvedValueOnce(pgResult([{ ...mockSightingRow, rarity_tier: 'legendary' }]))

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/gallery',
        headers: { authorization: `Bearer ${token}` },
        payload: { sighting_id: SIGHTING_ID, share_location: false },
      })

      expect(res.statusCode).toBe(403)
    })
  })
})
