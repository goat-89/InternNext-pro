import { supabase } from './supabase';

const VALID_ENTITY_TYPES = new Set([
'profile',
'company',
'internship',
]);

function normalizeText(value) {
return String(value ?? '').trim();
}

function normalizePage(value) {
const parsed = Number.parseInt(value, 10);

return Number.isFinite(parsed) &&
parsed > 0
? parsed
: 1;
}

function normalizePageSize(value) {
const parsed = Number.parseInt(value, 10);

if (
!Number.isFinite(parsed) ||
parsed < 1
) {
return 25;
}

return Math.min(parsed, 100);
}

function normalizeEntityType(value) {
const normalized =
normalizeText(value).toLowerCase();

return VALID_ENTITY_TYPES.has(
normalized
)
? normalized
: '';
}

function toStartOfDayIso(value) {
const normalized =
normalizeText(value);

if (!normalized) {
return '';
}

const date = new Date(
normalized +
'T00:00:00.000Z'
);

if (
Number.isNaN(
date.getTime()
)
) {
throw new Error(
'Invalid start date.'
);
}

return date.toISOString();
}

function toEndOfDayIso(value) {
const normalized =
normalizeText(value);

if (!normalized) {
return '';
}

const date = new Date(
normalized +
'T23:59:59.999Z'
);

if (
Number.isNaN(
date.getTime()
)
) {
throw new Error(
'Invalid end date.'
);
}

return date.toISOString();
}

async function requireAdmin() {
const userResponse =
await supabase.auth.getUser();

if (userResponse.error) {
throw userResponse.error;
}

const user =
userResponse.data?.user ??
null;

if (!user) {
throw new Error(
'You must sign in as an administrator.'
);
}

const profileResponse =
await supabase
.from('profiles')
.select(
'id, role, account_status'
)
.eq('id', user.id)
.maybeSingle();

if (profileResponse.error) {
throw profileResponse.error;
}

const profile =
profileResponse.data;

if (
!profile ||
profile.role !== 'admin'
) {
throw new Error(
'Administrator access is required.'
);
}

if (
profile.account_status ===
'suspended'
) {
throw new Error(
'This administrator account is suspended.'
);
}

return {
user,
profile,
};
}

function applyAuditFilters(
query,
filters = {}
) {
let nextQuery = query;

const entityType =
normalizeEntityType(
filters.entityType
);

const action =
normalizeText(
filters.action
);

const adminUserId =
normalizeText(
filters.adminUserId
);

const entityId =
normalizeText(
filters.entityId
);

const dateFrom =
toStartOfDayIso(
filters.dateFrom
);

const dateTo =
toEndOfDayIso(
filters.dateTo
);

if (entityType) {
nextQuery =
nextQuery.eq(
'entity_type',
entityType
);
}

if (action) {
nextQuery =
nextQuery.eq(
'action',
action
);
}

if (adminUserId) {
nextQuery =
nextQuery.eq(
'admin_user_id',
adminUserId
);
}

if (entityId) {
nextQuery =
nextQuery.eq(
'entity_id',
entityId
);
}

if (dateFrom) {
nextQuery =
nextQuery.gte(
'created_at',
dateFrom
);
}

if (dateTo) {
nextQuery =
nextQuery.lte(
'created_at',
dateTo
);
}

return nextQuery;
}

async function attachAdminProfiles(
logs
) {
if (
!Array.isArray(logs) ||
logs.length === 0
) {
return [];
}

const adminIds = [
...new Set(
logs
.map(
(log) =>
log.admin_user_id
)
.filter(Boolean)
),
];

if (
adminIds.length === 0
) {
return logs.map(
(log) => ({
...log,


    adminName:
      'Unknown administrator',

    adminEmail: '',
  })
);


}

const profilesResponse =
await supabase
.from('profiles')
.select(
'id, full_name, email'
)
.in('id', adminIds);

if (profilesResponse.error) {
throw profilesResponse.error;
}

const profileMap =
new Map(
(
profilesResponse.data ??
[]
).map(
(profile) => [
profile.id,
profile,
]
)
);

return logs.map(
(log) => {
const adminProfile =
profileMap.get(
log.admin_user_id
);


  return {
    ...log,

    adminName:
      adminProfile?.full_name ||
      'Unknown administrator',

    adminEmail:
      adminProfile?.email ||
      '',
  };
}


);
}

export async function getAdminAuditLogs(
options = {}
) {
await requireAdmin();

const page =
normalizePage(
options.page
);

const pageSize =
normalizePageSize(
options.pageSize
);

const rangeFrom =
(page - 1) *
pageSize;

const rangeTo =
rangeFrom +
pageSize -
1;

let query = supabase
.from('admin_audit_logs')
.select(
'id, admin_user_id, entity_type, entity_id, action, old_values, new_values, created_at',
{
count: 'exact',
}
);

query = applyAuditFilters(
query,
options
);

const response =
await query
.order(
'created_at',
{
ascending: false,
}
)
.range(
rangeFrom,
rangeTo
);

if (response.error) {
throw response.error;
}

const logs =
await attachAdminProfiles(
response.data ?? []
);

const total =
response.count ?? 0;

const totalPages =
Math.max(
1,
Math.ceil(
total / pageSize
)
);

return {
logs,
page,
pageSize,
total,
totalPages,


hasPreviousPage:
  page > 1,

hasNextPage:
  page < totalPages,


};
}

export async function getAdminAuditActions() {
await requireAdmin();

const response =
await supabase
.from('admin_audit_logs')
.select('action')
.order(
'action',
{
ascending: true,
}
)
.limit(1000);

if (response.error) {
throw response.error;
}

return [
...new Set(
(
response.data ?? []
)
.map(
(row) => row.action
)
.filter(Boolean)
),
];
}

function protectCsvValue(value) {
const text =
value === null ||
value === undefined
? ''
: String(value);

return /^[=+-@]/.test(text)
? "'" + text
: text;
}

function escapeCsvValue(value) {
return (
'"' +
protectCsvValue(value)
.replace(
/"/g,
'""'
) +
'"'
);
}

function formatJsonForCsv(value) {
if (
value === null ||
value === undefined
) {
return '';
}

try {
return JSON.stringify(value);
} catch {
return String(value);
}
}

export function buildAdminAuditCsv(
logs
) {
const rows = [
[
'Timestamp',
'Administrator',
'Administrator Email',
'Entity Type',
'Entity ID',
'Action',
'Old Values',
'New Values',
],
];

const safeLogs =
Array.isArray(logs)
? logs
: [];

for (
const log of safeLogs
) {
rows.push([
log.created_at || '',
log.adminName || '',
log.adminEmail || '',
log.entity_type || '',
log.entity_id || '',
log.action || '',


  formatJsonForCsv(
    log.old_values
  ),

  formatJsonForCsv(
    log.new_values
  ),
]);


}

return rows
.map(
(row) =>
row
.map(
escapeCsvValue
)
.join(',')
)
.join('\n');
}

export async function getAllAdminAuditLogsForExport(
filters = {}
) {
await requireAdmin();

const pageSize = 100;

let page = 1;
let allLogs = [];
let hasNextPage = true;

while (hasNextPage) {
const result =
await getAdminAuditLogs({
...filters,
page,
pageSize,
});

allLogs =
  allLogs.concat(
    result.logs
  );

hasNextPage =
  result.hasNextPage;

page += 1;

}

return allLogs;
}
