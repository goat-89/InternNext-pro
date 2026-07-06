import {
  normalizeNotificationDeepLink,
} from './notificationDeepLinks'
import { supabase } from './supabase'

export const NOTIFICATIONS_CHANGED_EVENT =
  'internnext:notifications-changed'

export function notifyNotificationStateChanged() {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(
    new CustomEvent(
      NOTIFICATIONS_CHANGED_EVENT
    )
  )
}

async function getCurrentUserId() {
  const response =
    await supabase.auth.getUser()

  const user =
    response.data?.user ?? null

  if (response.error) {
    throw response.error
  }

  if (!user) {
    throw new Error(
      'You must sign in to view notifications.'
    )
  }

  return user.id
}

function getSafeLimit(limit) {
  return Math.min(
    Math.max(Number(limit) || 50, 1),
    100
  )
}

export function normalizeNotification(
  notification
) {
  const safeLink =
    normalizeNotificationDeepLink(
      notification.deep_link ||
        notification.link ||
        null
    )

  return {
    ...notification,
    user_id:
      notification.recipient_user_id ||
      notification.user_id,
    message:
      notification.body ||
      notification.message ||
      '',
    link: safeLink,
    deep_link: safeLink,
    read_at:
      notification.read_at ||
      (notification.is_read
        ? notification.updated_at
        : null),
  }
}

export async function getNotifications({
  limit = 50,
  unreadOnly = false,
  cursor = null,
  category = 'all',
  includeArchived = false,
} = {}) {
  const userId =
    await getCurrentUserId()

  let query = supabase
    .from('notifications')
    .select(
      `
        id,
        user_id,
        recipient_user_id,
        event_id,
        event_key,
        category,
        priority,
        title,
        message,
        body,
        link,
        deep_link,
        image_url,
        read_at,
        is_read,
        archived_at,
        expires_at,
        metadata,
        created_at,
        updated_at
      `
    )
    .eq('recipient_user_id', userId)
    .order('created_at', {
      ascending: false,
    })
    .limit(getSafeLimit(limit))

  if (unreadOnly) {
    query = query.is(
      'read_at',
      null
    )
  }

  if (!includeArchived) {
    query = query.is(
      'archived_at',
      null
    )
  }

  if (
    category &&
    category !== 'all'
  ) {
    query = query.eq(
      'category',
      category
    )
  }

  if (cursor) {
    query = query.lt(
      'created_at',
      cursor
    )
  }

  const response =
    await query

  if (response.error) {
    throw response.error
  }

  return (response.data ?? []).map(
    normalizeNotification
  )
}

export async function getUnreadNotificationCount() {
  const userId =
    await getCurrentUserId()

  const response =
    await supabase
      .from('notifications')
      .select('id', {
        count: 'exact',
        head: true,
      })
      .eq('recipient_user_id', userId)
      .is('read_at', null)
      .is('archived_at', null)

  if (response.error) {
    throw response.error
  }

  return response.count ?? 0
}

export async function markNotificationRead(
  notificationId
) {
  if (!notificationId) {
    throw new Error(
      'Notification ID is required.'
    )
  }

  const response =
    await supabase.rpc(
      'mark_notification_read',
      {
        p_notification_id:
          notificationId,
      }
    )

  if (response.error) {
    throw response.error
  }

  notifyNotificationStateChanged()

  return response.data
}

export async function markAllNotificationsRead() {
  const response =
    await supabase.rpc(
      'mark_all_notifications_read'
    )

  if (response.error) {
    throw response.error
  }

  notifyNotificationStateChanged()

  return response.data ?? 0
}

export async function archiveNotification(
  notificationId
) {
  if (!notificationId) {
    throw new Error(
      'Notification ID is required.'
    )
  }

  const userId =
    await getCurrentUserId()

  const response =
    await supabase
      .from('notifications')
      .update({
        archived_at:
          new Date().toISOString(),
      })
      .eq('id', notificationId)
      .eq('recipient_user_id', userId)
      .select('id, archived_at')
      .maybeSingle()

  if (response.error) {
    throw response.error
  }

  if (!response.data) {
    throw new Error(
      'Notification not found.'
    )
  }

  notifyNotificationStateChanged()

  return response.data
}

export async function deleteNotification(
  notificationId
) {
  if (!notificationId) {
    throw new Error(
      'Notification ID is required.'
    )
  }

  const userId =
    await getCurrentUserId()

  const response =
    await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('recipient_user_id', userId)

  if (response.error) {
    throw response.error
  }

  notifyNotificationStateChanged()

  return true
}

export async function subscribeToNotifications(
  onChange
) {
  const userId =
    await getCurrentUserId()

  const uniqueId =
    String(Date.now()) +
    '-' +
    Math.random()
      .toString(36)
      .slice(2)

  const channel =
    supabase.channel(
      'notifications-' +
        userId +
        '-' +
        uniqueId
    )

  const handlePayload = (
    payload
  ) => {
    if (
      typeof onChange ===
      'function'
    ) {
      onChange(payload)
    }

    notifyNotificationStateChanged()
  }

  const filter =
    'recipient_user_id=eq.' +
    userId

  for (const event of [
    'INSERT',
    'UPDATE',
    'DELETE',
  ]) {
    channel.on(
      'postgres_changes',
      {
        event,
        schema: 'public',
        table: 'notifications',
        filter,
      },
      handlePayload
    )
  }

  channel.subscribe(
    function handleStatus(
      status,
      error
    ) {
      if (error) {
        console.error(
          'Notification realtime error:',
          error
        )
      }

      if (
        status ===
        'CHANNEL_ERROR'
      ) {
        console.error(
          'Notification channel failed.'
        )
      }
    }
  )

  let removed = false

  return async function unsubscribe() {
    if (removed) {
      return
    }

    removed = true

    try {
      await supabase.removeChannel(
        channel
      )
    } catch (error) {
      console.error(
        'Unable to remove notification channel:',
        error
      )
    }
  }
}
