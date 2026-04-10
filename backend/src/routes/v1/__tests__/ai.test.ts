import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { pgResult, mockUserRow, createTestJwt } from '../../../__tests__/helpers.js'

// ── pg mock (hoisted → vi.mock 팩토리에서 참조 가능) ────────────────────────
const { mockQuery } = vi.hoisted(() => ({ mockQuery: vi.fn() }))

vi.mock('@fastify/postgres', async () => {
  const fp = (await import('fastify-plugin')).default
  return {
    default: fp(async (fastify: any) => {
      fastify.decorate('pg', { query: mockQuery })
    }),
  }
})

// Cognito 검증은 항상 실패시켜 HS256 경로로 유도
vi.mock('aws-jwt-verify', () => ({
  CognitoJwtVerifier: {
    create: () => ({ verify: vi.fn().mockRejectedValue(new Error('test-mode')) }),
  },
}))

// S3 mock (이미지 다운로드 경로 건너뜀)
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({ send: vi.fn() })),
  GetObjectCommand: vi.fn(),
}))

// ── app 빌드 ─────────────────────────────────────────────────────────────────
import { buildApp } from '../../../app.js'
import type { FastifyInstance } from 'fastify'

describe('POST /api/v1/ai/identify', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    vi.clearAllMocks()
    app = await buildApp()
    await app.ready()
  })

  afterEach(async () => {
    await app.close()
  })

  it('인증 토큰 없으면 401 반환', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/identify',
      payload: { s3_key: 'test/photo.jpg' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('free 유저 일일 한도(10회) 초과 시 429 반환', async () => {
    const userId = 'free-user-uuid'
    const token = await createTestJwt(userId)

    // 0) AUTH: HS256 user lookup
    mockQuery.mockResolvedValueOnce(pgResult([{ user_id: userId }]))
    // 1) users 조회 → free
    mockQuery.mockResolvedValueOnce(pgResult([mockUserRow({ user_id: userId, subscription_tier: 'free' })]))
    // 2) 오늘 사용 횟수 → 10회 (한도 도달)
    mockQuery.mockResolvedValueOnce(pgResult([{ count: '10' }]))

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/identify',
      headers: { authorization: `Bearer ${token}` },
      payload: { s3_key: 'test/photo.jpg' },
    })

    expect(res.statusCode).toBe(429)
    const body = res.json()
    expect(body.code).toBe('AI_DAILY_LIMIT_EXCEEDED')
    expect(body.limit).toBe(10)
    expect(body.used).toBe(10)
  })

  it('free 유저 9회 사용 시 한도 미초과 → 이미지 로드 단계로 진행', async () => {
    const userId = 'free-user-uuid'
    const token = await createTestJwt(userId)

    // 0) AUTH: HS256 user lookup
    mockQuery.mockResolvedValueOnce(pgResult([{ user_id: userId }]))
    mockQuery.mockResolvedValueOnce(pgResult([mockUserRow({ user_id: userId, subscription_tier: 'free' })]))
    mockQuery.mockResolvedValueOnce(pgResult([{ count: '9' }]))
    // 이미지 로드(dev 모드 로컬 파일) → ENOENT로 422 반환
    // (실제 파일 없음 — 422 확인이 목적)

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/identify',
      headers: { authorization: `Bearer ${token}` },
      payload: { s3_key: 'test/photo.jpg' },
    })

    // 이미지 없어서 422가 나와야 함 (429가 아님 = 한도 검사는 통과)
    expect(res.statusCode).toBe(422)
    expect(res.json().error.code).toBe('INVALID_IMAGE')
  })

  it('premium 유저는 횟수 초과해도 한도 검사 건너뜀 → 이미지 로드 단계로 진행', async () => {
    const userId = 'premium-user-uuid'
    const token = await createTestJwt(userId)

    // 0) AUTH: HS256 user lookup
    mockQuery.mockResolvedValueOnce(pgResult([{ user_id: userId }]))
    // 1) users 조회 → premium
    mockQuery.mockResolvedValueOnce(pgResult([mockUserRow({ user_id: userId, subscription_tier: 'premium' })]))
    // premium은 카운터 쿼리 실행 안 함 → 바로 이미지 로드 (422)

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/identify',
      headers: { authorization: `Bearer ${token}` },
      payload: { s3_key: 'test/photo.jpg' },
    })

    // 이미지 없어서 422 (한도 체크 쿼리가 호출되지 않았음)
    expect(res.statusCode).toBe(422)
    // mockQuery가 2번 호출됨 (auth 1번 + users 조회 1번, count 조회 없음)
    expect(mockQuery).toHaveBeenCalledTimes(2)
  })

  it('s3_key 없으면 400 반환', async () => {
    const token = await createTestJwt('user-uuid')
    mockQuery.mockResolvedValueOnce(pgResult([mockUserRow()]))

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/identify',
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    })

    expect(res.statusCode).toBe(400)
  })
})
