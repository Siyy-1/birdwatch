import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { pgResult, createTestJwt } from '../../../__tests__/helpers.js'

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

// sightings를 auth 테스트용 보호 엔드포인트로 사용
const PROTECTED = '/api/v1/sightings'

describe('authenticate 미들웨어', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    vi.clearAllMocks()
    app = await buildApp()
    await app.ready()
  })

  afterEach(async () => {
    await app.close()
  })

  it('Authorization 헤더 없으면 401', async () => {
    const res = await app.inject({ method: 'GET', url: PROTECTED })
    expect(res.statusCode).toBe(401)
  })

  it('Bearer 형식이 아니면 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: PROTECTED,
      headers: { authorization: 'Basic dXNlcjpwYXNz' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('서명이 잘못된 토큰이면 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: PROTECTED,
      headers: { authorization: 'Bearer invalid.token.here' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('유효한 HS256 토큰 + DB에 유저 있으면 통과 (200 or 빈 목록)', async () => {
    const userId = 'valid-user-uuid'
    const token = await createTestJwt(userId)

    // auth: user_id 조회 성공
    mockQuery.mockResolvedValueOnce(pgResult([{ user_id: userId }]))
    // sightings list 쿼리
    mockQuery.mockResolvedValueOnce(pgResult([]))
    // count 쿼리
    mockQuery.mockResolvedValueOnce(pgResult([{ total: '0' }]))

    const res = await app.inject({
      method: 'GET',
      url: PROTECTED,
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(200)
  })

  it('유효한 토큰이지만 DB에 유저 없으면 401', async () => {
    const token = await createTestJwt('ghost-user-uuid')
    // auth: user_id 조회 → 없음
    mockQuery.mockResolvedValueOnce(pgResult([], 0))

    const res = await app.inject({
      method: 'GET',
      url: PROTECTED,
      headers: { authorization: `Bearer ${token}` },
    })

    expect(res.statusCode).toBe(401)
  })
})
