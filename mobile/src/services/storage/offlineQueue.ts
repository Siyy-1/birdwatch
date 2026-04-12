/**
 * offlineQueue.ts — 오프라인 목격 큐
 * 네트워크 없을 때 SQLite에 저장 → 온라인 복구 후 사용자 승인 시 동기화
 */
import * as FileSystem from 'expo-file-system'
import * as Network from 'expo-network'
import { getDb } from './db'
import { sightingsApi } from '../api'
import { identifyPhotoByS3Key, uploadPhotoAsset } from '../media/photoPipeline'
import type { AiIdentifyResult, CreateSightingRequest } from '../../types/api'

export interface QueuedSightingSave {
  kind: 'save_sighting'
  sighting: CreateSightingRequest
}

export interface QueuedPhotoIdentification {
  kind: 'identify_and_review'
  local_photo_uri: string
  lat: number | null
  lng: number | null
  location_accuracy_m?: number
  altitude_m?: number
  observed_at: string
}

export interface QueuedReviewBeforeSave {
  kind: 'review_before_save'
  local_photo_uri: string
  photo_s3_key: string
  lat: number | null
  lng: number | null
  location_accuracy_m?: number
  altitude_m?: number
  observed_at: string
  ai_result: AiIdentifyResult
}

export type QueuePayload = QueuedSightingSave | QueuedPhotoIdentification | QueuedReviewBeforeSave

export interface LegacyQueuedSighting {
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

type QueueStatus = 'pending' | 'syncing' | 'failed' | 'review'

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

export async function enqueuePendingSighting(sighting: CreateSightingRequest): Promise<void> {
  const payload: QueuedSightingSave = {
    kind: 'save_sighting',
    sighting,
  }
  await enqueuePayload(payload)
}

export async function enqueuePendingPhoto(photo: QueuedPhotoIdentification): Promise<void> {
  await enqueuePayload(photo)
}

async function enqueuePayload(payload: QueuePayload): Promise<void> {
  const db = await getDb()
  const existingRows = await db.getAllAsync<Pick<QueueRow, 'payload'>>(
    "SELECT payload FROM sighting_queue WHERE status IN ('pending', 'failed', 'syncing', 'review')",
  )

  const isDuplicate = existingRows.some((row) => {
    const existingPayload = parseQueuePayload(row.payload)
    return isSameQueuePayload(existingPayload, payload)
  })

  if (isDuplicate) {
    return
  }

  await db.runAsync(
    `INSERT INTO sighting_queue (payload, status, created_at)
     VALUES (?, 'pending', ?)`,
    [JSON.stringify(payload), Math.floor(Date.now() / 1000)],
  )
}

// ---------------------------------------------------------------------------
// 동기화 (사용자 승인 후 호출)
// ---------------------------------------------------------------------------

export async function flushQueue(): Promise<{ synced: number; failed: number; review_ready: number }> {
  const network = await Network.getNetworkStateAsync()
  if (!network.isConnected || !network.isInternetReachable) {
    return { synced: 0, failed: 0, review_ready: 0 }
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
  let reviewReady = 0

  for (const row of rows) {
    await db.runAsync(
      "UPDATE sighting_queue SET status = 'syncing' WHERE id = ?",
      [row.id],
    )

    try {
      const payload = parseQueuePayload(row.payload)
      const result = await processQueuePayload(payload)

      if (result.kind === 'saved') {
        await db.runAsync('DELETE FROM sighting_queue WHERE id = ?', [row.id])
        synced++
      } else {
        await db.runAsync(
          `UPDATE sighting_queue
             SET payload = ?, status = 'review', retry_count = 0, last_error = NULL
           WHERE id = ?`,
          [JSON.stringify(result.payload), row.id],
        )
        reviewReady++
      }
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

  return { synced, failed, review_ready: reviewReady }
}

function parseQueuePayload(payload: string): QueuePayload {
  const parsed = JSON.parse(payload) as QueuePayload | LegacyQueuedSighting

  if ('kind' in parsed) {
    return parsed
  }

  return {
    kind: 'save_sighting',
    sighting: parsed,
  }
}

function isSameQueuePayload(left: QueuePayload, right: QueuePayload): boolean {
  if (left.kind !== right.kind) {
    return false
  }

  if (left.kind === 'identify_and_review' && right.kind === 'identify_and_review') {
    return (
      left.local_photo_uri === right.local_photo_uri &&
      left.observed_at === right.observed_at
    )
  }

  if (left.kind === 'review_before_save' && right.kind === 'review_before_save') {
    return (
      left.photo_s3_key === right.photo_s3_key &&
      left.observed_at === right.observed_at
    )
  }

  if (left.kind !== 'save_sighting' || right.kind !== 'save_sighting') {
    return false
  }

  return (
    left.sighting.photo_s3_key === right.sighting.photo_s3_key &&
    left.sighting.observed_at === right.sighting.observed_at &&
    left.sighting.species_id === right.sighting.species_id
  )
}

async function processQueuePayload(
  payload: QueuePayload,
): Promise<{ kind: 'saved' } | { kind: 'review_ready'; payload: QueuedReviewBeforeSave }> {
  if (payload.kind === 'save_sighting') {
    await sightingsApi.create(payload.sighting)
    return { kind: 'saved' }
  }

  if (payload.kind === 'review_before_save') {
    return { kind: 'review_ready', payload }
  }

  const fileInfo = await FileSystem.getInfoAsync(payload.local_photo_uri)
  if (!fileInfo.exists) {
    throw new Error('QUEUED_PHOTO_MISSING')
  }

  const { s3Key } = await uploadPhotoAsset({
    uri: payload.local_photo_uri,
    mimeType: 'image/jpeg',
  })
  const aiResult = await identifyPhotoByS3Key(s3Key)

  return {
    kind: 'review_ready',
    payload: {
      kind: 'review_before_save',
      local_photo_uri: payload.local_photo_uri,
      photo_s3_key: s3Key,
      lat: payload.lat,
      lng: payload.lng,
      location_accuracy_m: payload.location_accuracy_m,
      altitude_m: payload.altitude_m,
      observed_at: payload.observed_at,
      ai_result: aiResult,
    },
  }
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

export interface PendingReviewItem {
  queue_id: number
  payload: QueuedReviewBeforeSave
}

export async function getNextPendingReview(): Promise<PendingReviewItem | null> {
  const db = await getDb()
  const rows = await db.getAllAsync<QueueRow>(
    "SELECT * FROM sighting_queue WHERE status = 'review' ORDER BY created_at ASC",
  )

  for (const row of rows) {
    const payload = parseQueuePayload(row.payload)
    if (payload.kind === 'review_before_save') {
      return {
        queue_id: row.id,
        payload,
      }
    }
  }

  return null
}

export async function completePendingReview(
  queueId: number,
  payload: QueuedReviewBeforeSave,
  selectedSpeciesId: string,
  aiTrainingConsent: boolean,
): Promise<void> {
  const sighting: CreateSightingRequest = {
    species_id: selectedSpeciesId,
    lat: payload.lat,
    lng: payload.lng,
    location_accuracy_m: payload.location_accuracy_m,
    altitude_m: payload.altitude_m,
    photo_s3_key: payload.photo_s3_key,
    exif_stripped: true,
    ai_species_id: payload.ai_result.species_id,
    ai_confidence: payload.ai_result.confidence,
    ai_top3: payload.ai_result.top3.map((item) => ({
      species_id: item.species.species_id,
      confidence: item.confidence,
    })),
    ai_model_version: payload.ai_result.model_version,
    ai_inference_ms: payload.ai_result.inference_ms,
    ai_training_consent: aiTrainingConsent,
    observed_at: payload.observed_at,
  }

  await sightingsApi.create(sighting)

  const db = await getDb()
  await db.runAsync('DELETE FROM sighting_queue WHERE id = ?', [queueId])
  await FileSystem.deleteAsync(payload.local_photo_uri, { idempotent: true })
}

export async function clearFailedQueue(): Promise<void> {
  const db = await getDb()
  await db.runAsync("DELETE FROM sighting_queue WHERE status = 'failed'")
}
