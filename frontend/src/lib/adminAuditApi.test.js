import {
  describe,
  expect,
  it,
  vi,
} from 'vitest'

const getUser = vi.hoisted(() => vi.fn())
const from = vi.hoisted(() => vi.fn())

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getUser,
    },
    from,
  },
}))

import {
  buildAdminAuditCsv,
} from './adminAuditApi'

describe('admin audit API helpers', () => {
  it('builds audit CSV from log rows', () => {
    const csv = buildAdminAuditCsv([
      {
        created_at:
          '2026-06-25T10:00:00.000Z',
        adminName: 'Admin User',
        adminEmail: 'admin@example.com',
        entity_type: 'company',
        entity_id: 'company-1',
        action: 'approve_company',
        old_values: {
          status: 'pending',
        },
        new_values: {
          status: 'approved',
        },
      },
    ])

    expect(csv).toContain(
      '"Timestamp","Administrator","Administrator Email","Entity Type","Entity ID","Action","Old Values","New Values"'
    )
    expect(csv).toContain(
      '"\'2026-06-25T10:00:00.000Z","Admin User","admin@example.com","company","company-1","approve_company"'
    )
    expect(csv).toContain(
      '"{""status"":""pending""}"'
    )
    expect(csv).toContain(
      '"{""status"":""approved""}"'
    )
  })

  it('handles non-array and empty log input safely', () => {
    expect(buildAdminAuditCsv(null)).toBe(
      '"Timestamp","Administrator","Administrator Email","Entity Type","Entity ID","Action","Old Values","New Values"'
    )

    expect(buildAdminAuditCsv([])).toBe(
      '"Timestamp","Administrator","Administrator Email","Entity Type","Entity ID","Action","Old Values","New Values"'
    )
  })

  it('protects CSV injection values', () => {
    const csv = buildAdminAuditCsv([
      {
        created_at: '=NOW()',
        adminName: '+Admin',
        adminEmail: '-admin@example.com',
        entity_type: '@company',
        entity_id: '=company-1',
        action: '+approve',
        old_values: '=old',
        new_values: '@new',
      },
    ])

    expect(csv).toContain('"\'=NOW()"')
    expect(csv).toContain('"\' +Admin"'.replace(' ', ''))
    expect(csv).toContain('"\'-admin@example.com"')
    expect(csv).toContain('"\'@company"')
    expect(csv).toContain('"\'=company-1"')
    expect(csv).toContain('"\' +approve"'.replace(' ', ''))
    expect(csv).toContain('"""=old"""')
    expect(csv).toContain('"""@new"""')
  })
})
