import { supabase } from './supabase';

const DEFAULT_REPORT_DAYS = 30;
const MIN_REPORT_DAYS = 7;
const MAX_REPORT_DAYS = 365;

function normalizeReportDays(value) {
const parsed = Number.parseInt(value, 10);

if (!Number.isFinite(parsed)) {
return DEFAULT_REPORT_DAYS;
}

return Math.min(
MAX_REPORT_DAYS,
Math.max(MIN_REPORT_DAYS, parsed)
);
}

function protectCsvValue(value) {
const text =
value === null || value === undefined
? ''
: String(value);

return /^[=+-@]/.test(text)
? "'" + text
: text;
}

function escapeCsvValue(value) {
return (
'"' +
protectCsvValue(value).replace(/"/g, '""') +
'"'
);
}

function rowsToCsv(rows) {
return rows
.map((row) =>
row
.map(escapeCsvValue)
.join(',')
)
.join('\n');
}

function titleCase(value) {
return String(value ?? '')
.replace(/_/g, ' ')
.replace(
/\b\w/g,
(letter) => letter.toUpperCase()
);
}

export async function getAdminReportingOverview(
reportDays = DEFAULT_REPORT_DAYS
) {
const safeDays =
normalizeReportDays(reportDays);

const response =
await supabase.rpc(
'get_admin_reporting_overview',
{
report_days: safeDays,
}
);

if (response.error) {
throw response.error;
}

return response.data ?? {
generated_at: null,


period: {
  days: safeDays,
  date_from: null,
  date_to: null,
},

summary: {},
daily_trends: [],
application_statuses: [],
internship_statuses: [],
company_statuses: [],


};
}

export function buildAdminSummaryCsv(
overview
) {
const rows = [
[
'Category',
'Metric',
'Value',
],
];

const summary =
overview?.summary ?? {};

for (
const [
category,
metrics,
] of Object.entries(summary)
) {
for (
const [
metric,
value,
] of Object.entries(
metrics ?? {}
)
) {
rows.push([
titleCase(category),
titleCase(metric),
value ?? 0,
]);
}
}

return rowsToCsv(rows);
}

export function buildAdminDailyTrendsCsv(
overview
) {
const rows = [
[
'Date',
'Student Signups',
'Employer Signups',
'Companies Created',
'Internships Created',
'Applications',
'Interviews',
'Selected',
'Rejected',
],
];

for (
const trend of
overview?.daily_trends ?? []
) {
rows.push([
trend.date ?? '',
trend.students ?? 0,
trend.employers ?? 0,
trend.companies ?? 0,
trend.internships ?? 0,
trend.applications ?? 0,
trend.interviews ?? 0,
trend.selected ?? 0,
trend.rejected ?? 0,
]);
}

return rowsToCsv(rows);
}

export function buildStatusDistributionCsv(
overview
) {
const rows = [
[
'Category',
'Status',
'Count',
],
];

const groups = [
[
'Applications',
overview?.application_statuses ?? [],
],

[
  'Internships',
  overview?.internship_statuses ?? [],
],

[
  'Companies',
  overview?.company_statuses ?? [],
],

];

for (
const [
category,
statuses,
] of groups
) {
for (const row of statuses) {
rows.push([
category,
titleCase(row.status),
row.count ?? 0,
]);
}
}

return rowsToCsv(rows);
}

export function downloadCsvFile(
csvContent,
filename =
'internnext-report.csv'
) {
if (
typeof window === 'undefined' ||
typeof document === 'undefined'
) {
throw new Error(
'CSV downloads are only available in the browser.'
);
}

const blob = new Blob(
[
'\uFEFF',
String(csvContent ?? ''),
],
{
type:
'text/csv;charset=utf-8',
}
);

const objectUrl =
URL.createObjectURL(blob);

const link =
document.createElement('a');

link.href = objectUrl;
link.download = filename;

document.body.appendChild(link);
link.click();
link.remove();

URL.revokeObjectURL(objectUrl);
}
