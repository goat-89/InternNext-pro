import {
Activity,
Building2,
BriefcaseBusiness,
CalendarDays,
CheckCircle2,
Download,
FileText,
LoaderCircle,
RefreshCw,
Users,
} from 'lucide-react';

import {
useCallback,
useEffect,
useMemo,
useState,
} from 'react';

import toast from 'react-hot-toast';

import { DashboardShell } from '../components/Layout';
import { adminNav } from '../lib/dashboardNav';

import {
buildAdminDailyTrendsCsv,
buildAdminSummaryCsv,
buildStatusDistributionCsv,
downloadCsvFile,
getAdminReportingOverview,
} from '../lib/adminReportsApi';

const RANGE_OPTIONS = [
{ label: 'Last 7 days', value: 7 },
{ label: 'Last 30 days', value: 30 },
{ label: 'Last 90 days', value: 90 },
{ label: 'Last 180 days', value: 180 },
{ label: 'Last 365 days', value: 365 },
];

const EMPTY_OVERVIEW = {
generated_at: null,

period: {
days: 30,
date_from: null,
date_to: null,
},

summary: {
students: {},
employers: {},
companies: {},
internships: {},
applications: {},
},

daily_trends: [],
application_statuses: [],
internship_statuses: [],
company_statuses: [],
};

function formatNumber(value) {
const number = Number(value);

return new Intl.NumberFormat(
'en-IN'
).format(
Number.isFinite(number)
? number
: 0
);
}

function formatDate(value) {
if (!value) {
return '—';
}

const date = new Date(value);

if (
Number.isNaN(
date.getTime()
)
) {
return String(value);
}

return new Intl.DateTimeFormat(
'en-IN',
{
dateStyle: 'medium',
}
).format(date);
}

function formatDateTime(value) {
if (!value) {
return '—';
}

const date = new Date(value);

if (
Number.isNaN(
date.getTime()
)
) {
return String(value);
}

return new Intl.DateTimeFormat(
'en-IN',
{
dateStyle: 'medium',
timeStyle: 'short',
}
).format(date);
}

function formatLabel(value) {
return String(value ?? '')
.replace(/_/g, ' ')
.replace(
/\b\w/g,
(letter) =>
letter.toUpperCase()
);
}

function buildFilename(
prefix,
overview
) {
const dateFrom =
overview?.period?.date_from ||
'start';

const dateTo =
overview?.period?.date_to ||
'today';

return (
prefix +
'-' +
dateFrom +
'-to-' +
dateTo +
'.csv'
);
}

function SummaryCard({
title,
value,
secondaryLabel,
secondaryValue,
Icon,
}) {
return ( <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"> <div className="flex items-start justify-between gap-4"> <div> <p className="text-sm font-semibold text-slate-500">
{title} </p>

```
      <p className="mt-2 text-3xl font-black tracking-tight">
        {formatNumber(value)}
      </p>
    </div>

    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950/40">
      <Icon size={21} />
    </div>
  </div>

  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm dark:border-slate-800">
    <span className="text-slate-500">
      {secondaryLabel}
    </span>

    <span className="font-bold text-emerald-600 dark:text-emerald-400">
      +{formatNumber(
        secondaryValue
      )}
    </span>
  </div>
</article>


);
}

function StatusPanel({
title,
rows,
}) {
const safeRows =
Array.isArray(rows)
? rows
: [];

const total =
safeRows.reduce(
(sum, row) =>
sum +
Number(
row?.count || 0
),
0
);

return ( <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"> <div className="flex items-center justify-between gap-4"> <h3 className="font-black">
{title} </h3>


    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
      {formatNumber(total)} total
    </span>
  </div>

  <div className="mt-5 space-y-4">
    {safeRows.length === 0 && (
      <p className="text-sm text-slate-500">
        No status data is
        available yet.
      </p>
    )}

    {safeRows.map(
      (row) => {
        const count =
          Number(
            row?.count || 0
          );

        const percentage =
          total > 0
            ? Math.round(
                (
                  count /
                  total
                ) * 100
              )
            : 0;

        return (
          <div key={row.status}>
            <div className="mb-2 flex items-center justify-between gap-4 text-sm">
              <span className="font-semibold">
                {formatLabel(
                  row.status
                )}
              </span>

              <span className="text-slate-500">
                {formatNumber(
                  count
                )}{' '}
                · {percentage}%
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-brand-600"
                style={{
                  width:
                    percentage +
                    '%',
                }}
              />
            </div>
          </div>
        );
      }
    )}
  </div>
</article>


);
}

function TrendBarChart({
title,
subtitle,
rows,
series,
}) {
const safeRows =
Array.isArray(rows)
? rows
: [];

const maximum = Math.max(
1,


...safeRows.flatMap(
  (row) =>
    series.map(
      (item) =>
        Number(
          row?.[
            item.key
          ] || 0
        )
    )
)


);

return ( <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"> <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"> <div> <h3 className="font-black">
{title} </h3>


      <p className="mt-1 text-sm text-slate-500">
        {subtitle}
      </p>
    </div>

    <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500">
      {series.map(
        (item) => (
          <span
            key={item.key}
            className="inline-flex items-center gap-2"
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor:
                  item.color,
              }}
            />

            {item.label}
          </span>
        )
      )}
    </div>
  </div>

  {safeRows.length === 0 ? (
    <div className="mt-6 grid h-56 place-items-center rounded-2xl bg-slate-50 text-sm text-slate-500 dark:bg-slate-950">
      No trend data is
      available yet.
    </div>
  ) : (
    <div className="mt-6 overflow-x-auto pb-2">
      <div
        className="grid h-56 min-w-[720px] items-end gap-2"
        style={{
          gridTemplateColumns:
            'repeat(' +
            safeRows.length +
            ', minmax(20px, 1fr))',
        }}
      >
        {safeRows.map(
          (row) => (
            <div
              key={row.date}
              className="flex h-full min-w-0 flex-col justify-end"
              title={series
                .map(
                  (item) =>
                    item.label +
                    ': ' +
                    formatNumber(
                      row?.[
                        item.key
                      ]
                    )
                )
                .join('\n')}
            >
              <div className="flex h-44 items-end justify-center gap-1">
                {series.map(
                  (item) => {
                    const value =
                      Number(
                        row?.[
                          item.key
                        ] || 0
                      );

                    const height =
                      value > 0
                        ? Math.max(
                            4,

                            (
                              value /
                              maximum
                            ) * 100
                          )
                        : 1;

                    return (
                      <div
                        key={
                          item.key
                        }
                        className="w-full max-w-3 rounded-t-md opacity-90 transition hover:opacity-100"
                        style={{
                          backgroundColor:
                            item.color,

                          height:
                            height +
                            '%',
                        }}
                      />
                    );
                  }
                )}
              </div>

              <p className="mt-2 truncate text-center text-[10px] text-slate-500">
                {String(
                  row.date || ''
                ).slice(5)}
              </p>
            </div>
          )
        )}
      </div>
    </div>
  )}
</article>


);
}

export default function AdminReports() {
const [
reportDays,
setReportDays,
] = useState(30);

const [
overview,
setOverview,
] = useState(
EMPTY_OVERVIEW
);

const [
loading,
setLoading,
] = useState(true);

const [
refreshing,
setRefreshing,
] = useState(false);

const [
error,
setError,
] = useState('');

const loadReport =
useCallback(
async (
showRefreshState =
false
) => {
if (
showRefreshState
) {
setRefreshing(true);
} else {
setLoading(true);
}


    setError('');

    try {
      const result =
        await getAdminReportingOverview(
          reportDays
        );

      setOverview(
        result ||
          EMPTY_OVERVIEW
      );
    } catch (
      loadError
    ) {
      console.error(
        'Unable to load admin reports:',
        loadError
      );

      const message =
        loadError?.message ||
        'Unable to load the admin report.';

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  },
  [reportDays]
);


useEffect(() => {
loadReport(false);
}, [loadReport]);

const summary =
overview?.summary ||
EMPTY_OVERVIEW.summary;

const dailyTrends =
Array.isArray(
overview?.daily_trends
)
? overview.daily_trends
: [];

const periodLabel =
useMemo(() => {
const from =
formatDate(
overview?.period
?.date_from
);


  const to =
    formatDate(
      overview?.period
        ?.date_to
    );

  return (
    from +
    ' – ' +
    to
  );
}, [overview]);


function exportSummary() {
try {
downloadCsvFile(
buildAdminSummaryCsv(
overview
),


    buildFilename(
      'internnext-summary',
      overview
    )
  );

  toast.success(
    'Summary CSV downloaded.'
  );
} catch (
  exportError
) {
  toast.error(
    exportError?.message ||
      'Unable to export the summary.'
  );
}


}

function exportTrends() {
try {
downloadCsvFile(
buildAdminDailyTrendsCsv(
overview
),


    buildFilename(
      'internnext-daily-trends',
      overview
    )
  );

  toast.success(
    'Daily trends CSV downloaded.'
  );
} catch (
  exportError
) {
  toast.error(
    exportError?.message ||
      'Unable to export daily trends.'
  );
}


}

function exportStatuses() {
try {
downloadCsvFile(
buildStatusDistributionCsv(
overview
),


    buildFilename(
      'internnext-statuses',
      overview
    )
  );

  toast.success(
    'Status CSV downloaded.'
  );
} catch (
  exportError
) {
  toast.error(
    exportError?.message ||
      'Unable to export status data.'
  );
}


}

return ( <DashboardShell
   title="Reports"
   navItems={adminNav}
 > <div className="space-y-6"> <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-brand-950 p-6 text-white shadow-xl sm:p-8"> <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between"> <div> <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-200"> <FileText
               size={14}
             />


            Platform
            intelligence
          </div>

          <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
            Admin reporting
            overview
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            Monitor signups,
            company activity,
            internship supply,
            applications,
            interviews, and
            hiring outcomes
            across InternNext.
          </p>

          <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-300">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5">
              <CalendarDays
                size={15}
              />

              {periodLabel}
            </span>

            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5">
              <Activity
                size={15}
              />

              Updated{' '}
              {formatDateTime(
                overview?.generated_at
              )}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row xl:flex-col">
          <select
            value={
              reportDays
            }
            onChange={(
              event
            ) =>
              setReportDays(
                Number(
                  event
                    .target
                    .value
                )
              )
            }
            className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold text-white outline-none backdrop-blur [&>option]:text-slate-900"
          >
            {RANGE_OPTIONS.map(
              (option) => (
                <option
                  key={
                    option.value
                  }
                  value={
                    option.value
                  }
                >
                  {option.label}
                </option>
              )
            )}
          </select>

          <button
            type="button"
            onClick={() =>
              loadReport(true)
            }
            disabled={
              refreshing
            }
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {refreshing ? (
              <LoaderCircle
                className="animate-spin"
                size={17}
              />
            ) : (
              <RefreshCw
                size={17}
              />
            )}

            Refresh report
          </button>
        </div>
      </div>
    </section>

    {loading && (
      <div className="grid min-h-72 place-items-center rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="text-center">
          <LoaderCircle
            className="mx-auto animate-spin text-brand-600"
            size={34}
          />

          <p className="mt-3 text-sm font-semibold text-slate-500">
            Loading platform
            report…
          </p>
        </div>
      </div>
    )}

    {!loading &&
      error && (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
          <p className="font-black">
            Report
            unavailable
          </p>

          <p className="mt-2 text-sm">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              loadReport(
                false
              )
            }
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white"
          >
            <RefreshCw
              size={16}
            />

            Try again
          </button>
        </div>
      )}

    {!loading &&
      !error && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryCard
              title="Students"
              value={
                summary
                  .students
                  ?.total
              }
              secondaryLabel="New in period"
              secondaryValue={
                summary
                  .students
                  ?.new_in_period
              }
              Icon={Users}
            />

            <SummaryCard
              title="Employers"
              value={
                summary
                  .employers
                  ?.total
              }
              secondaryLabel="New in period"
              secondaryValue={
                summary
                  .employers
                  ?.new_in_period
              }
              Icon={Users}
            />

            <SummaryCard
              title="Companies"
              value={
                summary
                  .companies
                  ?.total
              }
              secondaryLabel="New in period"
              secondaryValue={
                summary
                  .companies
                  ?.new_in_period
              }
              Icon={Building2}
            />

            <SummaryCard
              title="Internships"
              value={
                summary
                  .internships
                  ?.total
              }
              secondaryLabel="New in period"
              secondaryValue={
                summary
                  .internships
                  ?.new_in_period
              }
              Icon={
                BriefcaseBusiness
              }
            />

            <SummaryCard
              title="Applications"
              value={
                summary
                  .applications
                  ?.total
              }
              secondaryLabel="New in period"
              secondaryValue={
                summary
                  .applications
                  ?.new_in_period
              }
              Icon={
                CheckCircle2
              }
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <TrendBarChart
              title="Acquisition activity"
              subtitle="New student and employer registrations by day."
              rows={
                dailyTrends
              }
              series={[
                {
                  key:
                    'students',
                  label:
                    'Students',
                  color:
                    '#2563eb',
                },

                {
                  key:
                    'employers',
                  label:
                    'Employers',
                  color:
                    '#8b5cf6',
                },
              ]}
            />

            <TrendBarChart
              title="Application activity"
              subtitle="Applications, interviews, and selections created by day."
              rows={
                dailyTrends
              }
              series={[
                {
                  key:
                    'applications',
                  label:
                    'Applications',
                  color:
                    '#0f766e',
                },

                {
                  key:
                    'interviews',
                  label:
                    'Interviews',
                  color:
                    '#d97706',
                },

                {
                  key:
                    'selected',
                  label:
                    'Selected',
                  color:
                    '#16a34a',
                },
              ]}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <StatusPanel
              title="Application statuses"
              rows={
                overview
                  .application_statuses
              }
            />

            <StatusPanel
              title="Internship statuses"
              rows={
                overview
                  .internship_statuses
              }
            />

            <StatusPanel
              title="Company statuses"
              rows={
                overview
                  .company_statuses
              }
            />
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
              <div>
                <h3 className="font-black">
                  Daily activity
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Complete
                  activity
                  breakdown for
                  the selected
                  period.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={
                    exportSummary
                  }
                  className="btn-secondary gap-2"
                >
                  <Download
                    size={16}
                  />

                  Summary CSV
                </button>

                <button
                  type="button"
                  onClick={
                    exportTrends
                  }
                  className="btn-secondary gap-2"
                >
                  <Download
                    size={16}
                  />

                  Trends CSV
                </button>

                <button
                  type="button"
                  onClick={
                    exportStatuses
                  }
                  className="btn-secondary gap-2"
                >
                  <Download
                    size={16}
                  />

                  Status CSV
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950">
                  <tr>
                    <th className="px-5 py-4">
                      Date
                    </th>

                    <th className="px-5 py-4">
                      Students
                    </th>

                    <th className="px-5 py-4">
                      Employers
                    </th>

                    <th className="px-5 py-4">
                      Companies
                    </th>

                    <th className="px-5 py-4">
                      Internships
                    </th>

                    <th className="px-5 py-4">
                      Applications
                    </th>

                    <th className="px-5 py-4">
                      Interviews
                    </th>

                    <th className="px-5 py-4">
                      Selected
                    </th>

                    <th className="px-5 py-4">
                      Rejected
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {dailyTrends.length ===
                    0 && (
                    <tr>
                      <td
                        colSpan={
                          9
                        }
                        className="px-5 py-12 text-center text-slate-500"
                      >
                        No daily
                        activity
                        is
                        available
                        for this
                        period.
                      </td>
                    </tr>
                  )}

                  {dailyTrends.map(
                    (
                      trend
                    ) => (
                      <tr
                        key={
                          trend.date
                        }
                        className="hover:bg-slate-50 dark:hover:bg-slate-950/60"
                      >
                        <td className="whitespace-nowrap px-5 py-4 font-bold">
                          {formatDate(
                            trend.date
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {formatNumber(
                            trend.students
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {formatNumber(
                            trend.employers
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {formatNumber(
                            trend.companies
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {formatNumber(
                            trend.internships
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {formatNumber(
                            trend.applications
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {formatNumber(
                            trend.interviews
                          )}
                        </td>

                        <td className="px-5 py-4 text-emerald-600 dark:text-emerald-400">
                          {formatNumber(
                            trend.selected
                          )}
                        </td>

                        <td className="px-5 py-4 text-rose-600 dark:text-rose-400">
                          {formatNumber(
                            trend.rejected
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
  </div>
</DashboardShell>

);
}
