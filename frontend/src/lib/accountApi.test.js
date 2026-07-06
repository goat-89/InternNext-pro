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
  requestAccountDeletion,
} from './accountApi'

describe('account API helpers', () => {
  beforeEach(() => {
    rpc.mockReset()
  })

  it('calls the account deletion RPC and normalizes the response', async () => {
    rpc.mockResolvedValueOnce({
      data: {
        deleted: true,
        account_status: 'deleted',
        role: 'student',
      },
      error: null,
    })

    await expect(
      requestAccountDeletion()
    ).resolves.toEqual({
      deleted: true,
      accountStatus: 'deleted',
      role: 'student',
    })

    expect(rpc).toHaveBeenCalledWith(
      'request_account_deletion'
    )
  })

  it('returns safe defaults for partial RPC responses', async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: null,
    })

    await expect(
      requestAccountDeletion()
    ).resolves.toEqual({
      deleted: false,
      accountStatus: '',
      role: '',
    })
  })

  it('combines Supabase error fields into a useful message', async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: {
        message:
          'Deletion failed.',
        details:
          'Applications are locked.',
        hint:
          'Contact support.',
      },
    })

    await expect(
      requestAccountDeletion()
    ).rejects.toThrow(
      'Deletion failed. Applications are locked. Contact support.'
    )
  })

  it('falls back when Supabase returns an empty error object', async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: {},
    })

    await expect(
      requestAccountDeletion()
    ).rejects.toThrow(
      'Unable to update account status.'
    )
  })
})
