import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  DATABASE_URL: z.string().url(),

  COGNITO_USER_POOL_ID: z.string().min(1),
  COGNITO_CLIENT_ID: z.string().min(1),
  COGNITO_REGION: z.string().default('ap-northeast-2'),

  S3_BUCKET: z.string().min(1),
  S3_REGION: z.string().default('ap-northeast-2'),
  CLOUDFRONT_DOMAIN: z.string().min(1),

  AI_INFERENCE_URL: z.string().url(),
  AI_MODEL_VERSION: z.string().default('v1.0.0'),
  AI_CONFIDENCE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.85),

  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),

  COGNITO_DOMAIN: z.string().url(),
  JWT_SECRET: z.string().min(32),
})

export type Env = z.infer<typeof envSchema>

function parseEnv(): Env {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n')
    throw new Error(`환경변수 검증 실패:\n${issues}`)
  }
  return result.data
}

export const env = parseEnv()
