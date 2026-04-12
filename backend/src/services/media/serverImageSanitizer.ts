import { access, mkdir, writeFile } from 'node:fs/promises'
import { constants as fsConstants } from 'node:fs'
import { dirname, join } from 'node:path'

export interface JpegSanitizationResult {
  sanitizedBuffer: Buffer
  removedMetadata: boolean
}

export const LOCAL_UPLOAD_DIR = '/tmp/birdwatch-uploads'

const JPEG_SOI = 0xffd8
const JPEG_EOI = 0xffd9
const JPEG_SOS = 0xffda
const JPEG_COM = 0xfffe

function isStandaloneJpegMarker(marker: number): boolean {
  return marker === 0xff01 || (marker >= 0xffd0 && marker <= 0xffd9)
}

function shouldRemoveJpegSegment(marker: number): boolean {
  return marker === 0xffe1 || marker === 0xffed || marker === JPEG_COM
}

export function stripJpegMetadata(buffer: Buffer): JpegSanitizationResult {
  if (buffer.length < 4 || buffer.readUInt16BE(0) !== JPEG_SOI) {
    return {
      sanitizedBuffer: buffer,
      removedMetadata: false,
    }
  }

  const output: Buffer[] = [buffer.subarray(0, 2)]
  let offset = 2
  let removedMetadata = false

  while (offset < buffer.length) {
    while (offset < buffer.length && buffer[offset] === 0xff) {
      offset += 1
    }

    if (offset >= buffer.length) break

    const marker = 0xff00 | buffer[offset]
    const markerStart = offset - 1

    if (marker === JPEG_SOS) {
      output.push(buffer.subarray(markerStart))
      return {
        sanitizedBuffer: removedMetadata ? Buffer.concat(output) : buffer,
        removedMetadata,
      }
    }

    if (marker === JPEG_EOI) {
      output.push(buffer.subarray(markerStart, offset + 1))
      return {
        sanitizedBuffer: removedMetadata ? Buffer.concat(output) : buffer,
        removedMetadata,
      }
    }

    if (isStandaloneJpegMarker(marker)) {
      output.push(buffer.subarray(markerStart, offset + 1))
      offset += 1
      continue
    }

    if (offset + 2 >= buffer.length) {
      return {
        sanitizedBuffer: buffer,
        removedMetadata: false,
      }
    }

    const segmentLength = buffer.readUInt16BE(offset + 1)
    const segmentEnd = offset + 1 + segmentLength

    if (segmentLength < 2 || segmentEnd > buffer.length) {
      return {
        sanitizedBuffer: buffer,
        removedMetadata: false,
      }
    }

    if (shouldRemoveJpegSegment(marker)) {
      removedMetadata = true
    } else {
      output.push(buffer.subarray(markerStart, segmentEnd))
    }

    offset = segmentEnd
  }

  return {
    sanitizedBuffer: removedMetadata ? Buffer.concat(output) : buffer,
    removedMetadata,
  }
}

export function getLocalUploadFilePath(s3Key: string): string {
  const filename = s3Key.replace(/\//g, '_')
  return join(LOCAL_UPLOAD_DIR, filename)
}

function getLocalSanitizedMarkerPath(s3Key: string): string {
  return `${getLocalUploadFilePath(s3Key)}.server-sanitized.json`
}

export async function markLocalUploadSanitized(s3Key: string): Promise<void> {
  const markerPath = getLocalSanitizedMarkerPath(s3Key)
  await mkdir(dirname(markerPath), { recursive: true })
  await writeFile(
    markerPath,
    JSON.stringify({ server_sanitized: true, sanitized_at: new Date().toISOString() }),
    'utf8',
  )
}

export async function isLocalUploadSanitized(s3Key: string): Promise<boolean> {
  try {
    await access(getLocalSanitizedMarkerPath(s3Key), fsConstants.F_OK)
    return true
  } catch {
    return false
  }
}
