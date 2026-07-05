import { supabase } from './supabase'

function getErrorMessage(error) {
  return [
    error?.message,
    error?.details,
    error?.hint,
  ]
    .filter(Boolean)
    .join(' ') ||
    'Unable to update account status.'
}

export async function requestAccountDeletion() {
  const { data, error } = await supabase.rpc(
    'request_account_deletion'
  )

  if (error) {
    throw new Error(getErrorMessage(error))
  }

  return {
    deleted:
      Boolean(data?.deleted),
    accountStatus:
      data?.account_status || '',
    role:
      data?.role || '',
  }
}
