import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

const rpc = vi.hoisted(() => vi.fn())

vi.mock('./supabase', () => ({
  supabase: {
    rpc,
  },
}))

import {
  createSupportTicket,
  getAdminSupportTickets,
  updateAdminSupportTicket,
} from './supportTicketsApi'

describe('support ticket API helpers', () => {
  beforeEach(() => {
    rpc.mockReset()
  })

  it('validates required contact fields before creating a ticket', async () => {
    await expect(
      createSupportTicket({
        email: 'student@example.com',
        subject: 'Help',
        message: 'Need support',
      })
    ).rejects.toThrow('Enter your full name.')

    await expect(
      createSupportTicket({
        fullName: 'Student User',
        email: 'not-email',
        subject: 'Help',
        message: 'Need support',
      })
    ).rejects.toThrow(
      'Enter a valid email address.'
    )

    await expect(
      createSupportTicket({
        fullName: 'Student User',
        email: 'student@example.com',
        message: 'Need support',
      })
    ).rejects.toThrow('Enter a subject.')

    await expect(
      createSupportTicket({
        fullName: 'Student User',
        email: 'student@example.com',
        subject: 'Help',
      })
    ).rejects.toThrow('Tell us how we can help.')

    expect(rpc).not.toHaveBeenCalled()
  })

  it('trims ticket data and falls back invalid categories to general', async () => {
    rpc.mockResolvedValueOnce({
      data: {
        id: 'ticket-1',
      },
      error: null,
    })

    await expect(
      createSupportTicket({
        fullName: '  Student User  ',
        email: '  STUDENT@EXAMPLE.COM  ',
        phone: '  +91 98765 43210  ',
        category: 'unsupported',
        subject: '  Payment help  ',
        message: '  Please check my order.  ',
      })
    ).resolves.toEqual({
      id: 'ticket-1',
    })

    expect(rpc).toHaveBeenCalledWith(
      'create_support_ticket',
      {
        ticket_data: {
          full_name: 'Student User',
          email: 'student@example.com',
          phone: '+91 98765 43210',
          category: 'general',
          subject: 'Payment help',
          message: 'Please check my order.',
        },
      }
    )
  })

  it('uses valid categories when creating tickets', async () => {
    rpc.mockResolvedValueOnce({
      data: {
        id: 'ticket-2',
      },
      error: null,
    })

    await createSupportTicket({
      fullName: 'Employer User',
      email: 'employer@example.com',
      category: 'employer_inquiry',
      subject: 'Hiring',
      message: 'Need help hiring interns.',
    })

    expect(rpc).toHaveBeenCalledWith(
      'create_support_ticket',
      expect.objectContaining({
        ticket_data: expect.objectContaining({
          category: 'employer_inquiry',
        }),
      })
    )
  })

  it('falls back unsupported admin ticket filters to all', async () => {
    rpc.mockResolvedValueOnce({
      data: [],
      error: null,
    })

    await expect(
      getAdminSupportTickets({
        status: 'needs_review',
        limit: 25,
      })
    ).resolves.toEqual([])

    expect(rpc).toHaveBeenCalledWith(
      'list_admin_support_tickets',
      {
        p_status: 'all',
        p_limit: 25,
      }
    )
  })

  it('rejects unsupported admin status updates', async () => {
    await expect(
      updateAdminSupportTicket('ticket-1', {
        status: 'needs_review',
      })
    ).rejects.toThrow(
      'Invalid support ticket status.'
    )

    expect(rpc).not.toHaveBeenCalled()
  })
})
