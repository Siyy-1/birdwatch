import { BADGES } from '../badges'

const user = (species_count = 0, streak_days = 0, total_points = 0) =>
  ({ species_count, streak_days, total_points })

describe('BADGES 조건 함수', () => {
  it('총 9개 뱃지 정의됨', () => {
    expect(BADGES).toHaveLength(9)
  })

  describe('first_sighting — 첫 발견', () => {
    const badge = BADGES.find(b => b.id === 'first_sighting')!
    it('species_count 1 이상 → true', () => {
      expect(badge.condition(user(1))).toBe(true)
    })
    it('species_count 0 → false', () => {
      expect(badge.condition(user(0))).toBe(false)
    })
  })

  describe('streak_3 — 3일 연속', () => {
    const badge = BADGES.find(b => b.id === 'streak_3')!
    it('streak_days 3 → true', () => expect(badge.condition(user(0, 3))).toBe(true))
    it('streak_days 2 → false', () => expect(badge.condition(user(0, 2))).toBe(false))
    it('streak_days 10 → true', () => expect(badge.condition(user(0, 10))).toBe(true))
  })

  describe('streak_7 — 1주일 연속', () => {
    const badge = BADGES.find(b => b.id === 'streak_7')!
    it('streak_days 7 → true', () => expect(badge.condition(user(0, 7))).toBe(true))
    it('streak_days 6 → false', () => expect(badge.condition(user(0, 6))).toBe(false))
  })

  describe('streak_30 — 한 달 연속', () => {
    const badge = BADGES.find(b => b.id === 'streak_30')!
    it('streak_days 30 → true', () => expect(badge.condition(user(0, 30))).toBe(true))
    it('streak_days 29 → false', () => expect(badge.condition(user(0, 29))).toBe(false))
  })

  describe('species_10 — 조류학자', () => {
    const badge = BADGES.find(b => b.id === 'species_10')!
    it('species_count 10 → true', () => expect(badge.condition(user(10))).toBe(true))
    it('species_count 9 → false', () => expect(badge.condition(user(9))).toBe(false))
  })

  describe('species_50 — 탐조 전문가', () => {
    const badge = BADGES.find(b => b.id === 'species_50')!
    it('species_count 50 → true', () => expect(badge.condition(user(50))).toBe(true))
    it('species_count 49 → false', () => expect(badge.condition(user(49))).toBe(false))
  })

  describe('species_100 — 조류 마스터', () => {
    const badge = BADGES.find(b => b.id === 'species_100')!
    it('species_count 100 → true', () => expect(badge.condition(user(100))).toBe(true))
    it('species_count 99 → false', () => expect(badge.condition(user(99))).toBe(false))
  })

  describe('points_1000', () => {
    const badge = BADGES.find(b => b.id === 'points_1000')!
    it('total_points 1000 → true', () => expect(badge.condition(user(0, 0, 1000))).toBe(true))
    it('total_points 999 → false', () => expect(badge.condition(user(0, 0, 999))).toBe(false))
  })

  describe('points_5000', () => {
    const badge = BADGES.find(b => b.id === 'points_5000')!
    it('total_points 5000 → true', () => expect(badge.condition(user(0, 0, 5000))).toBe(true))
    it('total_points 4999 → false', () => expect(badge.condition(user(0, 0, 4999))).toBe(false))
  })

  it('각 뱃지는 id, name, description, icon, condition 필드를 가짐', () => {
    for (const badge of BADGES) {
      expect(badge.id).toBeTruthy()
      expect(badge.name).toBeTruthy()
      expect(badge.description).toBeTruthy()
      expect(badge.icon).toBeTruthy()
      expect(typeof badge.condition).toBe('function')
    }
  })
})
