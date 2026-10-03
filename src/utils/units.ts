import type { Unit } from '../types/domain'

const unitGroups: Record<string, { base: Unit; factors: Partial<Record<Unit, number>> }> = {
  weight: { base: 'g', factors: { g: 1, kg: 1000 } },
  volume: { base: 'ml', factors: { ml: 1, l: 1000 } },
  piece: { base: 'stück', factors: { stück: 1 } },
  spoon: { base: 'tl', factors: { tl: 1, el: 3 } },
}

const findGroup = (unit: Unit) =>
  Object.values(unitGroups).find((group) => group.factors[unit] !== undefined)

export const isCompatibleUnit = (left: Unit, right: Unit): boolean => {
  const leftGroup = findGroup(left)
  const rightGroup = findGroup(right)

  return !!leftGroup && !!rightGroup && leftGroup.base === rightGroup.base
}

export const convertQuantity = (
  quantity: number,
  from: Unit,
  to: Unit,
): number | null => {
  if (from === to) {
    return quantity
  }

  const fromGroup = findGroup(from)
  const toGroup = findGroup(to)

  if (!fromGroup || !toGroup || fromGroup.base !== toGroup.base) {
    return null
  }

  const fromFactor = fromGroup.factors[from]
  const toFactor = toGroup.factors[to]

  if (!fromFactor || !toFactor) {
    return null
  }

  return (quantity * fromFactor) / toFactor
}

export const clampPositive = (value: number): number =>
  Number.isFinite(value) ? Math.max(0, value) : 0
