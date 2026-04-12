import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createTestJwt, pgResult } from '../../../__tests__/helpers.js'

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

describe('POST /api/v1/users/me/onboarding', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    vi.clearAllMocks()
    app = await buildApp()
    await app.ready()
  })

  afterEach(async () => {
    await app.close()
  })

  it('필수 동의를 완료 시각으로 기록한다', async () => {
    const userId = 'user-uuid'
    const token = await createTestJwt(userId)

    mockQuery.mockResolvedValueOnce(pgResult([{ user_id: userId }]))
    mockQuery.mockResolvedValueOnce(pgResult([{
      user_id: userId,
      terms_agreed_at: '2026-04-11T00:00:00Z',
      privacy_agreed_at: '2026-04-11T00:00:00Z',
      marketing_agreed_at: null,
      gps_consent: false,
      gps_consent_at: null,
      ai_training_opt_in: true,
      ai_training_opt_in_at: '2026-04-11T00:00:00Z',
    }]))

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/users/me/onboarding',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        terms_agreed: true,
        privacy_agreed: true,
        marketing_agreed: false,
        gps_consent: false,
        ai_training_opt_in: true,
      },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().data.terms_agreed_at).toBeTruthy()
    expect(res.json().data.privacy_agreed_at).toBeTruthy()
    expect(res.json().data.ai_training_opt_in).toBe(true)
  })
})
