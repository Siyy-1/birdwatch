import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import postgres from '@fastify/postgres'
import sensible from '@fastify/sensible'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'

import { env } from './config/env.js'
import { buildPgClientConfig } from './config/database.js'
import authPlugin from './plugins/auth.js'
import speciesRoutes from './routes/v1/species.js'
import sightingsRoutes from './routes/v1/sightings.js'
import usersRoutes from './routes/v1/users.js'
import aiRoutes from './routes/v1/ai.js'
import authRoutes from './routes/v1/auth.js'
import uploadRoutes from './routes/v1/upload.js'
import galleryRoutes from './routes/v1/gallery.js'

export async function buildApp() {
  const fastify = Fastify({
    logger: {
      level: env.LOG_LEVEL,
    },
  })

  // ---- 이미지 업로드용 raw body 파서 (dev 로컬 업로드) --------------------

  fastify.addContentTypeParser(
    ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp'],
    { parseAs: 'buffer' },
    (_req, body, done) => done(null, body),
  )

  // ---- sensible (httpErrors 등) -------------------------------------------

  await fastify.register(sensible)

  // ---- 보안 플러그인 -------------------------------------------------------

  await fastify.register(helmet, {
    contentSecurityPolicy: false,   // API 서버: CSP 불필요
  })

  await fastify.register(cors, {
    origin: env.NODE_ENV === 'production'
      ? ['https://birdwatch.kr', 'https://app.birdwatch.kr']
      : true,
    credentials: true,
  })

  await fastify.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
    errorResponseBuilder: () => ({
      error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
      code: 'RATE_LIMIT_EXCEEDED',
    }),
  })

  // ---- DB -----------------------------------------------------------------

  await fastify.register(postgres, {
    ...buildPgClientConfig(env.DATABASE_URL),
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  })

  // ---- API 문서 (개발 환경만) ---------------------------------------------

  if (env.NODE_ENV !== 'production') {
    await fastify.register(swagger, {
      openapi: {
        info: { title: 'BirdWatch API', version: '0.1.0' },
        components: {
          securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
          },
        },
      },
    })
    await fastify.register(swaggerUi, { routePrefix: '/docs' })
  }

  // ---- 인증 플러그인 -------------------------------------------------------

  await fastify.register(authPlugin)

  // ---- 라우터 --------------------------------------------------------------

  // Health check (인증 불필요)
  fastify.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: env.NODE_ENV,
  }))

  await fastify.register(speciesRoutes,  { prefix: '/api/v1/species' })
  await fastify.register(sightingsRoutes, { prefix: '/api/v1/sightings' })
  await fastify.register(usersRoutes,    { prefix: '/api/v1/users' })
  await fastify.register(aiRoutes,       { prefix: '/api/v1/ai' })
  await fastify.register(authRoutes,     { prefix: '/api/v1/auth' })
  await fastify.register(uploadRoutes,   { prefix: '/api/v1/upload' })
  await fastify.register(galleryRoutes,  { prefix: '/api/v1/gallery' })

  // ---- 에러 핸들러 ---------------------------------------------------------

  fastify.setErrorHandler((error, request, reply) => {
    const statusCode = error.statusCode ?? 500

    // 예측된 에러 (4xx): 로그 없이 반환
    if (statusCode < 500) {
      return reply.code(statusCode).send({ error: error.message })
    }

    // 서버 에러 (5xx): 로그 기록 후 일반 메시지 반환
    request.log.error(error)
    return reply.code(500).send({ error: '내부 서버 오류가 발생했습니다' })
  })

  return fastify
}
