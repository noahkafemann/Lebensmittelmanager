import { differenceInCalendarDays, isAfter, isBefore, isEqual, startOfDay } from 'date-fns'
import type { PantryItem } from '../types/domain'

export type ExpiryBucket =
  | 'expired'
  | 'today'
  | 'next3'
  | 'next7'
  | 'later'
  | 'unknown'

const relevantDate = (item: PantryItem): Date | null => {
  const raw = item.use_by_date ?? item.best_before_date
  return raw ? new Date(raw) : null
}

export const getExpiryBucket = (
  item: PantryItem,
  warningDays = 7,
  todayDate = new Date(),
): ExpiryBucket => {
  const date = relevantDate(item)

  if (!date || Number.isNaN(date.getTime())) {
    return 'unknown'
  }

  const today = startOfDay(todayDate)
  const target = startOfDay(date)

  if (isBefore(target, today)) {
    return 'expired'
  }

  if (isEqual(target, today)) {
    return 'today'
  }

  const diff = differenceInCalendarDays(target, today)

  if (diff <= Math.min(3, warningDays)) {
    return 'next3'
  }

  if (diff <= warningDays) {
    return 'next7'
  }

  return 'later'
}

export const hasCriticalUseByWarning = (item: PantryItem, todayDate = new Date()): boolean => {
  if (!item.use_by_date) {
    return false
  }

  const today = startOfDay(todayDate)
  const useBy = startOfDay(new Date(item.use_by_date))

  return isAfter(today, useBy)
}
