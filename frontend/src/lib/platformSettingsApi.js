import { supabase } from './supabase';

const PUBLIC_DEFAULTS = {
platform_name: 'InternNext',
support_email: '',
maintenance_mode: false,
allow_student_registration: true,
allow_employer_registration: true,
allow_public_internship_browsing: true,
application_withdrawal_enabled: true,
};

const ADMIN_DEFAULTS = {
id: 1,
...PUBLIC_DEFAULTS,
require_company_approval: true,
require_internship_approval: true,
default_report_days: 30,
max_active_internships_per_employer: 25,
updated_at: null,
updated_by: null,
};

function ensureObject(value) {
if (
value &&
typeof value === 'object' &&
!Array.isArray(value)
) {
return value;
}

return {};
}

function normalizePublicSettings(value) {
const source = ensureObject(value);

return {
platform_name:
String(
source.platform_name ??
PUBLIC_DEFAULTS.platform_name
).trim() ||
PUBLIC_DEFAULTS.platform_name,


support_email:
  String(
    source.support_email ?? ''
  ).trim(),

maintenance_mode:
  typeof source.maintenance_mode ===
  'boolean'
    ? source.maintenance_mode
    : PUBLIC_DEFAULTS.maintenance_mode,

allow_student_registration:
  typeof source.allow_student_registration ===
  'boolean'
    ? source.allow_student_registration
    : PUBLIC_DEFAULTS.allow_student_registration,

allow_employer_registration:
  typeof source.allow_employer_registration ===
  'boolean'
    ? source.allow_employer_registration
    : PUBLIC_DEFAULTS.allow_employer_registration,

allow_public_internship_browsing:
  typeof source.allow_public_internship_browsing ===
  'boolean'
    ? source.allow_public_internship_browsing
    : PUBLIC_DEFAULTS.allow_public_internship_browsing,

application_withdrawal_enabled:
  typeof source.application_withdrawal_enabled ===
  'boolean'
    ? source.application_withdrawal_enabled
    : PUBLIC_DEFAULTS.application_withdrawal_enabled,


};
}

function normalizeAdminSettings(value) {
const source = ensureObject(value);

return {
id: 1,


...normalizePublicSettings(source),

require_company_approval:
  typeof source.require_company_approval ===
  'boolean'
    ? source.require_company_approval
    : ADMIN_DEFAULTS.require_company_approval,

require_internship_approval:
  typeof source.require_internship_approval ===
  'boolean'
    ? source.require_internship_approval
    : ADMIN_DEFAULTS.require_internship_approval,

default_report_days:
  Number.isFinite(
    Number(
      source.default_report_days
    )
  )
    ? Number(
        source.default_report_days
      )
    : ADMIN_DEFAULTS.default_report_days,

max_active_internships_per_employer:
  Number.isFinite(
    Number(
      source.max_active_internships_per_employer
    )
  )
    ? Number(
        source.max_active_internships_per_employer
      )
    : ADMIN_DEFAULTS.max_active_internships_per_employer,

updated_at:
  source.updated_at ?? null,

updated_by:
  source.updated_by ?? null,


};
}

function validatePatch(patch) {
const source = ensureObject(patch);

const result = {};

const allowedFields = [
'platform_name',
'support_email',
'maintenance_mode',
'allow_student_registration',
'allow_employer_registration',
'require_company_approval',
'require_internship_approval',
'allow_public_internship_browsing',
'application_withdrawal_enabled',
'default_report_days',
'max_active_internships_per_employer',
];

for (
const [key, value] of
Object.entries(source)
) {
if (
!allowedFields.includes(key)
) {
throw new Error(
'Unsupported settings field: ' +
key
);
}


if (
  key === 'platform_name'
) {
  const name =
    String(value ?? '').trim();

  if (!name) {
    throw new Error(
      'Platform name cannot be empty.'
    );
  }

  result[key] = name;
  continue;
}

if (
  key === 'support_email'
) {
  const email =
    String(value ?? '').trim();

  if (
    email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email
    )
  ) {
    throw new Error(
      'Support email must be valid.'
    );
  }

  result[key] = email;
  continue;
}

if (
  key ===
  'default_report_days'
) {
  const days =
    Number.parseInt(
      value,
      10
    );

  if (
    !Number.isFinite(days) ||
    days < 7 ||
    days > 365
  ) {
    throw new Error(
      'Default report days must be between 7 and 365.'
    );
  }

  result[key] = days;
  continue;
}

if (
  key ===
  'max_active_internships_per_employer'
) {
  const limit =
    Number.parseInt(
      value,
      10
    );

  if (
    !Number.isFinite(limit) ||
    limit < 1 ||
    limit > 1000
  ) {
    throw new Error(
      'Maximum active internships must be between 1 and 1000.'
    );
  }

  result[key] = limit;
  continue;
}

if (
  typeof value !== 'boolean'
) {
  throw new Error(
    key +
      ' must be true or false.'
  );
}

result[key] = value;


}

if (
Object.keys(result).length ===
0
) {
throw new Error(
'No platform settings were provided to update.'
);
}

return result;
}

export function getDefaultPublicPlatformSettings() {
return {
...PUBLIC_DEFAULTS,
};
}

export function getDefaultAdminPlatformSettings() {
return {
...ADMIN_DEFAULTS,
};
}

export async function getPublicPlatformSettings() {
const { data, error } =
await supabase.rpc(
'get_public_platform_settings'
);

if (error) {
throw error;
}

return normalizePublicSettings(
data
);
}

export async function getAdminPlatformSettings() {
const { data, error } =
await supabase.rpc(
'get_admin_platform_settings'
);

if (error) {
throw error;
}

return normalizeAdminSettings(
data
);
}

export async function updateAdminPlatformSettings(
patch
) {
const settingsPatch =
validatePatch(patch);

const { data, error } =
await supabase.rpc(
'update_admin_platform_settings',
{
settings_patch:
settingsPatch,
}
);

if (error) {
throw error;
}

return normalizeAdminSettings(
data
);
}
