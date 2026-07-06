import {
  describe,
  expect,
  it,
} from 'vitest'

import {
  formatDate,
  formatMoney,
  formatStatus,
  normalizeRelation,
  splitList,
  statusClass,
} from './format'

describe('format helpers', () => {
  it('normalizes Supabase relation payloads', () => {
    expect(
      normalizeRelation([{ id: 1 }])
    ).toEqual({ id: 1 })
    expect(
      normalizeRelation([])
    ).toBeNull()
    expect(
      normalizeRelation({ id: 2 })
    ).toEqual({ id: 2 })
  })

  it('formats empty and invalid dates predictably', () => {
    expect(formatDate(null)).toBe('-')
    expect(formatDate('not-a-date')).toBe(
      'not-a-date'
    )
  })

  it('formats paid and unpaid compensation', () => {
    expect(
      formatMoney(12000, 18000)
    ).toBe(
      '₹12,000 - ₹18,000 / monthly'
    )
    expect(
      formatMoney(null, null)
    ).toBe('Stipend not disclosed')
    expect(
      formatMoney(null, null, 'INR', 'monthly', 'unpaid')
    ).toBe('Unpaid')
  })

  it('formats known and unknown statuses', () => {
    expect(
      formatStatus('under_review')
    ).toBe('Under review')
    expect(
      formatStatus('custom_status')
    ).toBe('custom_status')
    expect(formatStatus('')).toBe(
      'Unknown'
    )
  })

  it('returns stable status classes with a fallback', () => {
    expect(
      statusClass('approved')
    ).toContain('emerald')
    expect(
      statusClass('unexpected')
    ).toContain('slate')
  })

  it('splits comma and newline lists', () => {
    expect(
      splitList('React, JavaScript\nSQL')
    ).toEqual([
      'React',
      'JavaScript',
      'SQL',
    ])
    expect(
      splitList([' React ', '', 'SQL'])
    ).toEqual(['React', 'SQL'])
  })
})
