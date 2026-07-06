import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

const getUser = vi.hoisted(() => vi.fn())
const from = vi.hoisted(() => vi.fn())
const getPublicPlatformSettings = vi.hoisted(() =>
  vi.fn()
)

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getUser,
    },
    from,
  },
}))

vi.mock('./platformSettingsApi', () => ({
  getPublicPlatformSettings,
}))

import {
  applyToInternship,
  deleteWithdrawnApplication,
  getMyApplications,
  withdrawApplication,
} from './applicationsApi'

function createQuery(result = {
  data: null,
  error: null,
}) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn(() =>
      Promise.resolve(result)
    ),
    insert: vi.fn(() => query),
    order: vi.fn(() => query),
    single: vi.fn(() =>
      Promise.resolve(result)
    ),
    update: vi.fn(() => query),
    in: vi.fn(() => query),
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

describe('student application API helpers', () => {
  beforeEach(() => {
    getUser.mockReset()
    from.mockReset()
    getPublicPlatformSettings.mockReset()

    getUser.mockResolvedValue({
      data: {
        user: {
          id: 'student-1',
        },
      },
      error: null,
    })
  })

  it('rejects missing IDs before calling Supabase', async () => {
    await expect(
      applyToInternship({})
    ).rejects.toThrow(
      'Internship ID is required.'
    )

    await expect(
      withdrawApplication('')
    ).rejects.toThrow(
      'Application ID is required.'
    )

    await expect(
      deleteWithdrawnApplication('')
    ).rejects.toThrow(
      'Application ID is required.'
    )

    expect(from).not.toHaveBeenCalled()
  })

  it('maps duplicate application errors to a user-facing message', async () => {
    const studentProfileQuery =
      createQuery({
        data: {
          primary_resume_path:
            'student-1/resume.pdf',
        },
        error: null,
      })

    const applicationQuery =
      createQuery({
        data: null,
        error: {
          code: '23505',
        },
      })

    from.mockImplementation((table) =>
      table === 'student_profiles'
        ? studentProfileQuery
        : applicationQuery
    )

    await expect(
      applyToInternship({
        internshipId: 'internship-1',
        coverLetter:
          '  I am interested.  ',
      })
    ).rejects.toThrow(
      'You already applied for this internship.'
    )

    expect(
      applicationQuery.insert
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        internship_id: 'internship-1',
        student_id: 'student-1',
        resume_path:
          'student-1/resume.pdf',
        cover_letter:
          'I am interested.',
        status: 'applied',
      })
    )
  })

  it('does not request employer-only notes in student application reads', async () => {
    const query = createQuery({
      data: [],
      error: null,
    })

    from.mockReturnValue(query)

    await expect(
      getMyApplications()
    ).resolves.toEqual([])

    const selection =
      query.select.mock.calls[0][0]

    expect(selection).not.toContain(
      'employer_notes'
    )
    expect(selection).toContain(
      'interview_notes'
    )
  })

  it('blocks withdrawal when platform settings disable it', async () => {
    getPublicPlatformSettings.mockResolvedValue({
      application_withdrawal_enabled: false,
    })

    await expect(
      withdrawApplication('application-1')
    ).rejects.toThrow(
      'Application withdrawal is currently disabled.'
    )

    expect(getUser).not.toHaveBeenCalled()
    expect(from).not.toHaveBeenCalled()
  })

  it('withdraws only allowed application states for the current student', async () => {
    getPublicPlatformSettings.mockResolvedValue({
      application_withdrawal_enabled: true,
    })

    const query = createQuery({
      data: {
        id: 'application-1',
        internship_id: 'internship-1',
        status: 'withdrawn',
      },
      error: null,
    })

    from.mockReturnValue(query)

    await expect(
      withdrawApplication('application-1')
    ).resolves.toEqual({
      id: 'application-1',
      internship_id: 'internship-1',
      status: 'withdrawn',
    })

    expect(from).toHaveBeenCalledWith(
      'applications'
    )
    expect(query.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'withdrawn',
      })
    )
    expect(query.eq).toHaveBeenCalledWith(
      'id',
      'application-1'
    )
    expect(query.eq).toHaveBeenCalledWith(
      'student_id',
      'student-1'
    )
    expect(query.in).toHaveBeenCalledWith(
      'status',
      [
        'applied',
        'under_review',
        'shortlisted',
      ]
    )
  })

  it('deletes only withdrawn applications for the current student', async () => {
    const query = createQuery({
      data: null,
      error: null,
    })

    from.mockReturnValue(query)

    await expect(
      deleteWithdrawnApplication(
        'application-1'
      )
    ).resolves.toBe(true)

    expect(query.delete).toHaveBeenCalled()
    expect(query.eq).toHaveBeenCalledWith(
      'id',
      'application-1'
    )
    expect(query.eq).toHaveBeenCalledWith(
      'student_id',
      'student-1'
    )
    expect(query.eq).toHaveBeenCalledWith(
      'status',
      'withdrawn'
    )
  })
})
