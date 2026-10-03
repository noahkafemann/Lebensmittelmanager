import { describe, expect, it } from 'vitest'
import { convertQuantity, isCompatibleUnit } from '../units'

describe('unit conversion', () => {
  it('converts kilograms to grams', () => {
    expect(convertQuantity(0.5, 'kg', 'g')).toBe(500)
  })

  it('converts liters to ml', () => {
    expect(convertQuantity(1.2, 'l', 'ml')).toBe(1200)
  })

  it('rejects incompatible units', () => {
    expect(convertQuantity(1, 'stück', 'g')).toBeNull()
    expect(isCompatibleUnit('stück', 'g')).toBe(false)
  })
})
