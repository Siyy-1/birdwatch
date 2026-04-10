import { vi } from 'vitest'
import { SignJWT } from 'jose'

/** 테스트용 HS256 JWT 생성 — auth 플러그인의 2차 검증(jose)을 통과 */
export async function createTestJwt(userId: string, cognitoSub = 'test-cognito-sub'): Promise<string> {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET)
  return new SignJWT({ sub: userId, cognitoSub })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret)
}

/** pg 결과 빌더 */
export const pgResult = (rows: Record<string, unknown>[], rowCount?: number) => ({
  rows,
  rowCount: rowCount ?? rows.length,
})

/** 자주 쓰는 mock user row */
export const mockUserRow = (override: Record<string, unknown> = {}) => ({
  user_id: 'user-uuid-test',
  subscription_tier: 'free',
  ...override,
})
