import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { Client } from 'pg'

type Command = 'status' | 'up' | 'baseline' | 'doctor'

interface MigrationFile {
  name: string
  checksum: string
  upSql: string
}

interface AppliedMigration {
  migration_name: string
  checksum: string
  applied_at: Date
}

const MIGRATIONS_DIR = resolve(__dirname, '../../../db/migrations')
const MIGRATIONS_TABLE = 'schema_migrations'

async function loadDatabaseUrlFromEnvFile(): Promise<string | undefined> {
  const envFilePath = resolve(__dirname, '../../.env')

  try {
    const content = await readFile(envFilePath, 'utf8')
    const line = content
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith('DATABASE_URL='))

    if (!line) return undefined
    return line.slice('DATABASE_URL='.length)
  } catch {
    return undefined
  }
}

async function getDatabaseUrl(): Promise<string> {
  const databaseUrl = process.env.DATABASE_URL ?? await loadDatabaseUrlFromEnvFile()
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required')
  }
  return databaseUrl
}

function getCommand(): Command {
  const command = process.argv[2] ?? 'status'
  if (command === 'status' || command === 'up' || command === 'baseline' || command === 'doctor') {
    return command
  }
  throw new Error(`Unsupported command: ${command}`)
}

function getOption(name: string): string | undefined {
  const exactPrefix = `--${name}=`
  const exactMatch = process.argv.find((arg) => arg.startsWith(exactPrefix))
  if (exactMatch) return exactMatch.slice(exactPrefix.length)

  const optionIndex = process.argv.indexOf(`--${name}`)
  if (optionIndex >= 0) return process.argv[optionIndex + 1]

  return undefined
}

function extractUpSql(content: string, fileName: string): string {
  const upMarker = '-- UP'
  const downMarker = '-- DOWN'
  const upIndex = content.indexOf(upMarker)
  const downIndex = content.indexOf(downMarker)
  const upSql = upIndex === -1
    ? content.slice(0, downIndex === -1 ? undefined : downIndex).trim()
    : content
      .slice(upIndex + upMarker.length, downIndex === -1 ? undefined : downIndex)
      .trim()

  if (!upSql) {
    throw new Error(`${fileName}: empty -- UP section`)
  }

  return upSql
}

async function readMigrationFiles(): Promise<MigrationFile[]> {
  const entries = await readdir(MIGRATIONS_DIR, { withFileTypes: true })
  const sqlFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b))

  const migrations: MigrationFile[] = []

  for (const fileName of sqlFiles) {
    const fullPath = resolve(MIGRATIONS_DIR, fileName)
    const content = await readFile(fullPath, 'utf8')
    const upSql = extractUpSql(content, fileName)
    const checksum = createHash('sha256').update(content).digest('hex')
    migrations.push({ name: fileName, checksum, upSql })
  }

  return migrations
}

async function ensureMigrationsTable(client: Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      migration_name TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}

async function loadAppliedMigrations(client: Client): Promise<Map<string, AppliedMigration>> {
  const result = await client.query<AppliedMigration>(
    `SELECT migration_name, checksum, applied_at
     FROM ${MIGRATIONS_TABLE}
     ORDER BY migration_name ASC`,
  )

  return new Map(result.rows.map((row) => [row.migration_name, row]))
}

function findChangedMigrations(
  files: MigrationFile[],
  applied: Map<string, AppliedMigration>,
): MigrationFile[] {
  return files.filter((file) => {
    const appliedRow = applied.get(file.name)
    return appliedRow != null && appliedRow.checksum !== file.checksum
  })
}

async function printStatus(client: Client): Promise<void> {
  const files = await readMigrationFiles()
  const applied = await loadAppliedMigrations(client)
  const changed = new Set(findChangedMigrations(files, applied).map((file) => file.name))

  const rows = files.map((file) => {
    const appliedRow = applied.get(file.name)
    return {
      migration: file.name,
      status: changed.has(file.name)
        ? 'changed'
        : appliedRow
          ? 'applied'
          : 'pending',
      applied_at: appliedRow?.applied_at?.toISOString() ?? '',
    }
  })

  console.table(rows)

  const appliedCount = rows.filter((row) => row.status === 'applied').length
  const pendingCount = rows.filter((row) => row.status === 'pending').length
  const changedCount = rows.filter((row) => row.status === 'changed').length

  console.log(`Applied: ${appliedCount}`)
  console.log(`Pending: ${pendingCount}`)
  console.log(`Changed: ${changedCount}`)

  if (changedCount > 0) {
    process.exitCode = 1
  }
}

async function runMigrations(client: Client): Promise<void> {
  const files = await readMigrationFiles()
  const applied = await loadAppliedMigrations(client)
  const changed = findChangedMigrations(files, applied)

  if (changed.length > 0) {
    throw new Error(`Refusing to run because tracked migrations changed: ${changed.map((file) => file.name).join(', ')}`)
  }

  const pending = files.filter((file) => !applied.has(file.name))

  if (pending.length === 0) {
    console.log('No pending migrations.')
    return
  }

  for (const migration of pending) {
    console.log(`Applying ${migration.name} ...`)
    await client.query(migration.upSql)
    await client.query(
      `INSERT INTO ${MIGRATIONS_TABLE} (migration_name, checksum)
       VALUES ($1, $2)`,
      [migration.name, migration.checksum],
    )
  }

  console.log(`Applied ${pending.length} migration(s).`)
}

async function baselineMigrations(client: Client): Promise<void> {
  const through = getOption('through')
  if (!through) {
    throw new Error('baseline requires --through <migration-file>')
  }

  const files = await readMigrationFiles()
  const applied = await loadAppliedMigrations(client)
  const changed = findChangedMigrations(files, applied)

  if (changed.length > 0) {
    throw new Error(`Refusing to baseline because tracked migrations changed: ${changed.map((file) => file.name).join(', ')}`)
  }

  const throughIndex = files.findIndex((file) => file.name === through)
  if (throughIndex === -1) {
    throw new Error(`Unknown migration: ${through}`)
  }

  const baselineTargets = files
    .slice(0, throughIndex + 1)
    .filter((file) => !applied.has(file.name))

  if (baselineTargets.length === 0) {
    console.log('Nothing to baseline.')
    return
  }

  for (const migration of baselineTargets) {
    console.log(`Baselining ${migration.name} ...`)
    await client.query(
      `INSERT INTO ${MIGRATIONS_TABLE} (migration_name, checksum)
       VALUES ($1, $2)
       ON CONFLICT (migration_name) DO NOTHING`,
      [migration.name, migration.checksum],
    )
  }

  console.log(`Baselined ${baselineTargets.length} migration(s) through ${through}.`)
}

async function runDoctor(client: Client): Promise<void> {
  const tablesResult = await client.query<{
    species: string | null
    users: string | null
    sightings: string | null
    gallery_posts: string | null
    gallery_hearts: string | null
    ai_feedback: string | null
    schema_migrations: string | null
  }>(`
    SELECT
      to_regclass('public.species') AS species,
      to_regclass('public.users') AS users,
      to_regclass('public.sightings') AS sightings,
      to_regclass('public.gallery_posts') AS gallery_posts,
      to_regclass('public.gallery_hearts') AS gallery_hearts,
      to_regclass('public.ai_feedback') AS ai_feedback,
      to_regclass('public.${MIGRATIONS_TABLE}') AS schema_migrations
  `)

  const columnsResult = await client.query<{
    table_name: string
    column_name: string
    is_nullable: string
  }>(`
    SELECT table_name, column_name, is_nullable
    FROM information_schema.columns
    WHERE (table_name = 'users' AND column_name IN (
      'terms_agreed_at',
      'privacy_agreed_at',
      'ai_training_opt_in',
      'ai_training_opt_in_at'
    ))
       OR (table_name = 'sightings' AND column_name = 'location')
    ORDER BY table_name, column_name
  `)

  const trackedResult = await client.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM ${MIGRATIONS_TABLE}`,
  ).catch(() => ({ rows: [{ count: '0' }] }))

  console.log(JSON.stringify({
    tables: tablesResult.rows[0],
    columns: columnsResult.rows,
    tracked_migrations: Number.parseInt(trackedResult.rows[0].count, 10),
  }, null, 2))
}

async function main(): Promise<void> {
  const client = new Client({ connectionString: await getDatabaseUrl() })
  const command = getCommand()

  await client.connect()

  try {
    await ensureMigrationsTable(client)

    if (command === 'status') {
      await printStatus(client)
      return
    }

    if (command === 'doctor') {
      await runDoctor(client)
      return
    }

    if (command === 'baseline') {
      await baselineMigrations(client)
      return
    }

    await runMigrations(client)
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
