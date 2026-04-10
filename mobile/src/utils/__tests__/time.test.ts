import { formatRelativeTime } from '../time'

describe('formatRelativeTime', () => {
  const NOW = new Date('2026-04-08T12:00:00.000Z').getTime()

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('30초 전 → "방금 전"', () => {
    const iso = new Date(NOW - 30_000).toISOString()
    expect(formatRelativeTime(iso)).toBe('방금 전')
  })

  it('현재 시각 → "방금 전"', () => {
    const iso = new Date(NOW).toISOString()
    expect(formatRelativeTime(iso)).toBe('방금 전')
  })

  it('1분 전 → "1분 전"', () => {
    const iso = new Date(NOW - 60_000).toISOString()
    expect(formatRelativeTime(iso)).toBe('1분 전')
  })

  it('30분 전 → "30분 전"', () => {
    const iso = new Date(NOW - 30 * 60_000).toISOString()
    expect(formatRelativeTime(iso)).toBe('30분 전')
  })

  it('59분 전 → "59분 전"', () => {
    const iso = new Date(NOW - 59 * 60_000).toISOString()
    expect(formatRelativeTime(iso)).toBe('59분 전')
  })

  it('1시간 전 → "1시간 전"', () => {
    const iso = new Date(NOW - 60 * 60_000).toISOString()
    expect(formatRelativeTime(iso)).toBe('1시간 전')
  })

  it('5시간 전 → "5시간 전"', () => {
    const iso = new Date(NOW - 5 * 60 * 60_000).toISOString()
    expect(formatRelativeTime(iso)).toBe('5시간 전')
  })

  it('23시간 전 → "23시간 전"', () => {
    const iso = new Date(NOW - 23 * 60 * 60_000).toISOString()
    expect(formatRelativeTime(iso)).toBe('23시간 전')
  })

  it('1일 전 → "1일 전"', () => {
    const iso = new Date(NOW - 24 * 60 * 60_000).toISOString()
    expect(formatRelativeTime(iso)).toBe('1일 전')
  })

  it('7일 전 → "7일 전"', () => {
    const iso = new Date(NOW - 7 * 24 * 60 * 60_000).toISOString()
    expect(formatRelativeTime(iso)).toBe('7일 전')
  })

  it('29일 전 → "29일 전"', () => {
    const iso = new Date(NOW - 29 * 24 * 60 * 60_000).toISOString()
    expect(formatRelativeTime(iso)).toBe('29일 전')
  })

  it('30일 이상 → "N개월 전"', () => {
    const iso = new Date(NOW - 30 * 24 * 60 * 60_000).toISOString()
    expect(formatRelativeTime(iso)).toBe('1개월 전')
  })

  it('60일 → "2개월 전"', () => {
    const iso = new Date(NOW - 60 * 24 * 60 * 60_000).toISOString()
    expect(formatRelativeTime(iso)).toBe('2개월 전')
  })
})
