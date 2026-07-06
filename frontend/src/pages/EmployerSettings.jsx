import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ImageIcon,
  LoaderCircle,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
} from 'lucide-react'

import toast from 'react-hot-toast'

import {
  useNavigate,
} from 'react-router-dom'

import {
  DashboardShell,
} from '../components/Layout'

import {
  requestAccountDeletion,
} from '../lib/accountApi'

import {
  employerNav,
} from '../lib/dashboardNav'

import {
  getEmployerProfileSettings,
  updateEmployerProfileSettings,
} from '../lib/employerProfileApi'

import {
  deleteCompanyCover,
  deleteCompanyLogo,
  getCompanyStorageState,
  uploadCompanyCover,
  uploadCompanyLogo,
} from '../lib/companyStorageApi'

import {
  useAuth,
} from '../context/AuthContext'

const emptyForm = {
  fullName: '',
  phone: '',
  designation: '',
  department: '',
  linkedinUrl: '',

  companyName: '',
  legalName: '',
  description: '',
  industry: '',
  companyType: '',
  companySize: '',
  foundedYear: '',

  website: '',
  businessEmail: '',
  companyPhone: '',
  headquarters: '',

  gstNumber: '',
  registrationNumber: '',
}

const companyTypeOptions = [
  '',
  'Private company',
  'Public company',
  'Startup',
  'Nonprofit',
  'Government',
  'Educational institution',
]

const companySizeOptions = [
  '',
  '1-10',
  '11-50',
  '51-200',
  '201-500',
  '501-1000',
  '1001-5000',
  '5000+',
]

function normalizeForm(settings) {
  return {
    fullName: settings?.fullName || '',
    phone: settings?.phone || '',
    designation: settings?.designation || '',
    department: settings?.department || '',
    linkedinUrl: settings?.linkedinUrl || '',

    companyName: settings?.companyName || '',
    legalName: settings?.legalName || '',
    description: settings?.description || '',
    industry: settings?.industry || '',
    companyType: settings?.companyType || '',
    companySize: settings?.companySize || '',
    foundedYear: settings?.foundedYear || '',

    website: settings?.website || '',
    businessEmail: settings?.businessEmail || '',
    companyPhone: settings?.companyPhone || '',
    headquarters: settings?.headquarters || '',

    gstNumber: settings?.gstNumber || '',
    registrationNumber:
      settings?.registrationNumber || '',
  }
}

function getStatusStyle(status) {
  switch (status) {
    case 'approved':
      return {
        title: 'Company approved',
        text: 'Your company is verified and may submit internships for review.',
        className:
          'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300',
        icon: CheckCircle2,
      }

    case 'pending':
      return {
        title: 'Company review pending',
        text: 'An administrator must approve the latest company information before new internships can be submitted.',
        className:
          'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300',
        icon: AlertTriangle,
      }

    case 'rejected':
      return {
        title: 'Company changes required',
        text: 'Update the company information below and save it to return the profile for admin review.',
        className:
          'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300',
        icon: AlertTriangle,
      }

    case 'suspended':
      return {
        title: 'Company suspended',
        text: 'Editing and internship submission are unavailable. Contact platform support.',
        className:
          'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300',
        icon: AlertTriangle,
      }

    default:
      return {
        title: 'Company status unavailable',
        text: 'The company verification status could not be determined.',
        className:
          'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300',
        icon: ShieldCheck,
      }
  }
}

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}) {
  return (
    <section className="card">
      <div className="flex items-start gap-3">
        <span className="rounded-2xl bg-brand-50 p-3 text-brand-600 dark:bg-brand-900/30">
          <Icon className="h-5 w-5" />
        </span>

        <div>
          <h2 className="text-lg font-black">
            {title}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {description}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {children}
      </div>
    </section>
  )
}

function Field({
  label,
  name,
  value,
  onChange,
  type = 'text',
  required = false,
  disabled = false,
  placeholder = '',
  min,
  max,
  className = '',
  autoComplete,
}) {
  return (
    <label className={className}>
      <span className="mb-2 block text-sm font-semibold">
        {label}
        {required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </span>

      <input
        className="input"
        name={name}
        value={value}
        onChange={onChange}
        type={type}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        min={min}
        max={max}
        autoComplete={autoComplete}
      />
    </label>
  )
}

function SelectField({
  label,
  name,
  value,
  onChange,
  options,
  disabled = false,
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-semibold">
        {label}
      </span>

      <select
        className="input"
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
      >
        {options.map((option) => (
          <option
            key={option || 'empty'}
            value={option}
          >
            {option || 'Select an option'}
          </option>
        ))}
      </select>
    </label>
  )
}

function TextAreaField({
  label,
  name,
  value,
  onChange,
  required = false,
  disabled = false,
  placeholder = '',
  className = '',
}) {
  return (
    <label className={className}>
      <span className="mb-2 block text-sm font-semibold">
        {label}
        {required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </span>

      <textarea
        className="input min-h-36 resize-y"
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
      />

      <p className="mt-1 text-right text-xs text-slate-400">
        {value.length} characters
      </p>
    </label>
  )
}

export default function EmployerSettings() {
  const navigate = useNavigate()

  const {
    refreshProfile,
    signOut,
  } = useAuth()

  const [form, setForm] = useState(emptyForm)
  const [original, setOriginal] = useState(emptyForm)
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [assets, setAssets] = useState({
    logoPath: null,
    logoUrl: null,
    coverPath: null,
    coverUrl: null,
  })

  const [loadingAssets, setLoadingAssets] = useState(true)
  const [assetAction, setAssetAction] = useState('')
  const [assetError, setAssetError] = useState('')
  const [
    deletionConfirmation,
    setDeletionConfirmation,
  ] = useState('')
  const [
    deletingAccount,
    setDeletingAccount,
  ] = useState(false)

  useEffect(() => {
    let active = true

    async function loadSettings() {
      try {
        setLoading(true)
        setError('')

        const record =
          await getEmployerProfileSettings()

        if (!active) {
          return
        }

        const nextForm = normalizeForm(record)

        setSettings(record)
        setForm(nextForm)
        setOriginal(nextForm)

        try {
          setLoadingAssets(true)
          setAssetError('')

          const assetState =
            await getCompanyStorageState()

          if (active) {
            setAssets({
              logoPath:
                assetState.logoPath || null,
              logoUrl:
                assetState.logoUrl || null,
              coverPath:
                assetState.coverPath || null,
              coverUrl:
                assetState.coverUrl || null,
            })
          }
        } catch (assetLoadError) {
          console.error(
            'Unable to load company assets:',
            assetLoadError
          )

          if (active) {
            setAssetError(
              assetLoadError?.message ||
                'Unable to load company images.'
            )
          }
        } finally {
          if (active) {
            setLoadingAssets(false)
          }
        }
      } catch (loadError) {
        console.error(
          'Unable to load employer settings:',
          loadError
        )

        if (active) {
          setError(
            loadError?.message ||
              'Unable to load employer settings.'
          )
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadSettings()

    return () => {
      active = false
    }
  }, [])

  const hasChanges = useMemo(
    () =>
      JSON.stringify(form) !==
      JSON.stringify(original),
    [form, original]
  )

  const statusInfo = getStatusStyle(
    settings?.companyStatus
  )

  const StatusIcon = statusInfo.icon

  const editingDisabled =
    settings?.companyStatus === 'suspended'

  function handleChange(event) {
    const {
      name,
      value,
    } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }


  async function handleLogoUpload(event) {
    const file =
      event.target.files?.[0]

    event.target.value = ''

    if (!file) {
      return
    }

    try {
      setAssetAction('logo-upload')
      setAssetError('')

      const result =
        await uploadCompanyLogo(file)

      setAssets((current) => ({
        ...current,
        logoPath: result.path,
        logoUrl: result.publicUrl,
      }))

      toast.success(
        'Company logo updated.'
      )
    } catch (uploadError) {
      console.error(
        'Unable to upload company logo:',
        uploadError
      )

      const message =
        uploadError?.message ||
        'Unable to upload company logo.'

      setAssetError(message)
      toast.error(message)
    } finally {
      setAssetAction('')
    }
  }

  async function handleCoverUpload(event) {
    const file =
      event.target.files?.[0]

    event.target.value = ''

    if (!file) {
      return
    }

    try {
      setAssetAction('cover-upload')
      setAssetError('')

      const result =
        await uploadCompanyCover(file)

      setAssets((current) => ({
        ...current,
        coverPath: result.path,
        coverUrl: result.publicUrl,
      }))

      toast.success(
        'Company cover image updated.'
      )
    } catch (uploadError) {
      console.error(
        'Unable to upload company cover:',
        uploadError
      )

      const message =
        uploadError?.message ||
        'Unable to upload company cover image.'

      setAssetError(message)
      toast.error(message)
    } finally {
      setAssetAction('')
    }
  }

  async function handleDeleteLogo() {
    try {
      setAssetAction('logo-delete')
      setAssetError('')

      await deleteCompanyLogo()

      setAssets((current) => ({
        ...current,
        logoPath: null,
        logoUrl: null,
      }))

      toast.success(
        'Company logo removed.'
      )
    } catch (deleteError) {
      console.error(
        'Unable to remove company logo:',
        deleteError
      )

      const message =
        deleteError?.message ||
        'Unable to remove company logo.'

      setAssetError(message)
      toast.error(message)
    } finally {
      setAssetAction('')
    }
  }

  async function handleDeleteCover() {
    try {
      setAssetAction('cover-delete')
      setAssetError('')

      await deleteCompanyCover()

      setAssets((current) => ({
        ...current,
        coverPath: null,
        coverUrl: null,
      }))

      toast.success(
        'Company cover image removed.'
      )
    } catch (deleteError) {
      console.error(
        'Unable to remove company cover:',
        deleteError
      )

      const message =
        deleteError?.message ||
        'Unable to remove company cover image.'

      setAssetError(message)
      toast.error(message)
    } finally {
      setAssetAction('')
    }
  }

  function validateForm() {
    if (form.fullName.trim().length < 2) {
      return 'Enter a valid contact person name.'
    }

    if (form.companyName.trim().length < 2) {
      return 'Enter a valid company name.'
    }

    if (form.description.trim().length < 20) {
      return 'Company description must contain at least 20 characters.'
    }

    if (!form.industry.trim()) {
      return 'Company industry is required.'
    }

    if (
      !form.businessEmail.trim() ||
      !form.businessEmail.includes('@')
    ) {
      return 'Enter a valid business email.'
    }

    if (!form.headquarters.trim()) {
      return 'Company headquarters is required.'
    }

    return null
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const validationError = validateForm()

    if (validationError) {
      toast.error(validationError)
      return
    }

    try {
      setSaving(true)
      setError('')

      const response =
        await updateEmployerProfileSettings(form)

      const nextSettings = response.settings
      const nextForm = normalizeForm(nextSettings)

      setSettings(nextSettings)
      setForm(nextForm)
      setOriginal(nextForm)

      await refreshProfile()

      if (response.result?.requires_review) {
        toast.success(
          'Company changes saved and submitted for admin review.'
        )
      } else {
        toast.success(
          'Employer settings updated.'
        )
      }
    } catch (saveError) {
      console.error(
        'Unable to save employer settings:',
        saveError
      )

      const message =
        saveError?.message ||
        'Unable to save employer settings.'

      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  async function handleRequestAccountDeletion() {
    if (
      deletionConfirmation !== 'DELETE' ||
      deletingAccount
    ) {
      return
    }

    if (
      !window.confirm(
        'Delete this employer account? The company will be suspended and active internships will be closed.'
      )
    ) {
      return
    }

    try {
      setDeletingAccount(true)

      await requestAccountDeletion()
      await signOut()

      toast.success(
        'Account deleted.'
      )

      navigate('/account-deleted', {
        replace: true,
      })
    } catch (deleteError) {
      console.error(
        'Unable to delete account:',
        deleteError
      )

      toast.error(
        deleteError?.message ||
          'Unable to delete your account.'
      )
    } finally {
      setDeletingAccount(false)
    }
  }

  if (loading) {
    return (
      <DashboardShell
        title="Company settings"
        navItems={employerNav}
      >
        <div className="card flex min-h-72 items-center justify-center">
          <LoaderCircle className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      </DashboardShell>
    )
  }

  if (error && !settings) {
    return (
      <DashboardShell
        title="Company settings"
        navItems={employerNav}
      >
        <section className="card mx-auto max-w-2xl text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-red-500" />

          <h1 className="mt-4 text-xl font-black">
            Unable to load settings
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {error}
          </p>

          <button
            type="button"
            className="btn-primary mt-6"
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
        </section>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell
      title="Company settings"
      navItems={employerNav}
    >
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black">
              Employer and company profile
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage recruiter details and the company information shown across InternNext.
            </p>
          </div>

          {settings?.companySlug && (
            <span className="badge bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {settings.companySlug}
            </span>
          )}
        </div>

        <section
          className={`mt-6 rounded-3xl border p-5 ${statusInfo.className}`}
        >
          <div className="flex items-start gap-3">
            <StatusIcon className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <h2 className="font-black">
                {statusInfo.title}
              </h2>

              <p className="mt-1 text-sm">
                {statusInfo.text}
              </p>

              {settings?.rejectionReason && (
                <p className="mt-3 rounded-2xl bg-white/60 p-3 text-sm dark:bg-slate-950/30">
                  <strong>Admin note:</strong>{' '}
                  {settings.rejectionReason}
                </p>
              )}
            </div>
          </div>
        </section>

        {settings?.companyStatus === 'approved' && (
          <section className="mt-4 rounded-3xl border border-blue-200 bg-blue-50 p-5 text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />

              <div>
                <h2 className="font-black">
                  Verification-sensitive changes
                </h2>

                <p className="mt-1 text-sm">
                  Updating important company verification fields may return the company to pending review. Recruiter contact-only changes normally keep the approved status.
                </p>
              </div>
            </div>
          </section>
        )}

        {error && settings && (
          <section className="mt-4 rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </section>
        )}

        <section className="card mt-6">
          <div className="flex items-start gap-3">
            <span className="rounded-2xl bg-brand-50 p-3 text-brand-600 dark:bg-brand-900/30">
              <ImageIcon className="h-5 w-5" />
            </span>

            <div>
              <h2 className="text-lg font-black">
                Company branding
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Upload a square logo and a wide cover image for public internship and company pages.
              </p>
            </div>
          </div>

          {assetError && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
              {assetError}
            </div>
          )}

          {loadingAssets ? (
            <div className="mt-6 flex min-h-40 items-center justify-center rounded-3xl border border-dashed">
              <LoaderCircle className="h-7 w-7 animate-spin text-brand-600" />
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              <div>
                <div className="overflow-hidden rounded-3xl border bg-slate-100 dark:bg-slate-800">
                  <div className="aspect-[3/1] w-full">
                    {assets.coverUrl ? (
                      <img
                        src={assets.coverUrl}
                        alt="Company cover"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-400">
                        <ImageIcon className="h-10 w-10" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-bold">
                      Cover image
                    </p>

                    <p className="text-sm text-slate-500">
                      JPG, PNG, or WebP. Maximum size 5 MB.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <input
                      id="company-cover-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={
                        editingDisabled ||
                        Boolean(assetAction)
                      }
                      onChange={handleCoverUpload}
                    />

                    <label
                      htmlFor="company-cover-upload"
                      className={`btn-secondary ${
                        editingDisabled || assetAction
                          ? 'pointer-events-none opacity-50'
                          : 'cursor-pointer'
                      }`}
                    >
                      {assetAction === 'cover-upload' ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}

                      {assets.coverPath
                        ? 'Replace cover'
                        : 'Upload cover'}
                    </label>

                    {assets.coverPath && (
                      <button
                        type="button"
                        className="btn-secondary text-red-600"
                        disabled={
                          editingDisabled ||
                          Boolean(assetAction)
                        }
                        onClick={handleDeleteCover}
                      >
                        {assetAction === 'cover-delete' ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-[180px_1fr]">
                <div className="flex h-44 w-44 items-center justify-center overflow-hidden rounded-3xl border bg-slate-100 dark:bg-slate-800">
                  {assets.logoUrl ? (
                    <img
                      src={assets.logoUrl}
                      alt="Company logo"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Building2 className="h-12 w-12 text-slate-400" />
                  )}
                </div>

                <div className="flex flex-col justify-center">
                  <p className="font-bold">
                    Company logo
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Use a square JPG, PNG, or WebP image. Maximum size 2 MB.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <input
                      id="company-logo-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={
                        editingDisabled ||
                        Boolean(assetAction)
                      }
                      onChange={handleLogoUpload}
                    />

                    <label
                      htmlFor="company-logo-upload"
                      className={`btn-secondary ${
                        editingDisabled || assetAction
                          ? 'pointer-events-none opacity-50'
                          : 'cursor-pointer'
                      }`}
                    >
                      {assetAction === 'logo-upload' ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}

                      {assets.logoPath
                        ? 'Replace logo'
                        : 'Upload logo'}
                    </label>

                    {assets.logoPath && (
                      <button
                        type="button"
                        className="btn-secondary text-red-600"
                        disabled={
                          editingDisabled ||
                          Boolean(assetAction)
                        }
                        onClick={handleDeleteLogo}
                      >
                        {assetAction === 'logo-delete' ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        <form
          className="mt-6 space-y-6"
          onSubmit={handleSubmit}
        >
          <SectionCard
            icon={UserRound}
            title="Recruiter information"
            description="Information about the person managing this employer account."
          >
            <Field
              label="Contact person"
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              required
              disabled={editingDisabled}
              autoComplete="name"
            />

            <Field
              label="Account email"
              name="accountEmail"
              value={settings?.email || ''}
              onChange={() => {}}
              type="email"
              disabled
            />

            <Field
              label="Phone number"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              type="tel"
              disabled={editingDisabled}
              autoComplete="tel"
            />

            <Field
              label="Designation"
              name="designation"
              value={form.designation}
              onChange={handleChange}
              disabled={editingDisabled}
              placeholder="Talent Acquisition Manager"
            />

            <Field
              label="Department"
              name="department"
              value={form.department}
              onChange={handleChange}
              disabled={editingDisabled}
              placeholder="Human Resources"
            />

            <Field
              label="LinkedIn profile"
              name="linkedinUrl"
              value={form.linkedinUrl}
              onChange={handleChange}
              type="url"
              disabled={editingDisabled}
              placeholder="https://linkedin.com/in/..."
            />
          </SectionCard>

          <SectionCard
            icon={Building2}
            title="Company details"
            description="Public identity and verification information for the company."
          >
            <Field
              label="Company name"
              name="companyName"
              value={form.companyName}
              onChange={handleChange}
              required
              disabled={editingDisabled}
            />

            <Field
              label="Legal company name"
              name="legalName"
              value={form.legalName}
              onChange={handleChange}
              disabled={editingDisabled}
            />

            <Field
              label="Industry"
              name="industry"
              value={form.industry}
              onChange={handleChange}
              required
              disabled={editingDisabled}
              placeholder="Information Technology"
            />

            <SelectField
              label="Company type"
              name="companyType"
              value={form.companyType}
              onChange={handleChange}
              options={companyTypeOptions}
              disabled={editingDisabled}
            />

            <SelectField
              label="Company size"
              name="companySize"
              value={form.companySize}
              onChange={handleChange}
              options={companySizeOptions}
              disabled={editingDisabled}
            />

            <Field
              label="Founded year"
              name="foundedYear"
              value={form.foundedYear}
              onChange={handleChange}
              type="number"
              min="1800"
              max={String(new Date().getFullYear())}
              disabled={editingDisabled}
              placeholder="2022"
            />

            <TextAreaField
              label="Company description"
              name="description"
              value={form.description}
              onChange={handleChange}
              required
              disabled={editingDisabled}
              className="md:col-span-2"
              placeholder="Describe the company, products, culture, and opportunities..."
            />
          </SectionCard>

          <SectionCard
            icon={ShieldCheck}
            title="Contact and verification"
            description="Official contact, location, and business registration details."
          >
            <Field
              label="Business email"
              name="businessEmail"
              value={form.businessEmail}
              onChange={handleChange}
              type="email"
              required
              disabled={editingDisabled}
              autoComplete="email"
            />

            <Field
              label="Company phone"
              name="companyPhone"
              value={form.companyPhone}
              onChange={handleChange}
              type="tel"
              disabled={editingDisabled}
            />

            <Field
              label="Website"
              name="website"
              value={form.website}
              onChange={handleChange}
              type="url"
              disabled={editingDisabled}
              placeholder="https://company.example"
            />

            <Field
              label="Headquarters"
              name="headquarters"
              value={form.headquarters}
              onChange={handleChange}
              required
              disabled={editingDisabled}
              placeholder="Pune, Maharashtra"
            />

            <Field
              label="GST number"
              name="gstNumber"
              value={form.gstNumber}
              onChange={handleChange}
              disabled={editingDisabled}
            />

            <Field
              label="Registration number"
              name="registrationNumber"
              value={form.registrationNumber}
              onChange={handleChange}
              disabled={editingDisabled}
            />
          </SectionCard>

          <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-3xl border bg-white/95 p-4 shadow-lg backdrop-blur dark:bg-slate-900/95">
            <p className="text-sm text-slate-500">
              {hasChanges
                ? 'You have unsaved changes.'
                : 'All changes are saved.'}
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                className="btn-secondary"
                disabled={!hasChanges || saving}
                onClick={() => {
                  setForm(original)
                  setError('')
                }}
              >
                Reset
              </button>

              <button
                type="submit"
                className="btn-primary"
                disabled={
                  !hasChanges ||
                  saving ||
                  editingDisabled
                }
              >
                {saving ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}

                {saving
                  ? 'Saving…'
                  : 'Save changes'}
              </button>
            </div>
          </div>
        </form>

        <section className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/30">
          <div className="flex items-start gap-3">
            <span className="rounded-2xl bg-white p-3 text-red-600 dark:bg-slate-950">
              <Trash2 className="h-5 w-5" />
            </span>

            <div>
              <h2 className="text-lg font-black text-red-900 dark:text-red-200">
                Delete account
              </h2>

              <p className="mt-2 text-sm leading-6 text-red-800 dark:text-red-300">
                This deactivates your employer account,
                suspends your company, closes active
                internships, and signs you out. Platform
                records are retained for audit and
                support.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <label>
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-red-800 dark:text-red-300">
                Type DELETE to confirm
              </span>

              <input
                className="input border-red-200 bg-white dark:border-red-900 dark:bg-slate-950"
                value={deletionConfirmation}
                onChange={(event) =>
                  setDeletionConfirmation(
                    event.target.value
                  )
                }
                autoComplete="off"
              />
            </label>

            <button
              type="button"
              className="btn-secondary text-red-600"
              disabled={
                deletingAccount ||
                deletionConfirmation !== 'DELETE'
              }
              onClick={handleRequestAccountDeletion}
            >
              {deletingAccount ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}

              {deletingAccount
                ? 'Deleting account...'
                : 'Delete account'}
            </button>
          </div>
        </section>
      </div>
    </DashboardShell>
  )
}
