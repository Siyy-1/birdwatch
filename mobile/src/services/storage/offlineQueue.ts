/**
 * offlineQueue.ts — 오프라인 목격 큐
 * 네트워크 없을 때 SQLite에 저장 → 온라인 복구 시 자동 동기화
 */
import * as SQLite from 'expo-sqlite'
import * as Network from 'expo-network'
import { getDb } from './db'
import { sightingsApi } from '../api'

export interface QueuedSighting {
  species_id: string
  lat: number | null
  lng: number | null
  location_accuracy_m?: number
  altitude_m?: number
  photo_s3_key: string
  thumbnail_s3_key?: string
  exif_stripped: boolean
  ai_species_id?: string
  ai_confidence?: number
  ai_top3?: Array<{ species_id: string; confidence: number }>
  ai_model_version?: string
  ai_inference_ms?: number
  observed_at: string
}

type QueueStatus = 'pending' | 'syncing' | 'failed'

interface QueueRow {
  id: number
  payload: string      // JSON
  status: QueueStatus
  retry_count: number
  created_at: number
  last_error: string | null
}

const MAX_RETRIES = 3

// ---------------------------------------------------------------------------
// 초기화
// ---------------------------------------------------------------------------

export async function initQueue(): Promise<void> {
  const db = await getDb()
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sighting_queue (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      payload     TEXT    NOT NULL,       -- JSON: QueuedSighting
      status      TEXT    NOT NULL DEFAULT 'pending',
      retry_count INTEGER NOT NULL DEFAULT 0,
      created_at  INTEGER NOT NULL,
      last_error  TEXT
    );
  `)
}

// ---------------------------------------------------------------------------
// 큐에 추가
// ---------------------------------------------------------------------------

export async function enqueue(sighting: QueuedSighting): Promise<void> {
  const db = await getDb()
  await db.runAsync(
    `INSERT INTO sighting_queue (payload, status, created_at)
     VALUES (?, 'pending', ?)`,
    [JSON.stringify(sighting), Math.floor(Date.now() / 1000)],
  )
}

// ---------------------------------------------------------------------------
// 동기화 (온라인 복구 시 호출)
// ---------------------------------------------------------------------------

export async function flushQueue(): Promise<{ synced: number; failed: number }> {
  const network = await Network.getNetworkStateAsync()
  if (!network.isConnected || !network.isInternetReachable) {
    return { synced: 0, failed: 0 }
  }

  const db = await getDb()
  const rows = await db.getAllAsync<QueueRow>(
    `SELECT * FROM sighting_queue
       WHERE status IN ('pending', 'failed') AND retry_count < ?
       ORDER BY created_at ASC`,
    [MAX_RETRIES],
  )

  let synced = 0
  let failed = 0

  for (const row of rows) {
    await db.runAsync(
      "UPDATE sighting_queue SET status = 'syncing' WHERE id = ?",
      [row.id],
    )

    try {
      const payload: QueuedSighting = JSON.parse(row.payload)
      await sightingsApi.create(payload)

      await db.runAsync('DELETE FROM sighting_queue WHERE id = ?', [row.id])
      synced++
    } catch (err) {
      const newRetry = row.retry_count + 1
      const status: QueueStatus = newRetry >= MAX_RETRIES ? 'failed' : 'pending'
      await db.runAsync(
        `UPDATE sighting_queue
           SET status = ?, retry_count = ?, last_error = ?
           WHERE id = ?`,
        [status, newRetry, String(err), row.id],
      )
      failed++
    }
  }

  return { synced, failed }
}

// ---------------------------------------------------------------------------
// 대기 중 건수
// ---------------------------------------------------------------------------

export async function getPendingCount(): Promise<number> {
  const db = await getDb()
  const row = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM sighting_queue WHERE status IN ('pending', 'failed')",
  )
  return row?.count ?? 0
}

export async function clearFailedQueue(): Promise<void> {
  const db = await getDb()
  await db.runAsync("DELETE FROM sighting_queue WHERE status = 'failed'")
}
