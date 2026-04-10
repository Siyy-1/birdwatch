import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/server.ts', 'src/**/*.d.ts'],
    },
    env: {
      NODE_ENV: 'test',
      PORT: '3999',
      LOG_LEVEL: 'error',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      JWT_SECRET: 'test_jwt_secret_32chars_minimum!!',
      COGNITO_USER_POOL_ID: 'ap-northeast-2_TEST',
      COGNITO_CLIENT_ID: 'test_client_id',
      COGNITO_REGION: 'ap-northeast-2',
      COGNITO_DOMAIN: 'https://test.auth.ap-northeast-2.amazoncognito.com',
      S3_BUCKET: 'test-bucket',
      S3_REGION: 'ap-northeast-2',
      CLOUDFRONT_DOMAIN: 'test.cloudfront.net',
      AI_INFERENCE_URL: 'http://localhost:8001',
      AI_MODEL_VERSION: 'v1.0.0-test',
      AI_CONFIDENCE_THRESHOLD: '0.85',
      RATE_LIMIT_MAX: '1000',
      RATE_LIMIT_WINDOW_MS: '60000',
    },
  },
})
