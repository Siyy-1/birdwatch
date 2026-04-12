import type { ClientConfig } from 'pg'

function isLocalHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1'
}

export function buildPgClientConfig(connectionString: string): ClientConfig {
  const url = new URL(connectionString)
  const sslMode = url.searchParams.get('sslmode')?.toLowerCase()

  if (sslMode === 'disable' || isLocalHostname(url.hostname)) {
    return { connectionString }
  }

  return {
    connectionString,
    // RDS requires TLS from ECS tasks; we skip CA pinning here because the
    // environment only provides a connection string, not the RDS CA bundle.
    ssl: { rejectUnauthorized: false },
  }
}
