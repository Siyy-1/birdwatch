import { buildApp } from './app.js'
import { env } from './config/env.js'

async function main() {
  const app = await buildApp()

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' })
    app.log.info(`BirdWatch API 서버 시작: http://0.0.0.0:${env.PORT}`)
    if (env.NODE_ENV !== 'production') {
      app.log.info(`Swagger UI: http://localhost:${env.PORT}/docs`)
    }
  } catch (err) {
    app.log.fatal(err, '서버 시작 실패')
    process.exit(1)
  }
}

main()
