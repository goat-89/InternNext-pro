import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  BellRing,
  LoaderCircle,
  Save,
  ShieldCheck,
} from 'lucide-react'
import toast from 'react-hot-toast'

import { DashboardShell } from '../components/Layout'
import { EmptyState } from '../components/UI'
import { useAuth } from '../context/AuthContext'
import {
  adminNav,
  employerNav,
  studentNav,
} from '../lib/dashboardNav'
import {
  getMyNotificationPreferences,
  notificationChannels,
  notificationPreferenceCategories,
  updateMyNotificationPreferences,
} from '../lib/notificationPreferencesApi'

function getRoleNavigation(role) {
  if (role === 'employer') {
    return employerNav
  }

  if (role === 'admin') {
    return adminNav
  }

  return studentNav
}

function normalizeTime(value, fallback) {
  if (!value) {
    return fallback
  }

  return String(value).slice(0, 5)
}

export default function NotificationSettings() {
  const { profile } = useAuth()
  const role =
    profile?.role || 'student'

  const [settings, setSettings] =
    useState(null)
  const [
    categoryPreferences,
    setCategoryPreferences,
  ] = useState({})
  const [providers, setProviders] =
    useState({})
  const [loading, setLoading] =
    useState(true)
  const [saving, setSaving] =
    useState(false)
  const [error, setError] =
    useState('')

  const navItems = useMemo(
    () => getRoleNavigation(role),
    [role]
  )

  useEffect(() => {
    let active = true

    async function loadPreferences() {
      try {
        setLoading(true)
        setError('')

        const preferences =
          await getMyNotificationPreferences()

        if (!active) {
          return
        }

        setSettings(
          preferences.settings
        )
        setCategoryPreferences(
          preferences.categoryPreferences
        )
        setProviders(
          preferences.providers
        )
      } catch (loadError) {
        console.error(
          'Unable to load notification preferences:',
          loadError
        )

        if (active) {
          setError(
            loadError?.message ||
              'Unable to load notification preferences.'
          )
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadPreferences()

    return () => {
      active = false
    }
  }, [])

  function updateSetting(key, value) {
    setSettings((current) => ({
      ...(current || {}),
      [key]: value,
    }))
  }

  function updateCategory(
    categoryKey,
    channelKey,
    value
  ) {
    setCategoryPreferences(
      (current) => {
        const next = {
          ...current,
          [categoryKey]: {
            ...(current[
              categoryKey
            ] || {}),
            category: categoryKey,
            [channelKey]: value,
          },
        }

        if (categoryKey === 'security') {
          next.security = {
            ...next.security,
            in_app_enabled: true,
            email_enabled: true,
          }
        }

        return next
      }
    )
  }

  async function savePreferences(event) {
    event.preventDefault()

    try {
      setSaving(true)

      const updated =
        await updateMyNotificationPreferences({
          settings,
          categoryPreferences,
        })

      setSettings(updated.settings)
      setCategoryPreferences(
        updated.categoryPreferences
      )
      setProviders(updated.providers)

      toast.success(
        'Notification preferences saved.'
      )
    } catch (saveError) {
      toast.error(
        saveError?.message ||
          'Unable to save preferences.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardShell
      title="Notification settings"
      navItems={navItems}
    >
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="card p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
              <BellRing size={21} />
            </span>

            <div>
              <h1 className="text-xl font-black">
                Notification preferences
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Choose how InternNext sends updates. Security alerts keep in-app and email enabled.
              </p>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="card grid min-h-64 place-items-center p-8">
            <div className="text-center">
              <LoaderCircle className="mx-auto animate-spin text-brand-600" />
              <p className="mt-3 text-sm text-slate-500">
                Loading preferences...
              </p>
            </div>
          </div>
        ) : error ? (
          <EmptyState
            title="Unable to load preferences"
            text={error}
            action={
              <button
                type="button"
                className="btn-primary"
                onClick={() =>
                  window.location.reload()
                }
              >
                Try again
              </button>
            }
          />
        ) : (
          <form
            className="space-y-6"
            onSubmit={savePreferences}
          >
            <section className="card p-5 sm:p-6">
              <h2 className="font-black">
                Channels
              </h2>

              <div className="mt-4 grid gap-3 md:grid-cols-5">
                {notificationChannels.map(
                  (channel) => {
                    const available =
                      channel.providerKey ===
                        'in_app' ||
                      Boolean(
                        providers[
                          channel
                            .providerKey
                        ]
                      )

                    return (
                      <div
                        key={channel.key}
                        className="rounded-2xl border p-4 text-sm dark:border-slate-800"
                      >
                        <p className="font-black">
                          {channel.label}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {available
                            ? 'Available'
                            : 'Not configured'}
                        </p>
                      </div>
                    )
                  }
                )}
              </div>
            </section>

            <section className="card p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <ShieldCheck
                  size={18}
                  className="text-brand-600"
                />
                <h2 className="font-black">
                  Categories
                </h2>
              </div>

              <div className="mt-5 space-y-4">
                {notificationPreferenceCategories.map(
                  (category) => {
                    const preference =
                      categoryPreferences[
                        category.key
                      ] || {}

                    return (
                      <div
                        key={category.key}
                        className="rounded-2xl border p-4 dark:border-slate-800"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="max-w-lg">
                            <p className="font-black">
                              {category.label}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-slate-500">
                              {
                                category.description
                              }
                            </p>
                            {category.locked && (
                              <p className="mt-2 text-xs font-semibold text-brand-600">
                                Critical alerts cannot be fully disabled.
                              </p>
                            )}
                          </div>

                          <div className="grid gap-2 sm:grid-cols-5">
                            {notificationChannels.map(
                              (channel) => {
                                const available =
                                  channel.providerKey ===
                                    'in_app' ||
                                  Boolean(
                                    providers[
                                      channel
                                        .providerKey
                                    ]
                                  )
                                const locked =
                                  category.locked &&
                                  [
                                    'in_app_enabled',
                                    'email_enabled',
                                  ].includes(
                                    channel.key
                                  )

                                return (
                                  <label
                                    key={
                                      channel.key
                                    }
                                    className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-sm dark:border-slate-800 ${
                                      !available
                                        ? 'opacity-50'
                                        : ''
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={Boolean(
                                        preference[
                                          channel
                                            .key
                                        ]
                                      )}
                                      disabled={
                                        !available ||
                                        locked
                                      }
                                      onChange={(
                                        event
                                      ) =>
                                        updateCategory(
                                          category.key,
                                          channel.key,
                                          event
                                            .target
                                            .checked
                                        )
                                      }
                                    />
                                    <span>
                                      {
                                        channel.label
                                      }
                                    </span>
                                  </label>
                                )
                              }
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  }
                )}
              </div>
            </section>

            <section className="card p-5 sm:p-6">
              <h2 className="font-black">
                Quiet hours and digest
              </h2>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="flex min-h-11 items-center gap-3 rounded-2xl border px-4 py-3 dark:border-slate-800">
                  <input
                    type="checkbox"
                    checked={Boolean(
                      settings
                        ?.quiet_hours_enabled
                    )}
                    onChange={(event) =>
                      updateSetting(
                        'quiet_hours_enabled',
                        event.target.checked
                      )
                    }
                  />
                  <span className="font-semibold">
                    Enable quiet hours
                  </span>
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    Timezone
                  </span>
                  <input
                    className="input mt-2"
                    value={
                      settings?.timezone ||
                      'Asia/Kolkata'
                    }
                    onChange={(event) =>
                      updateSetting(
                        'timezone',
                        event.target.value
                      )
                    }
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    Quiet hours start
                  </span>
                  <input
                    type="time"
                    className="input mt-2"
                    value={normalizeTime(
                      settings
                        ?.quiet_hours_start,
                      '22:00'
                    )}
                    onChange={(event) =>
                      updateSetting(
                        'quiet_hours_start',
                        event.target.value
                      )
                    }
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    Quiet hours end
                  </span>
                  <input
                    type="time"
                    className="input mt-2"
                    value={normalizeTime(
                      settings
                        ?.quiet_hours_end,
                      '07:00'
                    )}
                    onChange={(event) =>
                      updateSetting(
                        'quiet_hours_end',
                        event.target.value
                      )
                    }
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    Digest frequency
                  </span>
                  <select
                    className="input mt-2"
                    value={
                      settings
                        ?.digest_frequency ||
                      'never'
                    }
                    onChange={(event) =>
                      updateSetting(
                        'digest_frequency',
                        event.target.value
                      )
                    }
                  >
                    <option value="never">
                      Never
                    </option>
                    <option value="daily">
                      Daily
                    </option>
                    <option value="weekly">
                      Weekly
                    </option>
                  </select>
                </label>
              </div>
            </section>

            <div className="flex justify-end">
              <button
                type="submit"
                className="btn-primary"
                disabled={saving}
              >
                {saving ? (
                  <LoaderCircle
                    className="animate-spin"
                    size={18}
                  />
                ) : (
                  <Save size={18} />
                )}
                Save preferences
              </button>
            </div>
          </form>
        )}
      </div>
    </DashboardShell>
  )
}
