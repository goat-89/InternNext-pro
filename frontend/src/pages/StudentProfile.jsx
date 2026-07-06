import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Camera,
  CheckCircle2,
  ExternalLink,
  FileText,
  GraduationCap,
  ImageIcon,
  Link2,
  LoaderCircle,
  MapPin,
  Save,
  Sparkles,
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
  EmptyState,
} from '../components/UI'

import {
  useAuth,
} from '../context/AuthContext'

import {
  studentNav,
} from '../lib/dashboardNav'

import {
  requestAccountDeletion,
} from '../lib/accountApi'

import {
  getStudentProfileSettings,
  updateStudentProfileSettings,
} from '../lib/studentProfileApi'

import {
  createStudentResumeSignedUrl,
  deleteStudentAvatar,
  deleteStudentResume,
  getStudentStorageState,
  uploadStudentAvatar,
  uploadStudentResume,
} from '../lib/studentStorageApi'

const initialForm = {
  fullName: '',
  email: '',
  phone: '',
  college: '',
  university: '',
  degree: '',
  specialization: '',
  passingYear: '',
  bio: '',
  skillsText: '',
  preferredCategoriesText: '',
  preferredLocationsText: '',
  preferredWorkModes: [],
  availableImmediately: false,
  portfolioUrl: '',
  githubUrl: '',
  linkedinUrl: '',
}

const workModes = [
  ['remote', 'Remote'],
  ['hybrid', 'Hybrid'],
  ['onsite', 'On-site'],
]

function toCommaText(value) {
  return Array.isArray(value)
    ? value.join(', ')
    : ''
}

function toList(value) {
  return [
    ...new Set(
      String(value ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    ),
  ]
}

function mapProfileToForm(profile) {
  return {
    fullName: profile.fullName || '',
    email: profile.email || '',
    phone: profile.phone || '',
    college: profile.college || '',
    university: profile.university || '',
    degree: profile.degree || '',
    specialization:
      profile.specialization || '',
    passingYear:
      profile.passingYear
        ? String(profile.passingYear)
        : '',
    bio: profile.bio || '',
    skillsText: toCommaText(profile.skills),
    preferredCategoriesText:
      toCommaText(
        profile.preferredCategories
      ),
    preferredLocationsText:
      toCommaText(
        profile.preferredLocations
      ),
    preferredWorkModes:
      Array.isArray(
        profile.preferredWorkModes
      )
        ? profile.preferredWorkModes
        : [],
    availableImmediately:
      Boolean(
        profile.availableImmediately
      ),
    portfolioUrl:
      profile.portfolioUrl || '',
    githubUrl:
      profile.githubUrl || '',
    linkedinUrl:
      profile.linkedinUrl || '',
  }
}

function Field({
  label,
  hint,
  className = '',
  children,
}) {
  return (
    <label className={className}>
      <span className="mb-2 block text-sm font-bold">
        {label}
      </span>

      {children}

      {hint && (
        <span className="mt-2 block text-xs text-slate-500">
          {hint}
        </span>
      )}
    </label>
  )
}

function calculateCompletion(form) {
  const checks = [
    form.fullName,
    form.phone,
    form.college,
    form.degree,
    form.bio,
    toList(form.skillsText).length > 0,
    toList(
      form.preferredCategoriesText
    ).length > 0,
    toList(
      form.preferredLocationsText
    ).length > 0,
    form.preferredWorkModes.length > 0,
    form.linkedinUrl ||
      form.githubUrl ||
      form.portfolioUrl,
  ]

  return Math.round(
    (checks.filter(Boolean).length /
      checks.length) *
      100
  )
}

export default function StudentProfile() {
  const navigate = useNavigate()

  const {
    refreshProfile,
    signOut,
  } = useAuth()

  const [form, setForm] = useState(
    initialForm
  )

  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  const [error, setError] =
    useState('')

  const [avatarUrl, setAvatarUrl] =
    useState(null)

  const [avatarPath, setAvatarPath] =
    useState(null)

  const [resumePath, setResumePath] =
    useState(null)

  const [resumeUrl, setResumeUrl] =
    useState(null)

  const [uploadingAsset, setUploadingAsset] =
    useState('')

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

    async function loadProfile() {
      try {
        setLoading(true)
        setError('')

        const [
          profile,
          storageState,
        ] = await Promise.all([
          getStudentProfileSettings(),
          getStudentStorageState(),
        ])

        let signedResumeUrl = null

        if (storageState.resumePath) {
          signedResumeUrl =
            await createStudentResumeSignedUrl(
              storageState.resumePath,
              3600
            )
        }

        if (active) {
          setForm(
            mapProfileToForm(profile)
          )

          setAvatarPath(
            storageState.avatarPath
          )

          setAvatarUrl(
            storageState.avatarUrl
          )

          setResumePath(
            storageState.resumePath
          )

          setResumeUrl(
            signedResumeUrl
          )
        }
      } catch (loadError) {
        console.error(
          'Unable to load student profile:',
          loadError
        )

        if (active) {
          setError(
            loadError?.message ||
              'Unable to load your profile.'
          )
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadProfile()

    return () => {
      active = false
    }
  }, [])

  const completion = useMemo(
    () => calculateCompletion(form),
    [form]
  )

  function updateField(event) {
    const {
      name,
      value,
      type,
      checked,
    } = event.target

    setForm((current) => ({
      ...current,
      [name]:
        type === 'checkbox'
          ? checked
          : value,
    }))
  }

  function toggleWorkMode(mode) {
    setForm((current) => ({
      ...current,
      preferredWorkModes:
        current.preferredWorkModes.includes(
          mode
        )
          ? current.preferredWorkModes.filter(
              (item) => item !== mode
            )
          : [
              ...current.preferredWorkModes,
              mode,
            ],
    }))
  }

  async function handleAvatarSelection(event) {
    const file = event.target.files?.[0]

    event.target.value = ''

    if (!file || uploadingAsset) {
      return
    }

    try {
      setUploadingAsset('avatar')

      const uploaded =
        await uploadStudentAvatar(file)

      setAvatarPath(uploaded.path)
      setAvatarUrl(uploaded.publicUrl)

      await refreshProfile()

      toast.success(
        'Profile photo updated.'
      )
    } catch (uploadError) {
      console.error(
        'Unable to upload avatar:',
        uploadError
      )

      toast.error(
        uploadError?.message ||
          'Unable to upload the profile photo.'
      )
    } finally {
      setUploadingAsset('')
    }
  }

  async function handleDeleteAvatar() {
    if (
      !avatarPath ||
      uploadingAsset ||
      !window.confirm(
        'Remove your profile photo?'
      )
    ) {
      return
    }

    try {
      setUploadingAsset('avatar-delete')

      await deleteStudentAvatar()

      setAvatarPath(null)
      setAvatarUrl(null)

      await refreshProfile()

      toast.success(
        'Profile photo removed.'
      )
    } catch (deleteError) {
      console.error(
        'Unable to delete avatar:',
        deleteError
      )

      toast.error(
        deleteError?.message ||
          'Unable to remove the profile photo.'
      )
    } finally {
      setUploadingAsset('')
    }
  }

  async function handleResumeSelection(event) {
    const file = event.target.files?.[0]

    event.target.value = ''

    if (!file || uploadingAsset) {
      return
    }

    try {
      setUploadingAsset('resume')

      const uploaded =
        await uploadStudentResume(file)

      setResumePath(uploaded.path)
      setResumeUrl(uploaded.signedUrl)

      toast.success(
        'Resume uploaded securely.'
      )
    } catch (uploadError) {
      console.error(
        'Unable to upload resume:',
        uploadError
      )

      toast.error(
        uploadError?.message ||
          'Unable to upload the resume.'
      )
    } finally {
      setUploadingAsset('')
    }
  }

  async function handleRefreshResumeLink() {
    if (!resumePath || uploadingAsset) {
      return
    }

    try {
      setUploadingAsset('resume-link')

      const signedUrl =
        await createStudentResumeSignedUrl(
          resumePath,
          3600
        )

      setResumeUrl(signedUrl)

      if (signedUrl) {
        window.open(
          signedUrl,
          '_blank',
          'noopener,noreferrer'
        )
      }
    } catch (linkError) {
      console.error(
        'Unable to open resume:',
        linkError
      )

      toast.error(
        linkError?.message ||
          'Unable to open the resume.'
      )
    } finally {
      setUploadingAsset('')
    }
  }

  async function handleDeleteResume() {
    if (
      !resumePath ||
      uploadingAsset ||
      !window.confirm(
        'Remove your primary resume? Existing applications will keep their submitted resume securely.'
      )
    ) {
      return
    }

    try {
      setUploadingAsset('resume-delete')

      await deleteStudentResume()

      setResumePath(null)
      setResumeUrl(null)

      toast.success(
        'Primary resume removed.'
      )
    } catch (deleteError) {
      console.error(
        'Unable to delete resume:',
        deleteError
      )

      toast.error(
        deleteError?.message ||
          'Unable to remove the resume.'
      )
    } finally {
      setUploadingAsset('')
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (saving) {
      return
    }

    try {
      setSaving(true)

      const updated =
        await updateStudentProfileSettings({
          fullName: form.fullName,
          phone: form.phone,
          college: form.college,
          university: form.university,
          degree: form.degree,
          specialization:
            form.specialization,
          passingYear: form.passingYear,
          bio: form.bio,
          skills: toList(
            form.skillsText
          ),
          preferredCategories:
            toList(
              form.preferredCategoriesText
            ),
          preferredLocations:
            toList(
              form.preferredLocationsText
            ),
          preferredWorkModes:
            form.preferredWorkModes,
          availableImmediately:
            form.availableImmediately,
          portfolioUrl:
            form.portfolioUrl,
          githubUrl: form.githubUrl,
          linkedinUrl:
            form.linkedinUrl,
        })

      setForm(
        mapProfileToForm(updated)
      )

      await refreshProfile()

      toast.success(
        'Student profile updated.'
      )
    } catch (saveError) {
      console.error(
        'Unable to update student profile:',
        saveError
      )

      toast.error(
        saveError?.message ||
          'Unable to update your profile.'
      )
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
        'Delete this account? You will be signed out and dashboard access will be disabled.'
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
        title="Profile settings"
        navItems={studentNav}
      >
        <div className="card flex min-h-72 items-center justify-center">
          <LoaderCircle className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      </DashboardShell>
    )
  }

  if (error) {
    return (
      <DashboardShell
        title="Profile settings"
        navItems={studentNav}
      >
        <EmptyState
          title="Unable to load profile"
          text={error}
        />

        <div className="mt-6 text-center">
          <button
            type="button"
            className="btn-primary"
            onClick={() =>
              window.location.reload()
            }
          >
            Try again
          </button>
        </div>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell
      title="Profile settings"
      navItems={studentNav}
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <section className="card">
            <div className="flex items-start gap-3">
              <span className="rounded-2xl bg-emerald-50 p-3 text-emerald-600 dark:bg-emerald-950/40">
                <Upload className="h-5 w-5" />
              </span>

              <div>
                <h2 className="text-xl font-black">
                  Profile assets
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Upload a public profile photo and a private PDF resume.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <div className="rounded-3xl border p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl border bg-slate-100 dark:bg-slate-800">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={form.fullName || 'Student'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-slate-400" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <h3 className="font-black">
                      Profile photo
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      JPG, PNG, or WebP. Maximum 2 MB. This image is publicly visible.
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <label className={`btn-primary cursor-pointer ${uploadingAsset ? 'pointer-events-none opacity-50' : ''}`}>
                    {uploadingAsset === 'avatar' ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}

                    {avatarPath
                      ? 'Replace photo'
                      : 'Upload photo'}

                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={Boolean(uploadingAsset)}
                      onChange={handleAvatarSelection}
                    />
                  </label>

                  {avatarPath && (
                    <button
                      type="button"
                      className="btn-secondary text-red-600"
                      disabled={Boolean(uploadingAsset)}
                      onClick={handleDeleteAvatar}
                    >
                      {uploadingAsset === 'avatar-delete' ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}

                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border p-5">
                <div className="flex items-center gap-4">
                  <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl border bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-300">
                    <FileText className="h-9 w-9" />
                  </span>

                  <div className="min-w-0">
                    <h3 className="font-black">
                      Primary resume
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      PDF only. Maximum 5 MB. Stored privately and shared only through authorized access.
                    </p>

                    {resumePath && (
                      <p className="mt-2 truncate text-xs font-semibold text-emerald-600">
                        Resume uploaded
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <label className={`btn-primary cursor-pointer ${uploadingAsset ? 'pointer-events-none opacity-50' : ''}`}>
                    {uploadingAsset === 'resume' ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}

                    {resumePath
                      ? 'Replace resume'
                      : 'Upload resume'}

                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      disabled={Boolean(uploadingAsset)}
                      onChange={handleResumeSelection}
                    />
                  </label>

                  {resumePath && (
                    <>
                      {resumeUrl ? (
                        <a
                          href={resumeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-secondary"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Open resume
                        </a>
                      ) : (
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={Boolean(uploadingAsset)}
                          onClick={handleRefreshResumeLink}
                        >
                          {uploadingAsset === 'resume-link' ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                          ) : (
                            <ExternalLink className="h-4 w-4" />
                          )}
                          Open resume
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn-secondary text-red-600"
                        disabled={Boolean(uploadingAsset)}
                        onClick={handleDeleteResume}
                      >
                        {uploadingAsset === 'resume-delete' ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}

                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="card">
            <div className="flex items-start gap-3">
              <span className="rounded-2xl bg-brand-50 p-3 text-brand-600 dark:bg-brand-950/40">
                <UserRound className="h-5 w-5" />
              </span>

              <div>
                <h2 className="text-xl font-black">
                  Personal information
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Keep your name and contact details current.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <Field label="Full name">
                <input
                  className="input"
                  name="fullName"
                  value={form.fullName}
                  onChange={updateField}
                  minLength={2}
                  maxLength={120}
                  required
                />
              </Field>

              <Field
                label="Email address"
                hint="Email changes will be added in account security settings."
              >
                <input
                  className="input cursor-not-allowed opacity-70"
                  value={form.email}
                  disabled
                />
              </Field>

              <Field label="Phone number">
                <input
                  className="input"
                  name="phone"
                  value={form.phone}
                  onChange={updateField}
                  inputMode="tel"
                  maxLength={20}
                  placeholder="+91 98765 43210"
                />
              </Field>

              <label className="flex items-center gap-3 rounded-2xl border p-4 md:self-end">
                <input
                  type="checkbox"
                  name="availableImmediately"
                  checked={
                    form.availableImmediately
                  }
                  onChange={updateField}
                  className="h-4 w-4"
                />

                <span>
                  <span className="block font-bold">
                    Available immediately
                  </span>

                  <span className="mt-1 block text-xs text-slate-500">
                    Employers may use this when reviewing applications.
                  </span>
                </span>
              </label>
            </div>
          </section>

          <section className="card">
            <div className="flex items-start gap-3">
              <span className="rounded-2xl bg-violet-50 p-3 text-violet-600 dark:bg-violet-950/40">
                <GraduationCap className="h-5 w-5" />
              </span>

              <div>
                <h2 className="text-xl font-black">
                  Education
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Add the education details employers should see.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <Field label="College">
                <input
                  className="input"
                  name="college"
                  value={form.college}
                  onChange={updateField}
                  placeholder="College name"
                />
              </Field>

              <Field label="University">
                <input
                  className="input"
                  name="university"
                  value={form.university}
                  onChange={updateField}
                  placeholder="University name"
                />
              </Field>

              <Field label="Degree">
                <input
                  className="input"
                  name="degree"
                  value={form.degree}
                  onChange={updateField}
                  placeholder="BTech, BCA, MCA..."
                />
              </Field>

              <Field label="Specialization">
                <input
                  className="input"
                  name="specialization"
                  value={form.specialization}
                  onChange={updateField}
                  placeholder="Computer Science"
                />
              </Field>

              <Field label="Passing year">
                <input
                  className="input"
                  name="passingYear"
                  value={form.passingYear}
                  onChange={updateField}
                  inputMode="numeric"
                  min="1980"
                  max="2100"
                  placeholder="2027"
                />
              </Field>
            </div>
          </section>

          <section className="card">
            <div className="flex items-start gap-3">
              <span className="rounded-2xl bg-amber-50 p-3 text-amber-600 dark:bg-amber-950/40">
                <Sparkles className="h-5 w-5" />
              </span>

              <div>
                <h2 className="text-xl font-black">
                  Skills and preferences
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  These fields improve internship recommendations.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-5">
              <Field
                label="Professional summary"
                hint="Describe your interests, strengths, and the kind of work you want."
              >
                <textarea
                  className="input min-h-32 resize-y"
                  name="bio"
                  value={form.bio}
                  onChange={updateField}
                  maxLength={1200}
                  placeholder="Frontend student interested in React and modern web applications..."
                />
              </Field>

              <Field
                label="Skills"
                hint="Separate skills with commas."
              >
                <input
                  className="input"
                  name="skillsText"
                  value={form.skillsText}
                  onChange={updateField}
                  placeholder="React, JavaScript, HTML, CSS, Git"
                />
              </Field>

              <div className="grid gap-5 md:grid-cols-2">
                <Field
                  label="Preferred categories"
                  hint="Separate categories with commas."
                >
                  <input
                    className="input"
                    name="preferredCategoriesText"
                    value={
                      form.preferredCategoriesText
                    }
                    onChange={updateField}
                    placeholder="Web Development, UI/UX Design"
                  />
                </Field>

                <Field
                  label="Preferred locations"
                  hint="Separate locations with commas."
                >
                  <input
                    className="input"
                    name="preferredLocationsText"
                    value={
                      form.preferredLocationsText
                    }
                    onChange={updateField}
                    placeholder="Pune, Bengaluru, Remote"
                  />
                </Field>
              </div>

              <fieldset>
                <legend className="mb-3 text-sm font-bold">
                  Preferred work modes
                </legend>

                <div className="grid gap-3 sm:grid-cols-3">
                  {workModes.map(
                    ([value, label]) => {
                      const checked =
                        form.preferredWorkModes.includes(
                          value
                        )

                      return (
                        <label
                          key={value}
                          className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${
                            checked
                              ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30'
                              : 'hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              toggleWorkMode(
                                value
                              )
                            }
                            className="h-4 w-4"
                          />

                          <span className="font-semibold">
                            {label}
                          </span>
                        </label>
                      )
                    }
                  )}
                </div>
              </fieldset>
            </div>
          </section>

          <section className="card">
            <div className="flex items-start gap-3">
              <span className="rounded-2xl bg-cyan-50 p-3 text-cyan-600 dark:bg-cyan-950/40">
                <Link2 className="h-5 w-5" />
              </span>

              <div>
                <h2 className="text-xl font-black">
                  Professional links
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Add links that help employers evaluate your work.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-5">
              <Field label="Portfolio URL">
                <input
                  type="url"
                  className="input"
                  name="portfolioUrl"
                  value={form.portfolioUrl}
                  onChange={updateField}
                  placeholder="https://yourportfolio.com"
                />
              </Field>

              <Field label="GitHub URL">
                <input
                  type="url"
                  className="input"
                  name="githubUrl"
                  value={form.githubUrl}
                  onChange={updateField}
                  placeholder="https://github.com/username"
                />
              </Field>

              <Field label="LinkedIn URL">
                <input
                  type="url"
                  className="input"
                  name="linkedinUrl"
                  value={form.linkedinUrl}
                  onChange={updateField}
                  placeholder="https://linkedin.com/in/username"
                />
              </Field>
            </div>
          </section>

          <div className="flex justify-end">
            <button
              type="submit"
              className="btn-primary min-w-44"
              disabled={saving}
            >
              {saving ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}

              {saving
                ? 'Saving profile…'
                : 'Save profile'}
            </button>
          </div>
        </form>

        <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <section className="card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Profile strength
                </p>

                <p className="mt-1 text-3xl font-black">
                  {completion}%
                </p>
              </div>

              <CheckCircle2 className="h-9 w-9 text-emerald-500" />
            </div>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-brand-600 transition-all"
                style={{
                  width: `${completion}%`,
                }}
              />
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-500">
              Complete education, skills, preferences, and professional links to improve matching.
            </p>
          </section>

          <section className="card">
            <MapPin className="h-6 w-6 text-brand-600" />

            <h3 className="mt-4 font-black">
              Recommendation quality
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Categories, locations, skills, and work modes are used by the student dashboard recommendation score.
            </p>
          </section>

          <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/30">
            <h3 className="font-black text-emerald-900 dark:text-emerald-200">
              Secure document storage
            </h3>

            <p className="mt-2 text-sm leading-6 text-emerald-800 dark:text-emerald-300">
              Your avatar uses a public URL. Your resume remains private and opens through a temporary signed link.
            </p>
          </section>

          <section className="rounded-3xl border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/30">
            <h3 className="font-black text-red-900 dark:text-red-200">
              Delete account
            </h3>

            <p className="mt-2 text-sm leading-6 text-red-800 dark:text-red-300">
              This deactivates your account and signs
              you out. Existing applications and
              platform records are retained for
              audit and support.
            </p>

            <label className="mt-4 block">
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
              className="btn-secondary mt-4 w-full text-red-600"
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
          </section>
        </aside>
      </div>
    </DashboardShell>
  )
}
