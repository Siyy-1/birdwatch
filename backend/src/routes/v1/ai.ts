/**
 * ai.ts — /api/v1/ai 라우터
 *
 * POST /api/v1/ai/identify
 *   - JWT 인증 필수
 *   - S3에서 이미지 다운로드 → TF Serving 추론 요청
 *   - DB에서 top-3 species 정보 조회 → AiIdentifyResult 형태로 응답
 *   - free 사용자: 일일 AI 식별 10회 제한 (DB 기반 카운터)
 *   - premium 사용자: 무제한
 */
import type { FastifyPluginAsync } from 'fastify'
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { readFile, writeFile } from 'node:fs/promises'
import { env } from '../../config/env.js'
import {
  LOCAL_UPLOAD_DIR,
  getLocalUploadFilePath,
  markLocalUploadSanitized,
  stripJpegMetadata,
} from '../../services/media/serverImageSanitizer.js'

// ── S3 클라이언트 (모듈 로드 시 1회 생성) ────────────────────────────────────

const s3 = new S3Client({ region: env.S3_REGION })
const SERVER_SANITIZED_METADATA_KEY = 'server_sanitized'

// ── 일일 AI 식별 한도 ─────────────────────────────────────────────────────────

const FREE_DAILY_LIMIT = 10

// ── 타입 ──────────────────────────────────────────────────────────────────────

interface IdentifyBody {
  s3_key: string
}

/** 라우트 내부 표준화 응답 */
interface ServingPrediction {
  species_id: string
  confidence: number
}

interface ServingResponse {
  predictions: ServingPrediction[]
  model_version: string
  inference_ms: number
}

interface TfServingResponse {
  predictions?: unknown
}

/** DB species 행 */
interface SpeciesRow {
  species_id: string
  name_ko: string
  name_sci: string
  name_en: string
  rarity_tier: string
  sensitivity_tier: string
  points: number
  is_locked_free: boolean
}

// ── S3 이미지 다운로드 ────────────────────────────────────────────────────────

async function downloadFromS3(s3Key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: s3Key,
  })

  const response = await s3.send(command)
  if (!response.Body) {
    throw new Error('S3 응답 Body가 비어있습니다')
  }

  // AWS SDK v3: Body는 Readable 스트림
  const chunks: Buffer[] = []
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

async function persistServerSanitizedImage(
  s3Key: string,
  imageBuffer: Buffer,
): Promise<void> {
  if (env.NODE_ENV === 'development') {
    await writeFile(getLocalUploadFilePath(s3Key), imageBuffer)
    await markLocalUploadSanitized(s3Key)
    return
  }

  await s3.send(new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: s3Key,
    Body: imageBuffer,
    ContentType: 'image/jpeg',
    Metadata: {
      [SERVER_SANITIZED_METADATA_KEY]: 'true',
    },
  }))
}

async function ensureServerSideSanitizedCopy(
  s3Key: string,
  imageBuffer: Buffer,
): Promise<Buffer> {
  const { sanitizedBuffer } = stripJpegMetadata(imageBuffer)
  await persistServerSanitizedImage(s3Key, sanitizedBuffer)
  return sanitizedBuffer
}

// ── Python TF Serving 래퍼 호출 ───────────────────────────────────────────────
// 래퍼는 { image_base64, top_k } → { predictions: [{species_id, confidence}], model_version, inference_ms }
// 전처리(리사이즈, 정규화, INT8 양자화)는 Python 래퍼가 담당

async function callServingWrapper(imageBuffer: Buffer): Promise<ServingResponse> {
  const imageBase64 = imageBuffer.toString('base64')

  const response = await fetch(`${env.AI_INFERENCE_URL}/predict/json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_base64: imageBase64, top_k: 3 }),
    signal: AbortSignal.timeout(10_000),  // 10초 타임아웃
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '(응답 없음)')
    throw new Error(`TF Serving 래퍼 오류 ${response.status}: ${text}`)
  }

  return response.json() as Promise<ServingResponse>
}

// ── 일일 AI 식별 카운터 (DB 기반) ─────────────────────────────────────────────
//
// users 테이블에 ai_identifications_today, ai_identifications_date 컬럼이 있다고 가정.
// 컬럼이 없으면 ai_identifications 별도 테이블로 COUNT 집계한다.
//
// 두 경우 모두 지원하기 위해 COUNT 집계 방식으로 구현:
//   SELECT COUNT(*) FROM ai_identification_logs
//   WHERE user_id = $1 AND created_at::date = CURRENT_DATE

interface DailyCountRow {
  count: string
}

interface UserTierRow {
  subscription_tier: string
}

// ── 라우터 ────────────────────────────────────────────────────────────────────

const aiRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/v1/ai/identify
   *
   * Body: { s3_key: string }
   * Response: AiIdentifyResult
   */
  fastify.post<{ Body: IdentifyBody }>(
    '/identify',
    {
      onRequest: [fastify.authenticate],
      schema: {
        tags: ['ai'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['s3_key'],
          properties: {
            s3_key: { type: 'string', minLength: 1, maxLength: 500 },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = request.user.userId
      const { s3_key } = request.body

      // ── 1. 구독 티어 조회 ────────────────────────────────────────────────
      const userResult = await fastify.pg.query<UserTierRow>(
        `SELECT subscription_tier
           FROM users
           WHERE user_id = $1 AND deleted_at IS NULL`,
        [userId],
      )

      if (userResult.rowCount === 0) {
        return reply.code(401).send({ error: '사용자를 찾을 수 없습니다' })
      }

      const subscriptionTier = userResult.rows[0].subscription_tier
      const isFree = subscriptionTier === 'free' || subscriptionTier == null

      // ── 2. 일일 한도 확인 (free 사용자만) ───────────────────────────────
      if (isFree) {
        const countResult = await fastify.pg.query<DailyCountRow>(
          `SELECT COUNT(*) AS count
             FROM ai_identification_logs
              WHERE user_id = $1
                AND (created_at AT TIME ZONE 'Asia/Seoul')::date
                  = (NOW() AT TIME ZONE 'Asia/Seoul')::date`,
          [userId],
        )
        const todayCount = parseInt(countResult.rows[0].count, 10)

        if (todayCount >= FREE_DAILY_LIMIT) {
          return reply.code(429).send({
            error: `무료 사용자는 하루에 ${FREE_DAILY_LIMIT}회까지 AI 식별을 사용할 수 있습니다`,
            code: 'AI_DAILY_LIMIT_EXCEEDED',
            limit: FREE_DAILY_LIMIT,
            used: todayCount,
          })
        }
      }

      // ── 3. 이미지 로드 (dev: 로컬 파일, prod: S3) ───────────────────────
      let imageBuffer: Buffer
      try {
        if (env.NODE_ENV === 'development') {
          imageBuffer = await readFile(getLocalUploadFilePath(s3_key))
        } else {
          imageBuffer = await downloadFromS3(s3_key)
        }

        imageBuffer = await ensureServerSideSanitizedCopy(s3_key, imageBuffer)
      } catch (err) {
        request.log.error(err, '이미지 로드 실패')
        return reply.code(422).send({
          error: {
            code: 'INVALID_IMAGE',
            message: '사진을 처리할 수 없어요. 다시 찍어보세요.',
          },
        })
      }

      // ── 4. TF Serving 추론 호출 ─────────────────────────────────────────
      let serving: ServingResponse
      try {
        serving = await callServingWrapper(imageBuffer)
      } catch (err) {
        request.log.error(
          {
            err,
            tf_serving_url: process.env.TF_SERVING_URL ?? env.AI_INFERENCE_URL,
          },
          'TF Serving 추론 실패',
        )

        if (env.NODE_ENV === 'development' || process.env.USE_AI_MOCK === 'true') {
          request.log.warn(
            {
              tf_serving_url: process.env.TF_SERVING_URL ?? env.AI_INFERENCE_URL,
            },
            'TF Serving 실패로 mock 응답 사용',
          )
          serving = {
            predictions: [
              { species_id: 'KR-050', confidence: 0.91 },
              { species_id: 'KR-051', confidence: 0.06 },
              { species_id: 'KR-052', confidence: 0.03 },
            ],
            model_version: 'v1.0.0-mock',
            inference_ms: 42,
          }
        } else {
          return reply.code(503).send({
            error: {
              code: 'AI_SERVICE_UNAVAILABLE',
              message: 'AI 식별 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
            },
          })
        }
      }

      if (!serving.predictions || serving.predictions.length === 0) {
        return reply.code(422).send({
          error: {
            code: 'INVALID_IMAGE',
            message: '사진을 처리할 수 없어요. 다시 찍어보세요.',
          },
        })
      }

      // ── 5. top-3 species_id 목록 추출 ────────────────────────────────────
      const top3Predictions = serving.predictions.slice(0, 3)
      const top1Prediction  = top3Predictions[0]
      const speciesIds      = top3Predictions.map((p) => p.species_id)

      // ── 6. DB에서 species 정보 일괄 조회 ─────────────────────────────────
      const speciesResult = await fastify.pg.query<SpeciesRow>(
        `SELECT species_id, name_ko, name_sci, name_en,
                rarity_tier, sensitivity_tier, points, is_locked_free
           FROM species
           WHERE species_id = ANY($1::text[])`,
        [speciesIds],
      )

      const speciesMap = new Map<string, SpeciesRow>(
        speciesResult.rows.map((row) => [row.species_id, row]),
      )

      // top1 종이 DB에 없으면 에러 (레이블 맵 정합성 문제)
      const top1Species = speciesMap.get(top1Prediction.species_id)
      if (!top1Species) {
        request.log.warn(
          { species_id: top1Prediction.species_id },
          'top1 species_id가 DB에 없음 — 레이블 맵 불일치',
        )
        return reply.code(422).send({
          error: {
            code: 'INVALID_IMAGE',
            message: '사진을 처리할 수 없어요. 다시 찍어보세요.',
          },
        })
      }

      // ── 7. 일일 카운터 로그 기록 (비동기, 실패해도 응답 성공) ───────────
      fastify.pg
        .query(
          `INSERT INTO ai_identification_logs (user_id, s3_key, species_id, confidence, model_version)
             VALUES ($1, $2, $3, $4, $5)`,
          [
            userId,
            s3_key,
            top1Prediction.species_id,
            top1Prediction.confidence,
            serving.model_version,
          ],
        )
        .catch((err: unknown) =>
          fastify.log.error(err, 'AI 식별 로그 기록 실패'),
        )

      // ── 8. 응답 조립 (AiIdentifyResult 형태) ─────────────────────────────
      const top3 = top3Predictions
        .map((p) => {
          const species = speciesMap.get(p.species_id)
          if (!species) return null
          return {
            species: {
              species_id: species.species_id,
              name_ko:    species.name_ko,
              name_sci:   species.name_sci,
              name_en:    species.name_en,
              rarity_tier: species.rarity_tier,
              points:     species.points,
            },
            confidence: p.confidence,
          }
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)

      return reply.send({
        data: {
          species_id: top1Species.species_id,
          species: {
            species_id:      top1Species.species_id,
            name_ko:         top1Species.name_ko,
            name_sci:        top1Species.name_sci,
            name_en:         top1Species.name_en,
            rarity_tier:     top1Species.rarity_tier,
            sensitivity_tier: top1Species.sensitivity_tier,
            points:          top1Species.points,
            is_locked_free:  top1Species.is_locked_free,
          },
          confidence:    top1Prediction.confidence,
          top3,
          model_version: serving.model_version,
          inference_ms:  serving.inference_ms,
        },
      })
    },
  )
}

export default aiRoutes
