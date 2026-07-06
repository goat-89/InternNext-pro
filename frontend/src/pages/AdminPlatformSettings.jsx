import {
AlertTriangle,
Building2,
CheckCircle2,
FileText,
Globe,
LoaderCircle,
Mail,
RefreshCw,
Save,
Settings,
ShieldCheck,
UserPlus,
Wrench,
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
getAdminPlatformSettings,
getDefaultAdminPlatformSettings,
updateAdminPlatformSettings,
} from '../lib/platformSettingsApi';

import {
getAdminNotificationProviderSettings,
updateAdminEmailProviderSetting,
} from '../lib/notificationProviderSettingsApi';

const EDITABLE_FIELDS = [
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

const DEFAULT_EMAIL_PROVIDER = {
channel: 'email',
provider: 'resend',
is_enabled: false,
from_email: '',
from_name: 'InternNext Pro',
reply_to_email: '',
updated_at: null,
};

function formatDateTime(value) {
if (!value) {
return 'Never';
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

function buildPatch(
original,
current
) {
const patch = {};

for (
const field of
EDITABLE_FIELDS
) {
if (
original?.[field] !==
current?.[field]
) {
patch[field] =
current[field];
}
}

return patch;
}

function buildEmailProviderPatch(
original,
current
) {
const patch = {};

for (
const field of [
'provider',
'is_enabled',
'from_email',
'from_name',
'reply_to_email',
]
) {
if (
original?.[field] !==
current?.[field]
) {
patch[field] =
current[field];
}
}

return patch;
}

function SectionCard({
icon: Icon,
title,
description,
children,
}) {
return ( <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6"> <div className="flex items-start gap-3"> <span className="rounded-2xl bg-brand-50 p-3 text-brand-600 dark:bg-brand-950/40"> <Icon size={20} /> </span>


    <div>
      <h2 className="text-lg font-black">
        {title}
      </h2>

      <p className="mt-1 text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  </div>

  <div className="mt-6 space-y-5">
    {children}
  </div>
</section>


);
}

function TextField({
label,
name,
value,
onChange,
type = 'text',
placeholder = '',
required = false,
min,
max,
helperText = '',
}) {
return ( <label className="block"> <span className="mb-2 block text-sm font-bold">
{label}


    {required && (
      <span className="ml-1 text-rose-500">
        *
      </span>
    )}
  </span>

  <input
    className="input"
    type={type}
    name={name}
    value={value ?? ''}
    onChange={onChange}
    placeholder={placeholder}
    required={required}
    min={min}
    max={max}
  />

  {helperText && (
    <span className="mt-2 block text-xs leading-5 text-slate-500">
      {helperText}
    </span>
  )}
</label>


);
}

function ToggleField({
label,
description,
checked,
onChange,
tone = 'default',
}) {
const activeClass =
tone === 'danger'
? 'bg-rose-600'
: 'bg-brand-600';

return ( <label className="flex cursor-pointer items-start justify-between gap-5 rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"> <span> <span className="block text-sm font-black">
{label} </span>


    <span className="mt-1 block text-sm leading-6 text-slate-500">
      {description}
    </span>
  </span>

  <input
    type="checkbox"
    className="sr-only"
    checked={Boolean(checked)}
    onChange={(event) =>
      onChange(
        event.target.checked
      )
    }
  />

  <span
    className={[
      'relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition',
      checked
        ? activeClass
        : 'bg-slate-300 dark:bg-slate-700',
    ].join(' ')}
    aria-hidden="true"
  >
    <span
      className={[
        'absolute top-1 h-5 w-5 rounded-full bg-white shadow transition',
        checked
          ? 'left-6'
          : 'left-1',
      ].join(' ')}
    />
  </span>
</label>


);
}

function AdminPlatformSettings() {
const [
savedSettings,
setSavedSettings,
] = useState(
getDefaultAdminPlatformSettings()
);

const [
form,
setForm,
] = useState(   
getDefaultAdminPlatformSettings()
);

const [
savedEmailProvider,
setSavedEmailProvider,
] = useState(
DEFAULT_EMAIL_PROVIDER
);

const [
emailProvider,
setEmailProvider,
] = useState(
DEFAULT_EMAIL_PROVIDER
);

const [
loading,
setLoading,
] = useState(true);

const [
saving,
setSaving,
] = useState(false);

const [
refreshing,
setRefreshing,
] = useState(false);

const [
error,
setError,
] = useState('');

const loadSettings =
useCallback(
async (
showRefreshState = false
) => {
if (showRefreshState) {
setRefreshing(true);
} else {
setLoading(true);
}


    setError('');

    try {
      const [
        settings,
        providerSettings,
      ] = await Promise.all([
        getAdminPlatformSettings(),
        getAdminNotificationProviderSettings(),
      ]);

      setSavedSettings(
        settings
      );

      setForm(settings);

      setSavedEmailProvider(
        providerSettings.email
      );

      setEmailProvider(
        providerSettings.email
      );
    } catch (
      loadError
    ) {
      console.error(
        'Unable to load platform settings:',
        loadError
      );

      const message =
        loadError?.message ||
        'Unable to load platform settings.';

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  },
  []
);


useEffect(() => {
loadSettings(false);
}, [loadSettings]);

const patch =
useMemo(
() =>
buildPatch(
savedSettings,
form
),
[
savedSettings,
form,
]
);

const emailProviderPatch =
useMemo(
() =>
buildEmailProviderPatch(
savedEmailProvider,
emailProvider
),
[
savedEmailProvider,
emailProvider,
]
);

const hasChanges =
Object.keys(patch).length >
0;

const hasEmailProviderChanges =
Object.keys(
emailProviderPatch
).length > 0;

function handleTextChange(
event
) {
const {
name,
value,
type,
} = event.target;


setForm(
  (current) => ({
    ...current,

    [name]:
      type === 'number'
        ? value === ''
          ? ''
          : Number(value)
        : value,
  })
);


}

function handleToggle(
name,
checked
) {
setForm(
(current) => ({
...current,
[name]: checked,
})
);
}

function handleEmailProviderTextChange(
event
) {
const {
name,
value,
} = event.target;

setEmailProvider(
(current) => ({
...current,
[name]: value,
})
);
}

function handleEmailProviderToggle(
checked
) {
setEmailProvider(
(current) => ({
...current,
is_enabled: checked,
})
);
}

function resetChanges() {
setForm(savedSettings);


toast.success(
  'Unsaved changes were reset.'
);


}

function resetEmailProviderChanges() {
setEmailProvider(
savedEmailProvider
);

toast.success(
'Email provider changes were reset.'
);
}

async function handleEmailProviderSave() {
if (!hasEmailProviderChanges) {
toast(
'No email provider changes to save.'
);

return;
}

try {
setSaving(true);

const updated =
await updateAdminEmailProviderSetting(
emailProvider
);

setSavedEmailProvider(
updated
);

setEmailProvider(
updated
);

toast.success(
'Email provider settings saved.'
);
} catch (
saveError
) {
console.error(
'Unable to save email provider settings:',
saveError
);

toast.error(
saveError?.message ||
'Unable to save email provider settings.'
);
} finally {
setSaving(false);
}
}

async function handleSubmit(
event
) {
event.preventDefault();


if (!hasChanges) {
  toast(
    'No changes to save.'
  );

  return;
}

if (
  patch.maintenance_mode ===
    true &&
  savedSettings
    .maintenance_mode !==
    true
) {
  const confirmed =
    window.confirm(
      'Enable maintenance mode? Public access may be restricted until it is disabled.'
    );

  if (!confirmed) {
    return;
  }
}

setSaving(true);

try {
  const updated =
    await updateAdminPlatformSettings(
      patch
    );

  setSavedSettings(
    updated
  );

  setForm(updated);

  toast.success(
    'Platform settings saved.'
  );
} catch (
  saveError
) {
  console.error(
    'Unable to save platform settings:',
    saveError
  );

  toast.error(
    saveError?.message ||
    'Unable to save platform settings.'
  );
} finally {
  setSaving(false);
}


}

return ( <DashboardShell
   title="Platform settings"
   navItems={adminNav}
 >
<form
onSubmit={
handleSubmit
}
className="space-y-6"
> <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-brand-950 p-6 text-white shadow-xl sm:p-8"> <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between"> <div> <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-200"> <Settings
               size={14}
             />


            Administration
          </div>

          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
            Platform
            configuration
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            Control
            registrations,
            moderation rules,
            public access,
            application
            behavior, and
            platform operating
            limits.
          </p>

          <p className="mt-5 text-sm text-slate-300">
            Last updated:{' '}
            {formatDateTime(
              savedSettings
                .updated_at
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            loadSettings(true)
          }
          disabled={
            refreshing ||
            saving
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

          Refresh
        </button>
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
            settings…
          </p>
        </div>
      </div>
    )}

    {!loading &&
      error && (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
          <div className="flex items-start gap-3">
            <AlertTriangle
              className="mt-0.5 shrink-0"
              size={20}
            />

            <div>
              <p className="font-black">
                Settings
                unavailable
              </p>

              <p className="mt-2 text-sm">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

    {!loading &&
      !error && (
        <>
          {form.maintenance_mode && (
            <div className="rounded-3xl border border-rose-300 bg-rose-50 p-5 text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
              <div className="flex items-start gap-3">
                <Wrench
                  className="mt-0.5 shrink-0"
                  size={21}
                />

                <div>
                  <p className="font-black">
                    Maintenance
                    mode is
                    enabled
                  </p>

                  <p className="mt-1 text-sm leading-6">
                    Keep this
                    enabled only
                    while carrying
                    out planned
                    maintenance.
                    Administrators
                    should retain
                    access.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-2">
            <SectionCard
              icon={Globe}
              title="Platform identity"
              description="Basic platform information shown across public and authenticated pages."
            >
              <div className="grid gap-5 md:grid-cols-2">
                <TextField
                  label="Platform name"
                  name="platform_name"
                  value={
                    form.platform_name
                  }
                  onChange={
                    handleTextChange
                  }
                  required
                  placeholder="InternNext"
                />

                <TextField
                  label="Support email"
                  name="support_email"
                  value={
                    form.support_email
                  }
                  onChange={
                    handleTextChange
                  }
                  type="email"
                  placeholder="support@example.com"
                  helperText="Shown to users who need account or platform assistance."
                />
              </div>
            </SectionCard>

            <SectionCard
              icon={Wrench}
              title="Operations"
              description="Configure platform-wide maintenance and reporting behavior."
            >
              <ToggleField
                label="Maintenance mode"
                description="Marks the platform as temporarily unavailable for normal public use."
                checked={
                  form.maintenance_mode
                }
                onChange={(
                  checked
                ) =>
                  handleToggle(
                    'maintenance_mode',
                    checked
                  )
                }
                tone="danger"
              />

              <TextField
                label="Default report range"
                name="default_report_days"
                value={
                  form.default_report_days
                }
                onChange={
                  handleTextChange
                }
                type="number"
                min={7}
                max={365}
                helperText="Default number of days used by admin reporting screens."
              />
            </SectionCard>

            <SectionCard
              icon={UserPlus}
              title="Registration access"
              description="Open or close new student and employer account registration."
            >
              <ToggleField
                label="Student registration"
                description="Allow new students to create accounts."
                checked={
                  form.allow_student_registration
                }
                onChange={(
                  checked
                ) =>
                  handleToggle(
                    'allow_student_registration',
                    checked
                  )
                }
              />

              <ToggleField
                label="Employer registration"
                description="Allow new employers to create accounts."
                checked={
                  form.allow_employer_registration
                }
                onChange={(
                  checked
                ) =>
                  handleToggle(
                    'allow_employer_registration',
                    checked
                  )
                }
              />
            </SectionCard>

            <SectionCard
              icon={
                ShieldCheck
              }
              title="Moderation rules"
              description="Control whether companies and internships require administrator review."
            >
              <ToggleField
                label="Require company approval"
                description="New and materially updated company profiles must be reviewed by an administrator."
                checked={
                  form.require_company_approval
                }
                onChange={(
                  checked
                ) =>
                  handleToggle(
                    'require_company_approval',
                    checked
                  )
                }
              />

              <ToggleField
                label="Require internship approval"
                description="Submitted internships must be approved before appearing publicly."
                checked={
                  form.require_internship_approval
                }
                onChange={(
                  checked
                ) =>
                  handleToggle(
                    'require_internship_approval',
                    checked
                  )
                }
              />
            </SectionCard>

            <SectionCard
              icon={FileText}
              title="Marketplace behavior"
              description="Control public browsing and student application capabilities."
            >
              <ToggleField
                label="Public internship browsing"
                description="Allow signed-out visitors to browse approved internship listings."
                checked={
                  form.allow_public_internship_browsing
                }
                onChange={(
                  checked
                ) =>
                  handleToggle(
                    'allow_public_internship_browsing',
                    checked
                  )
                }
              />

              <ToggleField
                label="Application withdrawal"
                description="Allow students to withdraw eligible applications."
                checked={
                  form.application_withdrawal_enabled
                }
                onChange={(
                  checked
                ) =>
                  handleToggle(
                    'application_withdrawal_enabled',
                    checked
                  )
                }
              />
            </SectionCard>

            <SectionCard
              icon={Mail}
              title="Notification email"
              description="Configure safe sender details for queued email notifications."
            >
              <ToggleField
                label="Enable email delivery"
                description="Allows the notification worker to send queued email jobs when the email provider environment variables are configured."
                checked={
                  emailProvider.is_enabled
                }
                onChange={
                  handleEmailProviderToggle
                }
              />

              <label className="block">
                <span className="mb-2 block text-sm font-bold">
                  Email provider
                </span>

                <select
                  className="input"
                  name="provider"
                  value={
                    emailProvider.provider
                  }
                  onChange={
                    handleEmailProviderTextChange
                  }
                >
                  <option value="resend">
                    Resend
                  </option>
                </select>
              </label>

              <div className="grid gap-5 md:grid-cols-2">
                <TextField
                  label="From email"
                  name="from_email"
                  value={
                    emailProvider.from_email
                  }
                  onChange={
                    handleEmailProviderTextChange
                  }
                  type="email"
                  placeholder="notifications@example.com"
                  helperText="Sender address verified in the email provider account."
                />

                <TextField
                  label="From name"
                  name="from_name"
                  value={
                    emailProvider.from_name
                  }
                  onChange={
                    handleEmailProviderTextChange
                  }
                  placeholder="InternNext Pro"
                />

                <TextField
                  label="Reply-to email"
                  name="reply_to_email"
                  value={
                    emailProvider.reply_to_email
                  }
                  onChange={
                    handleEmailProviderTextChange
                  }
                  type="email"
                  placeholder="support@example.com"
                  helperText="Optional. Leave blank to use provider defaults."
                />

                <div className="rounded-2xl border border-slate-200 p-4 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:text-slate-300">
                  <p className="font-black text-slate-900 dark:text-white">
                    Secret key storage
                  </p>

                  <p className="mt-1">
                    API keys are read only by the Edge Function from environment variables and are never stored here.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={
                    resetEmailProviderChanges
                  }
                  disabled={
                    !hasEmailProviderChanges ||
                    saving
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-black transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  <RefreshCw
                    size={17}
                  />

                  Reset email
                </button>

                <button
                  type="button"
                  onClick={
                    handleEmailProviderSave
                  }
                  disabled={
                    !hasEmailProviderChanges ||
                    saving
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-5 py-3 text-sm font-black text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <LoaderCircle
                      className="animate-spin"
                      size={17}
                    />
                  ) : (
                    <Save
                      size={17}
                    />
                  )}

                  Save email
                </button>
              </div>
            </SectionCard>

            <SectionCard
              icon={Building2}
              title="Employer limits"
              description="Set the maximum number of simultaneously active internships per employer."
            >
              <TextField
                label="Maximum active internships"
                name="max_active_internships_per_employer"
                value={
                  form.max_active_internships_per_employer
                }
                onChange={
                  handleTextChange
                }
                type="number"
                min={1}
                max={1000}
                helperText="This limit will be enforced in a later database integration step."
              />

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                <div className="flex items-start gap-3">
                  <CheckCircle2
                    className="mt-0.5 shrink-0"
                    size={19}
                  />

                  <p className="text-sm leading-6">
                    These settings
                    are stored
                    securely and
                    may only be
                    changed by an
                    active
                    administrator.
                  </p>
                </div>
              </div>
            </SectionCard>
          </div>

          <section className="sticky bottom-4 z-20 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-black">
                  {hasChanges
                    ? 'Unsaved changes'
                    : 'Settings are up to date'}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {hasChanges
                    ? `${
                        Object.keys(
                          patch
                        ).length
                      } setting change${
                        Object.keys(
                          patch
                        ).length ===
                        1
                          ? ''
                          : 's'
                      } ready to save.`
                    : 'No pending changes.'}
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={
                    resetChanges
                  }
                  disabled={
                    !hasChanges ||
                    saving
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-black transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  <RefreshCw
                    size={17}
                  />

                  Reset
                </button>

                <button
                  type="submit"
                  disabled={
                    !hasChanges ||
                    saving
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-5 py-3 text-sm font-black text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <LoaderCircle
                      className="animate-spin"
                      size={17}
                    />
                  ) : (
                    <Save
                      size={17}
                    />
                  )}

                  Save settings
                </button>
              </div>
            </div>
          </section>
        </>
      )}
  </form>
</DashboardShell>


);
}
export default AdminPlatformSettings;
