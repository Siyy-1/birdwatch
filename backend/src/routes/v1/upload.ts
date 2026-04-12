/**
 * upload.ts — /api/v1/upload 라우터
 *
 * POST /api/v1/upload/presign
 *   - JWT 인증 필수
 *   - S3 PutObject Presigned URL 발급 (15분 유효)
 *   - 모바일이 업로드 전 1차 EXIF 제거 후 JPEG로 재인코딩
 *   - 서버는 AI 식별 직전 업로드 객체를 다시 sanitize해 2차 제거를 보장
 */
import type { FastifyPluginAsync } from 'fastify'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'node:crypto'
import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { env } from '../../config/env.js'

// ── S3 클라이언트 ─────────────────────────────────────────────────────────────

const s3 = new S3Client({ region: env.S3_REGION })

// ── 로컬 dev 임시 저장 경로 ───────────────────────────────────────────────────

const LOCAL_UPLOAD_DIR = '/tmp/birdwatch-uploads'

// ── 허용 Content-Type ─────────────────────────────────────────────────────────

const ALLOWED_CONTENT_TYPES = new Set([
  'image/jpeg',
])

const SAFE_S3_KEY_REGEX =
  /^photos\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|heic|heif|webp)$/

// ── 타입 ──────────────────────────────────────────────────────────────────────

interface PresignBody {
  content_type: string
}

interface PresignResponse {
  upload_url: string
  s3_key: string
  expires_in: number  // 초
}

// ── 라우터 ────────────────────────────────────────────────────────────────────

const uploadRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/v1/upload/presign
   *
   * Body:    { content_type: string }
   * Response: { upload_url: string, s3_key: string, expires_in: number }
   */
  fastify.post<{ Body: PresignBody }>(
    '/presign',
    {
      onRequest: [fastify.authenticate],
      schema: {
        tags: ['upload'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['content_type'],
          properties: {
            content_type: {
              type: 'string',
              enum: [...ALLOWED_CONTENT_TYPES],
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { content_type } = request.body
      const userId = request.user.userId

      if (!ALLOWED_CONTENT_TYPES.has(content_type)) {
        return reply.code(400).send({
          error: '지원하지 않는 이미지 형식입니다. 업로드는 JPEG만 허용됩니다.',
        })
      }

      const ext = content_type.split('/')[1].replace('jpeg', 'jpg')
      const s3Key = `photos/${userId}/${randomUUID()}.${ext}`
      const EXPIRES_IN = 900  // 15분

      // ── 개발 환경: 로컬 업로드 endpoint 사용 ─────────────────────────────
      if (env.NODE_ENV === 'development') {
        await mkdir(LOCAL_UPLOAD_DIR, { recursive: true })
        const uploadUrl = `http://localhost:3000/api/v1/upload/local`
        return reply.code(201).send({ data: { upload_url: uploadUrl, s3_key: s3Key, expires_in: EXPIRES_IN } })
      }

      const command = new PutObjectCommand({
        Bucket:      env.S3_BUCKET,
        Key:         s3Key,
        ContentType: content_type,
      })

      const uploadUrl = await getSignedUrl(s3, command, { expiresIn: EXPIRES_IN })

      return reply.code(201).send({ data: { upload_url: uploadUrl, s3_key: s3Key, expires_in: EXPIRES_IN } })
    },
  )

  // ── 개발 전용: 로컬 파일 POST 수신 (base64 JSON) ─────────────────────────────
  fastify.post<{ Body: { s3_key: string; data: string } }>(
    '/local',
    {
      onRequest: [fastify.authenticate],
      bodyLimit: 20 * 1024 * 1024,  // 20MB (base64 오버헤드 고려)
      schema: {
        tags: ['upload'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['s3_key', 'data'],
          properties: {
            s3_key: {
              type: 'string',
              pattern: SAFE_S3_KEY_REGEX.source,
            },
            data: {
              type: 'string',
              maxLength: 20971520,
            },
          },
        },
      },
    },
    async (request, reply) => {
      if (env.NODE_ENV !== 'development') return reply.code(404).send()

      const { s3_key, data } = request.body
      if (!SAFE_S3_KEY_REGEX.test(s3_key)) {
        return reply.code(400).send({ error: 'Invalid s3_key' })
      }

      const filename = s3_key.replace(/\//g, '_')
      const filePath = join(LOCAL_UPLOAD_DIR, filename)

      await mkdir(LOCAL_UPLOAD_DIR, { recursive: true })
      await writeFile(filePath, Buffer.from(data, 'base64'))

      return reply.code(200).send()
    },
  )
}

export default uploadRoutes
