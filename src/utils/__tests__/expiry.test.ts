import { addDays, formatISO, subDays } from 'date-fns'
import { describe, expect, it } from 'vitest'
import { getExpiryBucket, hasCriticalUseByWarning } from '../expiry'

const now = new Date('2026-10-03T00:00:00.000Z')

const baseItem = {
  id: '1',
  household_id: 'h',
  name: 'Milch',
  category: 'Milchprodukte',
  quantity: 1,
  unit: 'l' as const,
  storage_location: 'Kühlschrank',
  best_before_date: null,
  use_by_date: null,
  purchase_date: null,
  note: null,
  created_at: now.toISOString(),
  archived_at: null,
}

describe('expiry buckets', () => {
  it('flags expired entries', () => {
    const item = { ...baseItem, best_before_date: formatISO(subDays(now, 1), { representation: 'date' }) }
    expect(getExpiryBucket(item, 7, now)).toBe('expired')
  })

  it('flags today and next ranges', () => {
    const today = { ...baseItem, best_before_date: formatISO(now, { representation: 'date' }) }
    const next3 = { ...baseItem, best_before_date: formatISO(addDays(now, 2), { representation: 'date' }) }
    const next7 = { ...baseItem, best_before_date: formatISO(addDays(now, 6), { representation: 'date' }) }

    expect(getExpiryBucket(today, 7, now)).toBe('today')
    expect(getExpiryBucket(next3, 7, now)).toBe('next3')
    expect(getExpiryBucket(next7, 7, now)).toBe('next7')
  })

  it('warns for passed use-by date', () => {
    const item = { ...baseItem, use_by_date: formatISO(subDays(now, 1), { representation: 'date' }) }
    expect(hasCriticalUseByWarning(item, now)).toBe(true)
  })
})
