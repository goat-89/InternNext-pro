import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Bell,
  CheckCheck,
  Archive,
  Inbox,
  LoaderCircle,
  Settings,
  Trash2,
} from 'lucide-react';

import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import {
  DashboardShell,
} from '../components/Layout';

import {
  useAuth,
} from '../context/AuthContext';

import {
  adminNav,
  employerNav,
  studentNav,
} from '../lib/dashboardNav';

import {
  deleteNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  archiveNotification,
  normalizeNotification,
  subscribeToNotifications,
} from '../lib/notificationsApi';

function getNotificationPath(role) {
  if (role === 'employer') {
    return '/employer/notifications';
  }

  if (role === 'admin') {
    return '/admin/notifications';
  }

  return '/student/notifications';
}

function getNotificationSettingsPath(role) {
  if (role === 'employer') {
    return '/employer/notification-settings';
  }

  if (role === 'admin') {
    return '/admin/notification-settings';
  }

  return '/student/notification-settings';
}

function getRoleNavigation(role) {
  let source = studentNav;

  if (role === 'employer') {
    source = employerNav;
  }

  if (role === 'admin') {
    source = adminNav;
  }

  const notificationPath =
    getNotificationPath(role);

  const alreadyIncluded =
    source.some(
      function hasNotificationItem(item) {
        return item[1] === notificationPath;
      }
    );

  if (alreadyIncluded) {
    return source;
  }

  const settingsIndex =
    source.findIndex(
      function findSettingsItem(item) {
        return item[0] === 'Settings';
      }
    );

  const notificationItem = [
    'Notifications',
    notificationPath,
    Bell,
  ];

  if (settingsIndex === -1) {
    return [
      ...source,
      notificationItem,
    ];
  }

  return [
    ...source.slice(0, settingsIndex),
    notificationItem,
    ...source.slice(settingsIndex),
  ];
}

function formatDate(value) {
  if (!value) {
    return 'Unknown time';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown time';
  }

  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function getRelativeTime(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  const timestamp = date.getTime();

  if (Number.isNaN(timestamp)) {
    return '';
  }

  const differenceSeconds =
    Math.round(
      (timestamp - Date.now()) / 1000
    );

  const absoluteSeconds =
    Math.abs(differenceSeconds);

  let divisor = 1;
  let unit = 'second';

  if (absoluteSeconds >= 86400) {
    divisor = 86400;
    unit = 'day';
  } else if (absoluteSeconds >= 3600) {
    divisor = 3600;
    unit = 'hour';
  } else if (absoluteSeconds >= 60) {
    divisor = 60;
    unit = 'minute';
  }

  const amount =
    Math.round(
      differenceSeconds / divisor
    );

  return new Intl.RelativeTimeFormat(
    undefined,
    { numeric: 'auto' }
  ).format(amount, unit);
}

const pageSize = 25;

const categoryOptions = [
  ['all', 'All categories'],
  ['application', 'Applications'],
  ['interview', 'Interviews'],
  ['payment', 'Payments'],
  ['subscription', 'Subscriptions'],
  ['support', 'Support'],
  ['moderation', 'Moderation'],
  ['security', 'Security'],
  ['system', 'System'],
];

function mergeNotification(
  items,
  notification
) {
  if (!notification?.id) {
    return items;
  }

  const normalized =
    normalizeNotification(
      notification
    );

  const existingIndex =
    items.findIndex(
      function findItem(item) {
        return item.id === normalized.id;
      }
    );

  if (existingIndex === -1) {
    return [
      normalized,
      ...items,
    ].sort(
      function sortNewest(first, second) {
        return (
          new Date(
            second.created_at
          ).getTime() -
          new Date(
            first.created_at
          ).getTime()
        );
      }
    );
  }

  return items.map(
    function updateItem(item) {
      if (item.id !== normalized.id) {
        return item;
      }

      return {
        ...item,
        ...normalized,
      };
    }
  );
}

export default function Notifications() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [notifications, setNotifications] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [filter, setFilter] =
    useState('all');

  const [category, setCategory] =
    useState('all');

  const [hasMore, setHasMore] =
    useState(false);

  const [loadingMore, setLoadingMore] =
    useState(false);

  const [markingAll, setMarkingAll] =
    useState(false);

  const [workingId, setWorkingId] =
    useState(null);

  const role =
    profile?.role || 'student';

  const navItems = useMemo(
    function buildNavigation() {
      return getRoleNavigation(role);
    },
    [role]
  );

  const unreadCount = useMemo(
    function countUnread() {
      return notifications.filter(
        function isUnread(notification) {
          return !notification.read_at;
        }
      ).length;
    },
    [notifications]
  );

  const visibleNotifications = useMemo(
    function filterNotifications() {
      if (filter === 'unread') {
        return notifications.filter(
          function isUnread(notification) {
            return !notification.read_at;
          }
        );
      }

      return notifications;
    },
    [filter, notifications]
  );

  const loadNotifications = useCallback(
    async function loadNotifications(options) {
      const silent =
        options?.silent === true;
      const append =
        options?.append === true;
      const cursor =
        options?.cursor || null;

      try {
        if (append) {
          setLoadingMore(true);
        } else if (!silent) {
          setLoading(true);
        }

        setError('');

        const records =
          await getNotifications({
            limit: pageSize,
            cursor,
            category,
            unreadOnly:
              filter === 'unread',
          });

        setNotifications(
          function updateNotifications(
            current
          ) {
            if (!append) {
              return records;
            }

            const byId = new Map(
              current.map(
                function mapCurrent(item) {
                  return [
                    item.id,
                    item,
                  ];
                }
              )
            );

            records.forEach(
              function addRecord(record) {
                byId.set(
                  record.id,
                  record
                );
              }
            );

            return Array.from(
              byId.values()
            ).sort(
              function sortNewest(
                first,
                second
              ) {
                return (
                  new Date(
                    second.created_at
                  ).getTime() -
                  new Date(
                    first.created_at
                  ).getTime()
                );
              }
            );
          }
        );

        setHasMore(
          records.length === pageSize
        );
      } catch (loadError) {
        console.error(
          'Unable to load notifications:',
          loadError
        );

        setError(
          loadError?.message ||
            'Unable to load notifications.'
        );
      } finally {
        if (append) {
          setLoadingMore(false);
        } else if (!silent) {
          setLoading(false);
        }
      }
    },
    [category, filter]
  );

  useEffect(
    function loadOnMount() {
      loadNotifications();
    },
    [loadNotifications]
  );

  useEffect(
    function subscribeToChanges() {
      let active = true;
      let unsubscribe = null;

      subscribeToNotifications(
        function handleRealtimeChange(payload) {
          if (active) {
            if (
              payload?.eventType ===
              'DELETE'
            ) {
              setNotifications(
                function removeDeleted(
                  items
                ) {
                  return items.filter(
                    function keepItem(
                      item
                    ) {
                      return (
                        item.id !==
                        payload.old?.id
                      );
                    }
                  );
                }
              );
              return;
            }

            if (payload?.new?.id) {
              const next =
                normalizeNotification(
                  payload.new
                );

              const categoryMatches =
                category === 'all' ||
                next.category === category;
              const unreadMatches =
                filter !== 'unread' ||
                !next.read_at;

              setNotifications(
                function reconcileRealtime(
                  items
                ) {
                  if (
                    !categoryMatches ||
                    !unreadMatches ||
                    next.archived_at
                  ) {
                    return items.filter(
                      function removeItem(
                        item
                      ) {
                        return (
                          item.id !==
                          next.id
                        );
                      }
                    );
                  }

                  return mergeNotification(
                    items,
                    next
                  );
                }
              );

              return;
            }

            loadNotifications({
              silent: true,
            });
          }
        }
      )
        .then(
          function saveCleanup(cleanup) {
            if (!active) {
              cleanup();
              return;
            }

            unsubscribe = cleanup;
          }
        )
        .catch(
          function handleSubscriptionError(
            subscriptionError
          ) {
            console.error(
              'Unable to subscribe to notifications:',
              subscriptionError
            );
          }
        );

      return function cleanupSubscription() {
        active = false;

        if (
          typeof unsubscribe === 'function'
        ) {
          unsubscribe();
        }
      };
    },
    [
      category,
      filter,
      loadNotifications,
    ]
  );

  async function handleMarkRead(
    notification
  ) {
    if (
      !notification ||
      notification.read_at
    ) {
      return;
    }

    try {
      setWorkingId(notification.id);

      const updated =
        await markNotificationRead(
          notification.id
        );

      setNotifications(
        function updateCurrent(items) {
          return items.map(
            function updateItem(item) {
              if (
                item.id !== notification.id
              ) {
                return item;
              }

              return {
                ...item,
                read_at: updated.read_at,
              };
            }
          );
        }
      );
    } catch (markError) {
      toast.error(
        markError?.message ||
          'Unable to mark notification as read.'
      );
    } finally {
      setWorkingId(null);
    }
  }

  async function handleOpenNotification(
    notification
  ) {
    try {
      if (!notification.read_at) {
        await handleMarkRead(notification);
      }

      if (notification.link) {
        navigate(notification.link);
      }
    } catch (openError) {
      console.error(
        'Unable to open notification:',
        openError
      );
    }
  }

  async function handleMarkAllRead() {
    if (unreadCount === 0) {
      return;
    }

    try {
      setMarkingAll(true);

      await markAllNotificationsRead();

      const readAt =
        new Date().toISOString();

      setNotifications(
        function markEveryItemRead(items) {
          return items.map(
            function updateItem(item) {
              if (item.read_at) {
                return item;
              }

              return {
                ...item,
                read_at: readAt,
              };
            }
          );
        }
      );

      toast.success(
        'All notifications marked as read.'
      );
    } catch (markAllError) {
      toast.error(
        markAllError?.message ||
          'Unable to mark all notifications as read.'
      );
    } finally {
      setMarkingAll(false);
    }
  }

  async function handleDelete(
    notification
  ) {
    try {
      setWorkingId(notification.id);

      await deleteNotification(
        notification.id
      );

      setNotifications(
        function removeDeletedItem(items) {
          return items.filter(
            function keepItem(item) {
              return item.id !== notification.id;
            }
          );
        }
      );

      toast.success(
        'Notification deleted.'
      );
    } catch (deleteError) {
      toast.error(
        deleteError?.message ||
          'Unable to delete notification.'
      );
    } finally {
      setWorkingId(null);
    }
  }

  async function handleArchive(
    notification
  ) {
    try {
      setWorkingId(notification.id);

      await archiveNotification(
        notification.id
      );

      setNotifications(
        function removeArchivedItem(items) {
          return items.filter(
            function keepItem(item) {
              return item.id !== notification.id;
            }
          );
        }
      );

      toast.success(
        'Notification archived.'
      );
    } catch (archiveError) {
      toast.error(
        archiveError?.message ||
          'Unable to archive notification.'
      );
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <DashboardShell
      title="Notifications"
      navItems={navItems}
    >
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="card p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
                  <Bell size={21} />
                </span>

                <div>
                  <h2 className="text-xl font-black">
                    Notification centre
                  </h2>

                  <p className="text-sm text-slate-500">
                    {unreadCount === 0
                      ? 'You are all caught up.'
                      : unreadCount +
                        ' unread notification' +
                        (unreadCount === 1
                          ? ''
                          : 's') +
                        '.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                className="btn-secondary justify-center"
                onClick={function openSettings() {
                  navigate(
                    getNotificationSettingsPath(
                      role
                    )
                  );
                }}
              >
                <Settings size={17} />
                Settings
              </button>

              <button
                type="button"
                className="btn-secondary justify-center"
                disabled={
                  markingAll ||
                  unreadCount === 0
                }
                onClick={handleMarkAllRead}
              >
                {markingAll ? (
                  <LoaderCircle
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <CheckCheck size={17} />
                )}

                Mark all read
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t pt-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
            <button
              type="button"
              className={
                filter === 'all'
                  ? 'btn-primary'
                  : 'btn-secondary'
              }
              onClick={function showAll() {
                setFilter('all');
              }}
            >
              All ({notifications.length})
            </button>

            <button
              type="button"
              className={
                filter === 'unread'
                  ? 'btn-primary'
                  : 'btn-secondary'
              }
              onClick={function showUnread() {
                setFilter('unread');
              }}
            >
              Unread ({unreadCount})
            </button>
            </div>

            <select
              className="input sm:w-56"
              value={category}
              onChange={function changeCategory(
                event
              ) {
                setCategory(
                  event.target.value
                );
              }}
              aria-label="Filter notifications by category"
            >
              {categoryOptions.map(
                function renderCategory([
                  value,
                  label,
                ]) {
                  return (
                    <option
                      key={value}
                      value={value}
                    >
                      {label}
                    </option>
                  );
                }
              )}
            </select>
          </div>
        </section>

        {loading ? (
          <div className="card grid min-h-64 place-items-center p-8">
            <div className="text-center">
              <LoaderCircle className="mx-auto animate-spin text-brand-600" />
              <p className="mt-3 text-sm text-slate-500">
                Loading notifications...
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="card border-red-200 p-6 dark:border-red-900">
            <p className="font-bold text-red-700 dark:text-red-300">
              Unable to load notifications
            </p>

            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {error}
            </p>

            <button
              type="button"
              className="btn-secondary mt-4"
              onClick={function retryLoad() {
                loadNotifications();
              }}
            >
              Try again
            </button>
          </div>
        ) : visibleNotifications.length === 0 ? (
          <div className="card grid min-h-64 place-items-center p-8 text-center">
            <div>
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800">
                <Inbox size={24} />
              </span>

              <h3 className="mt-4 text-lg font-black">
                {filter === 'unread'
                  ? 'No unread notifications'
                  : 'No notifications yet'}
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                {filter === 'unread'
                  ? 'New unread notifications will appear here.'
                  : 'Updates about applications, internships, interviews, and account activity will appear here.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleNotifications.map(
              function renderNotification(
                notification
              ) {
                const unread =
                  !notification.read_at;

                const working =
                  workingId ===
                  notification.id;

                return (
                  <article
                    key={notification.id}
                    className={
                      'card overflow-hidden border transition ' +
                      (unread
                        ? 'border-brand-200 bg-brand-50/40 dark:border-brand-900 dark:bg-brand-950/10'
                        : '')
                    }
                  >
                    <div className="flex gap-4 p-5">
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={function openItem() {
                          handleOpenNotification(
                            notification
                          );
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={
                              'mt-1 h-2.5 w-2.5 shrink-0 rounded-full ' +
                              (unread
                                ? 'bg-brand-600'
                                : 'bg-slate-300 dark:bg-slate-700')
                            }
                          />

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3
                                className={
                                  unread
                                    ? 'font-black'
                                    : 'font-bold'
                                }
                              >
                                {notification.title ||
                                  'Notification'}
                              </h3>

                              {unread && (
                                <span className="badge bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                                  New
                                </span>
                              )}
                            </div>

                            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                              {notification.message ||
                                'You have a new update.'}
                            </p>

                            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                              <span>
                                {getRelativeTime(
                                  notification.created_at
                                )}
                              </span>

                              <span aria-hidden="true">
                                -
                              </span>

                              <span>
                                {formatDate(
                                  notification.created_at
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>

                      <div className="flex shrink-0 items-start gap-2">
                        {unread && (
                          <button
                            type="button"
                            className="btn-secondary px-3"
                            disabled={working}
                            aria-label="Mark notification as read"
                            onClick={function markItemRead() {
                              handleMarkRead(
                                notification
                              );
                            }}
                          >
                            {working ? (
                              <LoaderCircle
                                size={16}
                                className="animate-spin"
                              />
                            ) : (
                              <CheckCheck
                                size={16}
                              />
                            )}
                          </button>
                        )}

                        <button
                          type="button"
                          className="btn-secondary px-3"
                          disabled={working}
                          aria-label="Archive notification"
                          onClick={function archiveItem() {
                            handleArchive(
                              notification
                            );
                          }}
                        >
                          {working ? (
                            <LoaderCircle
                              size={16}
                              className="animate-spin"
                            />
                          ) : (
                            <Archive size={16} />
                          )}
                        </button>

                        <button
                          type="button"
                          className="btn-secondary px-3 text-red-600 hover:text-red-700"
                          disabled={working}
                          aria-label="Delete notification"
                          onClick={function deleteItem() {
                            handleDelete(
                              notification
                            );
                          }}
                        >
                          {working ? (
                            <LoaderCircle
                              size={16}
                              className="animate-spin"
                            />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              }
            )}

            {hasMore && (
              <div className="flex justify-center pt-3">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={loadingMore}
                  onClick={function loadMoreNotifications() {
                    const last =
                      notifications[
                        notifications.length -
                          1
                      ];

                    loadNotifications({
                      append: true,
                      cursor:
                        last?.created_at,
                    });
                  }}
                >
                  {loadingMore && (
                    <LoaderCircle
                      className="animate-spin"
                      size={17}
                    />
                  )}
                  Load more
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
