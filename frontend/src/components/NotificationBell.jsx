import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  Bell,
  Inbox,
  LoaderCircle,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'

import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  NOTIFICATIONS_CHANGED_EVENT,
  subscribeToNotifications,
} from '../lib/notificationsApi'

function getNotificationRoute(role) {
  if (role === 'employer') {
    return '/employer/notifications'
  }

  if (role === 'admin') {
    return '/admin/notifications'
  }

  return '/student/notifications'
}

function getRelativeTime(value) {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  const timestamp = date.getTime()

  if (Number.isNaN(timestamp)) {
    return ''
  }

  const differenceSeconds =
    Math.round(
      (timestamp - Date.now()) / 1000
    )
  const absoluteSeconds =
    Math.abs(differenceSeconds)

  let divisor = 1
  let unit = 'second'

  if (absoluteSeconds >= 86400) {
    divisor = 86400
    unit = 'day'
  } else if (absoluteSeconds >= 3600) {
    divisor = 3600
    unit = 'hour'
  } else if (absoluteSeconds >= 60) {
    divisor = 60
    unit = 'minute'
  }

  return new Intl.RelativeTimeFormat(
    undefined,
    {
      numeric: 'auto',
    }
  ).format(
    Math.round(
      differenceSeconds / divisor
    ),
    unit
  )
}

export default function NotificationBell() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const wrapperRef = useRef(null)
  const buttonRef = useRef(null)

  const [unreadCount, setUnreadCount] =
    useState(0)
  const [open, setOpen] =
    useState(false)
  const [preview, setPreview] =
    useState([])
  const [loadingPreview, setLoadingPreview] =
    useState(false)
  const [error, setError] =
    useState('')

  const refreshUnreadCount =
    useCallback(async () => {
      try {
        const count =
          await getUnreadNotificationCount()

        setUnreadCount(count)
      } catch (refreshError) {
        console.error(
          'Unable to load unread notification count:',
          refreshError
        )
      }
    }, [])

  const loadPreview =
    useCallback(async () => {
      try {
        setLoadingPreview(true)
        setError('')

        const records =
          await getNotifications({
            limit: 5,
            unreadOnly: true,
          })

        setPreview(records)
      } catch (previewError) {
        console.error(
          'Unable to load notification preview:',
          previewError
        )
        setError(
          previewError?.message ||
            'Unable to load notifications.'
        )
      } finally {
        setLoadingPreview(false)
      }
    }, [])

  useEffect(() => {
    if (!user?.id) {
      setUnreadCount(0)
      setPreview([])
      return undefined
    }

    let cancelled = false
    let stopSubscription = null

    function handleNotificationChange() {
      if (cancelled) {
        return
      }

      void refreshUnreadCount()

      if (open) {
        void loadPreview()
      }
    }

    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        'visible'
      ) {
        handleNotificationChange()
      }
    }

    async function startSubscription() {
      try {
        const stop =
          await subscribeToNotifications(
            handleNotificationChange
          )

        if (cancelled) {
          await stop()
          return
        }

        stopSubscription = stop
      } catch (subscriptionError) {
        if (!cancelled) {
          console.error(
            'Unable to subscribe to notifications:',
            subscriptionError
          )
        }
      }
    }

    void refreshUnreadCount()
    void startSubscription()

    window.addEventListener(
      NOTIFICATIONS_CHANGED_EVENT,
      handleNotificationChange
    )

    window.addEventListener(
      'focus',
      handleNotificationChange
    )

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange
    )

    return () => {
      cancelled = true

      window.removeEventListener(
        NOTIFICATIONS_CHANGED_EVENT,
        handleNotificationChange
      )

      window.removeEventListener(
        'focus',
        handleNotificationChange
      )

      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange
      )

      if (
        typeof stopSubscription ===
        'function'
      ) {
        void stopSubscription()
      }
    }
  }, [
    loadPreview,
    open,
    refreshUnreadCount,
    user?.id,
  ])

  useEffect(() => {
    if (!open) {
      return undefined
    }

    void loadPreview()

    function handlePointerDown(event) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(
          event.target
        )
      ) {
        setOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }

    document.addEventListener(
      'mousedown',
      handlePointerDown
    )
    document.addEventListener(
      'keydown',
      handleKeyDown
    )

    return () => {
      document.removeEventListener(
        'mousedown',
        handlePointerDown
      )
      document.removeEventListener(
        'keydown',
        handleKeyDown
      )
    }
  }, [loadPreview, open])

  if (!user || !profile) {
    return null
  }

  const notificationRoute =
    getNotificationRoute(profile.role)

  const visibleCount =
    unreadCount > 99
      ? '99+'
      : unreadCount

  async function openNotification(
    notification
  ) {
    try {
      if (!notification.read_at) {
        await markNotificationRead(
          notification.id
        )
      }

      setOpen(false)
      navigate(
        notification.link ||
          notificationRoute
      )
    } catch (openError) {
      console.error(
        'Unable to open notification:',
        openError
      )
    }
  }

  function viewAll() {
    setOpen(false)
    navigate(notificationRoute)
  }

  return (
    <div
      ref={wrapperRef}
      className="relative"
    >
      <button
        ref={buttonRef}
        type="button"
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border bg-white text-slate-600 transition hover:border-brand-300 hover:text-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-950 dark:text-slate-300"
        aria-label={
          unreadCount > 0
            ? `${unreadCount} unread notifications`
            : 'Notifications'
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Notifications"
        onClick={() =>
          setOpen((current) => !current)
        }
      >
        <Bell className="h-5 w-5" />

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black leading-none text-white">
            {visibleCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notification preview"
          className="absolute right-0 z-50 mt-3 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border bg-white shadow-xl dark:border-slate-800 dark:bg-slate-950"
        >
          <div className="flex items-center justify-between border-b p-4 dark:border-slate-800">
            <div>
              <p className="font-black">
                Notifications
              </p>
              <p className="text-xs text-slate-500">
                {unreadCount === 0
                  ? 'No unread updates'
                  : `${unreadCount} unread`}
              </p>
            </div>

            <button
              type="button"
              className="text-sm font-bold text-brand-600"
              onClick={viewAll}
            >
              View all
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto p-2">
            {loadingPreview ? (
              <div className="grid min-h-32 place-items-center text-sm text-slate-500">
                <LoaderCircle className="animate-spin" />
              </div>
            ) : error ? (
              <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
                {error}
              </div>
            ) : preview.length === 0 ? (
              <div className="grid min-h-32 place-items-center text-center">
                <div>
                  <Inbox className="mx-auto h-6 w-6 text-slate-400" />
                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    You are all caught up.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {preview.map(
                  (notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      className="w-full rounded-xl p-3 text-left transition hover:bg-slate-50 focus:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:hover:bg-slate-900 dark:focus:bg-slate-900"
                      onClick={() =>
                        openNotification(
                          notification
                        )
                      }
                    >
                      <p className="line-clamp-2 text-sm font-black">
                        {notification.title ||
                          'Notification'}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                        {notification.message ||
                          'You have a new update.'}
                      </p>
                      <p className="mt-2 text-[11px] font-semibold text-slate-400">
                        {getRelativeTime(
                          notification.created_at
                        )}
                      </p>
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
