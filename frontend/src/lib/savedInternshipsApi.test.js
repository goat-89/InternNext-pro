import {
  beforeEach,
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
  checkInternshipSaved,
  getSavedInternshipIds,
  getSavedInternships,
  removeSavedInternship,
  saveInternship,
} from './savedInternshipsApi'

function createQuery(result = {
  data: null,
  error: null,
}) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() =>
      Promise.resolve(result)
    ),
    maybeSingle: vi.fn(() =>
      Promise.resolve(result)
    ),
    upsert: vi.fn(() =>
      Promise.resolve(result)
    ),
    delete: vi.fn(() => query),
    then(resolve, reject) {
      return Promise.resolve(result).then(
        resolve,
        reject
      )
    },
  }

  return query
}

describe('saved internship API helpers', () => {
  beforeEach(() => {
    getUser.mockReset()
    from.mockReset()

    getUser.mockResolvedValue({
      data: {
        user: {
          id: 'student-1',
        },
      },
      error: null,
    })
  })

  it('requires internship IDs for save and remove actions', async () => {
    await expect(
      saveInternship('')
    ).rejects.toThrow(
      'Internship ID is required.'
    )

    await expect(
      removeSavedInternship('')
    ).rejects.toThrow(
      'Internship ID is required.'
    )

    expect(from).not.toHaveBeenCalled()
  })

  it('returns saved internship IDs as strings', async () => {
    const query = createQuery({
      data: [
        {
          internship_id: 1001,
        },
        {
          internship_id: 'internship-2',
        },
      ],
      error: null,
    })

    from.mockReturnValue(query)

    await expect(
      getSavedInternshipIds()
    ).resolves.toEqual([
      '1001',
      'internship-2',
    ])

    expect(from).toHaveBeenCalledWith(
      'saved_internships'
    )
    expect(query.eq).toHaveBeenCalledWith(
      'student_id',
      'student-1'
    )
    expect(query.order).toHaveBeenCalledWith(
      'created_at',
      {
        ascending: false,
      }
    )
  })

  it('filters saved internship rows without internship IDs', async () => {
    const query = createQuery({
      data: [
        {
          created_at: '2026-06-01',
          internships: {
            id: 'internship-1',
            title: 'Frontend Intern',
          },
        },
        {
          created_at: '2026-06-02',
          internships: {
            title: 'Broken row',
          },
        },
        {
          created_at: '2026-06-03',
          internships: null,
        },
      ],
      error: null,
    })

    from.mockReturnValue(query)

    await expect(
      getSavedInternships()
    ).resolves.toEqual([
      {
        savedAt: '2026-06-01',
        id: 'internship-1',
        title: 'Frontend Intern',
      },
    ])
  })

  it('upserts saved internships with duplicate protection', async () => {
    const query = createQuery({
      data: null,
      error: null,
    })

    from.mockReturnValue(query)

    await expect(
      saveInternship('internship-1')
    ).resolves.toBe(true)

    expect(query.upsert).toHaveBeenCalledWith(
      {
        student_id: 'student-1',
        internship_id: 'internship-1',
      },
      {
        onConflict:
          'student_id,internship_id',
        ignoreDuplicates: true,
      }
    )
  })

  it('removes saved internships for the current student', async () => {
    const query = createQuery({
      data: null,
      error: null,
    })

    from.mockReturnValue(query)

    await expect(
      removeSavedInternship(
        'internship-1'
      )
    ).resolves.toBe(true)

    expect(query.delete).toHaveBeenCalled()
    expect(query.eq).toHaveBeenCalledWith(
      'student_id',
      'student-1'
    )
    expect(query.eq).toHaveBeenCalledWith(
      'internship_id',
      'internship-1'
    )
  })

  it('checks saved state with maybeSingle', async () => {
    const query = createQuery({
      data: {
        internship_id: 'internship-1',
      },
      error: null,
    })

    from.mockReturnValue(query)

    await expect(
      checkInternshipSaved(
        'internship-1'
      )
    ).resolves.toBe(true)

    expect(query.maybeSingle).toHaveBeenCalled()

    from.mockClear()

    await expect(
      checkInternshipSaved('')
    ).resolves.toBe(false)

    expect(from).not.toHaveBeenCalled()
  })
})
