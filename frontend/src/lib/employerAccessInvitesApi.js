import { supabase } from './supabase';

function normalizeText(value) {
return String(value ?? '').trim();
}

function normalizeEmail(value) {
return normalizeText(value)
.toLowerCase();
}

function validateEmail(value) {
const email =
normalizeEmail(value);

if (!email) {
throw new Error(
'Employer email is required.'
);
}

if (
!/^[^\s@]+@[^\s@]+.[^\s@]+$/.test(
email
)
) {
throw new Error(
'Enter a valid employer email address.'
);
}

return email;
}

function normalizeExpiryDays(value) {
const parsed =
Number.parseInt(
value,
10
);

if (
!Number.isFinite(parsed)
) {
return 14;
}

return Math.min(
90,
Math.max(
1,
parsed
)
);
}

function normalizeInvite(row) {
if (
!row ||
typeof row !== 'object'
) {
return null;
}

return {
id:
row.id ?? null,


invitedEmail:
  row.invited_email ?? '',

companyName:
  row.company_name ?? '',

accessPath:
  row.access_path ?? '',

token:
  row.token ?? '',

expiresAt:
  row.expires_at ?? null,

usedAt:
  row.used_at ?? null,

revokedAt:
  row.revoked_at ?? null,

createdAt:
  row.created_at ?? null,

status:
  row.status ?? '',

valid:
  Boolean(
    row.valid
  ),

alreadyUsed:
  Boolean(
    row.already_used
  ),


};
}

function getErrorMessage(
error,
fallback
) {
return [
error?.message,
error?.details,
error?.hint,
]
.filter(Boolean)
.join(' ') ||
fallback;
}

export function buildEmployerAccessUrl(
accessPathOrToken
) {
const value =
normalizeText(
accessPathOrToken
);

if (!value) {
throw new Error(
'Employer access path or token is required.'
);
}

const accessPath =
value.startsWith(
'/employer-access/'
)
? value
: '/employer-access/' +
value;

if (
typeof window ===
'undefined'
) {
return accessPath;
}

return (
window.location.origin +
accessPath
);
}

export async function createEmployerAccessInvite({
email,
companyName = '',
expiresInDays = 14,
}) {
const invitedEmail =
validateEmail(email);

const safeCompanyName =
normalizeText(
companyName
);

const safeExpiryDays =
normalizeExpiryDays(
expiresInDays
);

const {
data,
error,
} = await supabase.rpc(
'create_employer_access_invite',
{
p_invited_email:
invitedEmail,


  p_company_name:
    safeCompanyName ||
    null,

  p_expires_in_days:
    safeExpiryDays,
}


);

if (error) {
throw new Error(
getErrorMessage(
error,
'Unable to create employer access invite.'
)
);
}

const invite =
normalizeInvite(data);

return {
...invite,


accessUrl:
  buildEmployerAccessUrl(
    invite?.accessPath ||
    invite?.token
  ),


};
}

export async function validateEmployerAccessInvite(
token
) {
const normalizedToken =
normalizeText(token);

if (!normalizedToken) {
return {
valid: false,
inviteId: null,
invitedEmail: '',
companyName: '',
expiresAt: null,
alreadyUsed: false,
};
}

const {
data,
error,
} = await supabase.rpc(
'validate_employer_access_invite',
{
p_token:
normalizedToken,
}
);

if (error) {
throw new Error(
getErrorMessage(
error,
'Unable to validate employer access invite.'
)
);
}

return {
valid:
Boolean(
data?.valid
),


inviteId:
  data?.invite_id ??
  null,

invitedEmail:
  data?.invited_email ??
  '',

companyName:
  data?.company_name ??
  '',

expiresAt:
  data?.expires_at ??
  null,

alreadyUsed:
  Boolean(
    data?.already_used
  ),


};
}

export async function acceptEmployerAccessInvite(
token
) {
const normalizedToken =
normalizeText(token);

if (!normalizedToken) {
throw new Error(
'Employer access invite token is required.'
);
}

const {
data,
error,
} = await supabase.rpc(
'accept_employer_access_invite',
{
p_token:
normalizedToken,
}
);

if (error) {
throw new Error(
getErrorMessage(
error,
'Unable to accept employer access invite.'
)
);
}

return {
valid:
Boolean(
data?.valid
),


inviteId:
  data?.invite_id ??
  null,

invitedEmail:
  data?.invited_email ??
  '',

companyName:
  data?.company_name ??
  '',

usedAt:
  data?.used_at ??
  null,

status:
  data?.status ??
  '',


};
}

export async function listEmployerAccessInvites({
status = 'all',
limit = 100,
} = {}) {
const normalizedStatus =
normalizeText(status)
.toLowerCase() ||
'all';

const allowedStatuses =
new Set([
'all',
'active',
'used',
'revoked',
'expired',
]);

if (
!allowedStatuses.has(
normalizedStatus
)
) {
throw new Error(
'Unsupported employer invite status filter.'
);
}

const parsedLimit =
Number.parseInt(
limit,
10
);

const safeLimit =
Number.isFinite(
parsedLimit
)
? Math.min(
500,
Math.max(
1,
parsedLimit
)
)
: 100;

const {
data,
error,
} = await supabase.rpc(
'list_employer_access_invites',
{
p_status:
normalizedStatus,


  p_limit:
    safeLimit,
}


);

if (error) {
throw new Error(
getErrorMessage(
error,
'Unable to load employer access invites.'
)
);
}

return Array.isArray(data)
? data
.map(
normalizeInvite
)
.filter(Boolean)
: [];
}

export async function revokeEmployerAccessInvite(
inviteId
) {
const normalizedInviteId =
normalizeText(
inviteId
);

if (!normalizedInviteId) {
throw new Error(
'Employer invite ID is required.'
);
}

const {
data,
error,
} = await supabase.rpc(
'revoke_employer_access_invite',
{
p_invite_id:
normalizedInviteId,
}
);

if (error) {
throw new Error(
getErrorMessage(
error,
'Unable to revoke employer access invite.'
)
);
}

return Boolean(data);
}
