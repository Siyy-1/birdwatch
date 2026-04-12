import { describe, expect, it } from 'vitest'
import { stripJpegMetadata } from '../serverImageSanitizer.js'

function createSegment(marker: number, payload: number[]): number[] {
  const length = payload.length + 2
  return [
    0xff,
    marker,
    (length >> 8) & 0xff,
    length & 0xff,
    ...payload,
  ]
}

function createSampleJpeg(): Buffer {
  return Buffer.from([
    0xff, 0xd8,
    ...createSegment(0xe0, [0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00]),
    ...createSegment(0xe1, [0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0x01, 0x02]),
    ...createSegment(0xed, [0x49, 0x50, 0x54, 0x43]),
    ...createSegment(0xfe, [0x74, 0x65, 0x73, 0x74]),
    ...createSegment(0xdb, [0x00, 0x00]),
    0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00,
    0x11, 0x22, 0x33,
    0xff, 0xd9,
  ])
}

describe('stripJpegMetadata', () => {
  it('removes EXIF/IPTC/comment segments while keeping image payload', () => {
    const original = createSampleJpeg()

    const result = stripJpegMetadata(original)

    expect(result.removedMetadata).toBe(true)
    expect(result.sanitizedBuffer.length).toBeLessThan(original.length)
    expect(result.sanitizedBuffer.includes(Buffer.from('Exif'))).toBe(false)
    expect(result.sanitizedBuffer.includes(Buffer.from('IPTC'))).toBe(false)
    expect(result.sanitizedBuffer.includes(Buffer.from('test'))).toBe(false)
    expect(result.sanitizedBuffer.subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]))
    expect(result.sanitizedBuffer.subarray(-2)).toEqual(Buffer.from([0xff, 0xd9]))
  })

  it('returns non-JPEG input unchanged', () => {
    const original = Buffer.from('not-a-jpeg')

    const result = stripJpegMetadata(original)

    expect(result.removedMetadata).toBe(false)
    expect(result.sanitizedBuffer).toBe(original)
  })
})
