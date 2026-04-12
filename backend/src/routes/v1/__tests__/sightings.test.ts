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

describe('POST /api/v1/sightings', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    vi.clearAllMocks()
    mockQuery.mockResolvedValue(pgResult([]))
    app = await buildApp()
    await app.ready()
  })

  afterEach(async () => {
    await app.close()
  })

  it('GPS 미동의 상태에서도 좌표 없이 저장할 수 있다', async () => {
    const userId = 'user-uuid'
    const token = await createTestJwt(userId)

    mockQuery.mockResolvedValueOnce(pgResult([{ user_id: userId }]))
    mockQuery.mockResolvedValueOnce(pgResult([{ gps_consent: false, ai_training_opt_in: false }]))
    mockQuery.mockResolvedValueOnce(pgResult([{ species_id: 'KR-001' }]))
    mockQuery.mockResolvedValueOnce(pgResult([{ exists: false }]))
    mockQuery.mockResolvedValueOnce(pgResult([{ points: 1 }]))
    mockQuery.mockResolvedValueOnce(pgResult([{ sighting_id: 'sighting-uuid', created_at: '2026-04-11T00:00:00Z' }]))
    mockQuery.mockResolvedValueOnce(pgResult([]))
    mockQuery.mockResolvedValueOnce(pgResult([]))

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/sightings',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        species_id: 'KR-001',
        photo_s3_key: 'photos/user-uuid/photo.jpg',
        exif_stripped: true,
        observed_at: '2026-04-11T09:00:00Z',
      },
    })

    expect(res.statusCode).toBe(201)
    expect(res.json().data.sighting_id).toBe('sighting-uuid')
  })

})
