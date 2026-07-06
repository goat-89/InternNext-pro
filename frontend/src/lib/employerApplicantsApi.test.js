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
    storage: {
      from: vi.fn(),
    },
  },
}))

import {
  cancelApplicantInterview,
  scheduleApplicantInterview,
  updateEmployerApplicationStatus,
} from './employerApplicantsApi'

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
    update: vi.fn(() => query),
    single: vi.fn(() =>
      Promise.resolve(result)
    ),
  }

  return query
}

function mockEmployerUser() {
  getUser.mockResolvedValue({
    data: {
      user: {
        id: 'employer-1',
      },
    },
    error: null,
  })
}

function createEmployerProfileQuery(
  overrides = {}
) {
  return createQuery({
    data: {
      id: 'employer-1',
      role: 'employer',
      account_status: 'active',
      ...overrides,
    },
    error: null,
  })
}

function createOwnedApplicationQuery(
  overrides = {}
) {
  return createQuery({
    data: {
      id: 'application-1',
      student_id: 'student-1',
      internship_id: 'internship-1',
      status: 'shortlisted',
      internships: {
        id: 'internship-1',
        title: 'Frontend Intern',
        employer_id: 'employer-1',
      },
      ...overrides,
    },
    error: null,
  })
}

describe('employer applicant API helpers', () => {
  beforeEach(() => {
    getUser.mockReset()
    from.mockReset()
    mockEmployerUser()
  })

  it('rejects missing IDs and invalid statuses before calling Supabase', async () => {
    await expect(
      updateEmployerApplicationStatus(
        '',
        'shortlisted'
      )
    ).rejects.toThrow(
      'Application ID is required.'
    )

    await expect(
      scheduleApplicantInterview('', {})
    ).rejects.toThrow(
      'Application ID is required.'
    )

    await expect(
      cancelApplicantInterview('')
    ).rejects.toThrow(
      'Application ID is required.'
    )

    await expect(
      updateEmployerApplicationStatus(
        'application-1',
        'withdrawn'
      )
    ).rejects.toThrow(
      'Invalid application status.'
    )

    expect(from).not.toHaveBeenCalled()
  })

  it('rejects withdrawn applications during employer status updates', async () => {
    const ownershipQuery = createQuery({
      data: {
        id: 'application-1',
        status: 'withdrawn',
        internships: {
          employer_id: 'employer-1',
        },
      },
      error: null,
    })

    from.mockReturnValueOnce(
      ownershipQuery
    )

    await expect(
      updateEmployerApplicationStatus(
        'application-1',
        'shortlisted'
      )
    ).rejects.toThrow(
      'A withdrawn application cannot be updated.'
    )

    expect(
      ownershipQuery.eq
    ).toHaveBeenCalledWith(
      'internships.employer_id',
      'employer-1'
    )
  })

  it('updates application status only after employer ownership is verified', async () => {
    const ownershipQuery = createQuery({
      data: {
        id: 'application-1',
        status: 'applied',
        internships: {
          employer_id: 'employer-1',
        },
      },
      error: null,
    })

    const updateQuery = createQuery({
      data: {
        id: 'application-1',
        internship_id: 'internship-1',
        student_id: 'student-1',
        status: 'shortlisted',
      },
      error: null,
    })

    from
      .mockReturnValueOnce(ownershipQuery)
      .mockReturnValueOnce(updateQuery)

    await expect(
      updateEmployerApplicationStatus(
        'application-1',
        'shortlisted'
      )
    ).resolves.toEqual({
      id: 'application-1',
      internship_id: 'internship-1',
      student_id: 'student-1',
      status: 'shortlisted',
    })

    expect(
      ownershipQuery.eq
    ).toHaveBeenCalledWith(
      'internships.employer_id',
      'employer-1'
    )
    expect(
      updateQuery.update
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'shortlisted',
        updated_at: expect.any(String),
      })
    )
    expect(updateQuery.eq).toHaveBeenCalledWith(
      'id',
      'application-1'
    )
  })

  it('requires a valid active employer profile for interview scheduling', async () => {
    from.mockReturnValueOnce(
      createEmployerProfileQuery({
        role: 'student',
      })
    )

    await expect(
      scheduleApplicantInterview(
        'application-1',
        {
          interviewAt:
            '2099-01-01T10:00:00.000Z',
          interviewMode: 'video',
          meetingLink:
            'https://meet.example/test',
        }
      )
    ).rejects.toThrow(
      'Employer access is required.'
    )
  })

  it('validates interview date, mode, and required location/link fields', async () => {
    from
      .mockReturnValueOnce(
        createEmployerProfileQuery()
      )
      .mockReturnValueOnce(
        createOwnedApplicationQuery()
      )

    await expect(
      scheduleApplicantInterview(
        'application-1',
        {
          interviewAt: 'not-a-date',
          interviewMode: 'video',
          meetingLink:
            'https://meet.example/test',
        }
      )
    ).rejects.toThrow(
      'A valid interview date and time is required.'
    )

    from.mockReset()
    from
      .mockReturnValueOnce(
        createEmployerProfileQuery()
      )
      .mockReturnValueOnce(
        createOwnedApplicationQuery()
      )

    await expect(
      scheduleApplicantInterview(
        'application-1',
        {
          interviewAt:
            '2000-01-01T10:00:00.000Z',
          interviewMode: 'video',
          meetingLink:
            'https://meet.example/test',
        }
      )
    ).rejects.toThrow(
      'The interview must be scheduled in the future.'
    )

    from.mockReset()
    from
      .mockReturnValueOnce(
        createEmployerProfileQuery()
      )
      .mockReturnValueOnce(
        createOwnedApplicationQuery()
      )

    await expect(
      scheduleApplicantInterview(
        'application-1',
        {
          interviewAt:
            '2099-01-01T10:00:00.000Z',
          interviewMode: 'chat',
        }
      )
    ).rejects.toThrow(
      'Select a valid interview mode.'
    )

    from.mockReset()
    from
      .mockReturnValueOnce(
        createEmployerProfileQuery()
      )
      .mockReturnValueOnce(
        createOwnedApplicationQuery()
      )

    await expect(
      scheduleApplicantInterview(
        'application-1',
        {
          interviewAt:
            '2099-01-01T10:00:00.000Z',
          interviewMode: 'video',
        }
      )
    ).rejects.toThrow(
      'A meeting link is required for a video interview.'
    )

    from.mockReset()
    from
      .mockReturnValueOnce(
        createEmployerProfileQuery()
      )
      .mockReturnValueOnce(
        createOwnedApplicationQuery()
      )

    await expect(
      scheduleApplicantInterview(
        'application-1',
        {
          interviewAt:
            '2099-01-01T10:00:00.000Z',
          interviewMode: 'onsite',
        }
      )
    ).rejects.toThrow(
      'An interview location is required for an onsite interview.'
    )
  })

  it('updates applications to interview_scheduled with cleaned interview fields', async () => {
    const updateQuery = createQuery({
      data: {
        id: 'application-1',
        student_id: 'student-1',
        internship_id: 'internship-1',
        status: 'interview_scheduled',
        interview_at:
          '2099-01-01T10:00:00.000Z',
        interview_mode: 'video',
        meeting_link:
          'https://meet.example/test',
        interview_location: null,
        interview_notes: 'Bring portfolio',
      },
      error: null,
    })

    from
      .mockReturnValueOnce(
        createEmployerProfileQuery()
      )
      .mockReturnValueOnce(
        createOwnedApplicationQuery({
          status: 'shortlisted',
        })
      )
      .mockReturnValueOnce(updateQuery)

    await expect(
      scheduleApplicantInterview(
        'application-1',
        {
          interviewAt:
            '2099-01-01T10:00:00.000Z',
          interviewMode: ' video ',
          meetingLink:
            ' https://meet.example/test ',
          interviewNotes:
            ' Bring portfolio ',
        }
      )
    ).resolves.toMatchObject({
      id: 'application-1',
      status: 'interview_scheduled',
      internship: {
        id: 'internship-1',
      },
    })

    expect(
      updateQuery.update
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'interview_scheduled',
        interview_mode: 'video',
        meeting_link:
          'https://meet.example/test',
        interview_location: null,
        interview_notes: 'Bring portfolio',
        updated_at: expect.any(String),
      })
    )
    expect(updateQuery.eq).toHaveBeenCalledWith(
      'id',
      'application-1'
    )
    expect(updateQuery.eq).toHaveBeenCalledWith(
      'internship_id',
      'internship-1'
    )
  })

  it('rejects cancelling applications without a scheduled interview', async () => {
    from
      .mockReturnValueOnce(
        createEmployerProfileQuery()
      )
      .mockReturnValueOnce(
        createOwnedApplicationQuery({
          status: 'shortlisted',
        })
      )

    await expect(
      cancelApplicantInterview(
        'application-1'
      )
    ).rejects.toThrow(
      'This application does not have a scheduled interview.'
    )
  })

  it('clears interview fields and returns applications to shortlisted when cancelling', async () => {
    const updateQuery = createQuery({
      data: {
        id: 'application-1',
        status: 'shortlisted',
        interview_at: null,
        interview_mode: null,
        interview_location: null,
        meeting_link: null,
        interview_notes: null,
      },
      error: null,
    })

    from
      .mockReturnValueOnce(
        createEmployerProfileQuery()
      )
      .mockReturnValueOnce(
        createOwnedApplicationQuery({
          status: 'interview_scheduled',
        })
      )
      .mockReturnValueOnce(updateQuery)

    await expect(
      cancelApplicantInterview(
        'application-1'
      )
    ).resolves.toEqual({
      id: 'application-1',
      status: 'shortlisted',
      interview_at: null,
      interview_mode: null,
      interview_location: null,
      meeting_link: null,
      interview_notes: null,
    })

    expect(
      updateQuery.update
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'shortlisted',
        interview_at: null,
        interview_mode: null,
        interview_location: null,
        meeting_link: null,
        interview_notes: null,
        updated_at: expect.any(String),
      })
    )
    expect(updateQuery.eq).toHaveBeenCalledWith(
      'id',
      'application-1'
    )
    expect(updateQuery.eq).toHaveBeenCalledWith(
      'internship_id',
      'internship-1'
    )
  })
})
