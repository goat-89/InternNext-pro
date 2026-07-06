import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

const mocks = vi.hoisted(() => {
  const state = {
    data: [],
    error: null,
    count: 0,
  }

  const query = {}

  query.select = vi.fn(() => query)
  query.eq = vi.fn(() => query)
  query.is = vi.fn(() => query)
  query.order = vi.fn(() => query)
  query.limit = vi.fn(() => query)
  query.lt = vi.fn(() => query)
  query.update = vi.fn(() => query)
  query.delete = vi.fn(() => query)
  query.maybeSingle = vi.fn(() =>
    Promise.resolve({
      data: state.data?.[0] ?? null,
      error: state.error,
    })
  )
  query.then = vi.fn((resolve) =>
    Promise.resolve(
      resolve({
        data: state.data,
        error: state.error,
        count: state.count,
      })
    )
  )

  return {
    state,
    query,
    from: vi.fn(() => query),
    rpc: vi.fn(),
    getUser: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  }
})

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getUser: mocks.getUser,
    },
    from: mocks.from,
    rpc: mocks.rpc,
    channel: mocks.channel,
    removeChannel:
      mocks.removeChannel,
  },
}))

import {
  archiveNotification,
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from './notificationsApi'

describe('notification API helpers', () => {
  beforeEach(() => {
    mocks.state.data = []
    mocks.state.error = null
    mocks.state.count = 0

    mocks.from.mockClear()
    mocks.rpc.mockReset()
    mocks.getUser.mockReset()
    mocks.channel.mockReset()
    mocks.removeChannel.mockReset()

    Object.values(mocks.query)
      .filter(
        (value) =>
          typeof value?.mockClear ===
          'function'
      )
      .forEach((fn) => fn.mockClear())

    mocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
        },
      },
      error: null,
    })
  })

  it('loads notifications with safe normalized links', async () => {
    mocks.state.data = [
      {
        id: 'notification-1',
        recipient_user_id: 'user-1',
        title: 'Application update',
        body: 'Your application moved.',
        deep_link:
          'https://evil.test',
        is_read: false,
        created_at:
          '2026-06-26T10:00:00Z',
      },
    ]

    await expect(
      getNotifications({
        limit: 500,
        category: 'application',
        cursor:
          '2026-06-26T11:00:00Z',
      })
    ).resolves.toMatchObject([
      {
        id: 'notification-1',
        message:
          'Your application moved.',
        link: null,
      },
    ])

    expect(mocks.from).toHaveBeenCalledWith(
      'notifications'
    )
    expect(
      mocks.query.eq
    ).toHaveBeenCalledWith(
      'recipient_user_id',
      'user-1'
    )
    expect(
      mocks.query.eq
    ).toHaveBeenCalledWith(
      'category',
      'application'
    )
    expect(
      mocks.query.limit
    ).toHaveBeenCalledWith(100)
  })

  it('loads unread notification count', async () => {
    mocks.state.count = 7

    await expect(
      getUnreadNotificationCount()
    ).resolves.toBe(7)

    expect(
      mocks.query.is
    ).toHaveBeenCalledWith(
      'read_at',
      null
    )
  })

  it('marks a notification as read through RPC', async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: {
        id: 'notification-1',
        read_at:
          '2026-06-26T10:00:00Z',
      },
      error: null,
    })

    await expect(
      markNotificationRead(
        'notification-1'
      )
    ).resolves.toEqual({
      id: 'notification-1',
      read_at:
        '2026-06-26T10:00:00Z',
    })

    expect(mocks.rpc).toHaveBeenCalledWith(
      'mark_notification_read',
      {
        p_notification_id:
          'notification-1',
      }
    )
  })

  it('marks all notifications read through RPC', async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: 3,
      error: null,
    })

    await expect(
      markAllNotificationsRead()
    ).resolves.toBe(3)
  })

  it('archives own notification rows', async () => {
    mocks.state.data = [
      {
        id: 'notification-1',
        archived_at:
          '2026-06-26T10:00:00Z',
      },
    ]

    await expect(
      archiveNotification(
        'notification-1'
      )
    ).resolves.toEqual({
      id: 'notification-1',
      archived_at:
        '2026-06-26T10:00:00Z',
    })

    expect(
      mocks.query.update
    ).toHaveBeenCalled()
    expect(
      mocks.query.eq
    ).toHaveBeenCalledWith(
      'recipient_user_id',
      'user-1'
    )
  })
})
