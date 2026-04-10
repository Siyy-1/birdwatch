/**
 * db.ts — SQLite 로컬 캐시
 * - species: 전체 300종 오프라인 캐시
 * - user_profile: 내 프로필 캐시
 */
import * as SQLite from 'expo-sqlite'
import type { Species, User } from '../../types/api'

const DB_NAME = 'birdwatch.db'
const SCHEMA_VERSION = 1

let _db: SQLite.SQLiteDatabase | null = null

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db
  _db = await SQLite.openDatabaseAsync(DB_NAME)
  await migrate(_db)
  return _db
}

// ---------------------------------------------------------------------------
// 마이그레이션
// ---------------------------------------------------------------------------

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`PRAGMA journal_mode = WAL;`)

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER NOT NULL PRIMARY KEY
    );

    CREATE TABLE IF NOT EXISTS species (
      species_id        TEXT PRIMARY KEY,
      name_ko           TEXT NOT NULL,
      name_sci          TEXT,
      name_en           TEXT,
      rarity_tier       TEXT NOT NULL,
      sensitivity_tier  INTEGER NOT NULL,
      points            INTEGER NOT NULL DEFAULT 0,
      is_locked_free    INTEGER NOT NULL DEFAULT 0,
      cultural_heritage_no TEXT,
      iucn_status       TEXT,
      size_cm           REAL,
      habitat_ko        TEXT,
      seasonal_presence TEXT,    -- JSON string
      fun_fact_ko       TEXT,
      cached_at         INTEGER  -- UNIX timestamp
    );

    CREATE TABLE IF NOT EXISTS collected_species (
      species_id  TEXT PRIMARY KEY REFERENCES species(species_id),
      first_seen  TEXT NOT NULL   -- ISO 8601
    );

    CREATE TABLE IF NOT EXISTS user_profile (
      user_id           TEXT PRIMARY KEY,
      nickname          TEXT NOT NULL,
      profile_image_key TEXT,
      gps_consent       INTEGER NOT NULL DEFAULT 0,
      total_points      INTEGER NOT NULL DEFAULT 0,
      streak_days       INTEGER NOT NULL DEFAULT 0,
      species_count     INTEGER NOT NULL DEFAULT 0,
      subscription_tier TEXT NOT NULL DEFAULT 'free',
      cached_at         INTEGER
    );
  `)

  const versionRow = await db.getFirstAsync<{ version: number }>(
    'SELECT version FROM schema_version ORDER BY version DESC LIMIT 1',
  )
  if (!versionRow) {
    await db.runAsync('INSERT INTO schema_version (version) VALUES (?)', [SCHEMA_VERSION])
  }
}

// ---------------------------------------------------------------------------
// Species 캐시
// ---------------------------------------------------------------------------

export async function upsertSpecies(db: SQLite.SQLiteDatabase, species: Species[]): Promise<void> {
  const now = Math.floor(Date.now() / 1000)
  await db.withTransactionAsync(async () => {
    for (const s of species) {
      await db.runAsync(
        `INSERT OR REPLACE INTO species
           (species_id, name_ko, name_sci, name_en, rarity_tier, sensitivity_tier,
            points, is_locked_free, cultural_heritage_no, iucn_status,
            size_cm, habitat_ko, seasonal_presence, fun_fact_ko, cached_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          s.species_id, s.name_ko, s.name_sci ?? null, s.name_en ?? null,
          s.rarity_tier, s.sensitivity_tier, s.points,
          s.is_locked_free ? 1 : 0,
          s.cultural_heritage_no ?? null, s.iucn_status ?? null,
          s.size_cm ?? null, s.habitat_ko ?? null,
          s.seasonal_presence ? JSON.stringify(s.seasonal_presence) : null,
          s.fun_fact_ko ?? null, now,
        ],
      )
    }
  })
}

export async function getSpecies(db: SQLite.SQLiteDatabase, speciesId: string): Promise<Species | null> {
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM species WHERE species_id = ?',
    [speciesId],
  )
  return row ? rowToSpecies(row) : null
}

export async function searchSpecies(
  db: SQLite.SQLiteDatabase,
  query: string,
  limit = 20,
): Promise<Species[]> {
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM species
       WHERE name_ko LIKE ? OR name_sci LIKE ?
       ORDER BY species_id
       LIMIT ?`,
    [`%${query}%`, `%${query}%`, limit],
  )
  return rows.map(rowToSpecies)
}

export async function getCollectedSpeciesIds(db: SQLite.SQLiteDatabase): Promise<Set<string>> {
  const rows = await db.getAllAsync<{ species_id: string }>('SELECT species_id FROM collected_species')
  return new Set(rows.map((r) => r.species_id))
}

export async function markSpeciesCollected(
  db: SQLite.SQLiteDatabase,
  speciesId: string,
  firstSeen: string,
): Promise<void> {
  await db.runAsync(
    'INSERT OR IGNORE INTO collected_species (species_id, first_seen) VALUES (?, ?)',
    [speciesId, firstSeen],
  )
}

// ---------------------------------------------------------------------------
// User Profile 캐시
// ---------------------------------------------------------------------------

export async function upsertUserProfile(db: SQLite.SQLiteDatabase, user: User): Promise<void> {
  const now = Math.floor(Date.now() / 1000)
  await db.runAsync(
    `INSERT OR REPLACE INTO user_profile
       (user_id, nickname, profile_image_key, gps_consent,
        total_points, streak_days, species_count, subscription_tier, cached_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      user.user_id, user.nickname, user.profile_image_key ?? null,
      user.gps_consent ? 1 : 0,
      user.total_points, user.streak_days, user.species_count,
      user.subscription_tier, now,
    ],
  )
}

export async function getCachedUserProfile(
  db: SQLite.SQLiteDatabase,
): Promise<Pick<User, 'user_id' | 'nickname' | 'gps_consent' | 'total_points' | 'streak_days' | 'species_count'> | null> {
  return db.getFirstAsync(
    'SELECT user_id, nickname, gps_consent, total_points, streak_days, species_count FROM user_profile LIMIT 1',
  )
}

// ---------------------------------------------------------------------------
// 내부 유틸
// ---------------------------------------------------------------------------

function rowToSpecies(row: Record<string, unknown>): Species {
  return {
    species_id:          row.species_id as string,
    name_ko:             row.name_ko as string,
    name_sci:            (row.name_sci as string) ?? null,
    name_en:             (row.name_en as string) ?? null,
    rarity_tier:         row.rarity_tier as Species['rarity_tier'],
    sensitivity_tier:    row.sensitivity_tier as Species['sensitivity_tier'],
    points:              row.points as number,
    is_locked_free:      Boolean(row.is_locked_free),
    cultural_heritage_no: (row.cultural_heritage_no as string) ?? null,
    iucn_status:         (row.iucn_status as string) ?? null,
    size_cm:             (row.size_cm as number) ?? null,
    habitat_ko:          (row.habitat_ko as string) ?? null,
    seasonal_presence:   row.seasonal_presence ? JSON.parse(row.seasonal_presence as string) : null,
    fun_fact_ko:         (row.fun_fact_ko as string) ?? null,
  }
}
