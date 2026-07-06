import {
  supabase,
} from './supabase'

const AVATAR_BUCKET =
  'student-avatars'

const RESUME_BUCKET =
  'student-resumes'

const MAX_AVATAR_SIZE =
  2 * 1024 * 1024

const MAX_RESUME_SIZE =
  5 * 1024 * 1024

const avatarExtensions = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

function createUniqueId() {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID ===
      'function'
  ) {
    return crypto.randomUUID()
  }

  return [
    Date.now(),
    Math.random()
      .toString(36)
      .slice(2),
  ].join('-')
}

function validateFileObject(file) {
  if (
    !file ||
    typeof file !== 'object' ||
    typeof file.size !== 'number'
  ) {
    throw new Error(
      'Select a valid file.'
    )
  }
}

function validateAvatar(file) {
  validateFileObject(file)

  const extension =
    avatarExtensions[file.type]

  if (!extension) {
    throw new Error(
      'Avatar must be a JPG, PNG, or WebP image.'
    )
  }

  if (file.size > MAX_AVATAR_SIZE) {
    throw new Error(
      'Avatar size must not exceed 2 MB.'
    )
  }

  return extension
}

function validateResume(file) {
  validateFileObject(file)

  if (
    file.type !==
    'application/pdf'
  ) {
    throw new Error(
      'Resume must be a PDF file.'
    )
  }

  if (file.size > MAX_RESUME_SIZE) {
    throw new Error(
      'Resume size must not exceed 5 MB.'
    )
  }

  return 'pdf'
}

async function requireStudent() {
  const {
    data: {
      user,
    },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    throw userError
  }

  if (!user) {
    throw new Error(
      'You must sign in as a student.'
    )
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from('profiles')
    .select(`
      id,
      role,
      account_status,
      avatar_path
    `)
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    throw profileError
  }

  if (
    !profile ||
    profile.role !== 'student'
  ) {
    throw new Error(
      'Student access is required.'
    )
  }

  if (
    profile.account_status ===
    'suspended'
  ) {
    throw new Error(
      'This student account is suspended.'
    )
  }

  return {
    user,
    profile,
  }
}

async function getPrimaryResumePath(
  userId
) {
  const {
    data,
    error,
  } = await supabase
    .from('student_profiles')
    .select('primary_resume_path')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return (
    data?.primary_resume_path ||
    null
  )
}

async function removeObjectQuietly(
  bucket,
  path
) {
  if (!path) {
    return
  }

  const {
    error,
  } = await supabase.storage
    .from(bucket)
    .remove([path])

  if (error) {
    console.error(
      `Unable to remove ${bucket} object:`,
      error
    )
  }
}

async function isResumeUsedByApplication(
  userId,
  resumePath
) {
  if (!resumePath) {
    return false
  }

  const {
    data,
    error,
  } = await supabase
    .from('applications')
    .select('id')
    .eq('student_id', userId)
    .eq('resume_path', resumePath)
    .limit(1)

  if (error) {
    throw error
  }

  return (
    Array.isArray(data) &&
    data.length > 0
  )
}

export function getStudentAvatarUrl(
  avatarPath
) {
  if (!avatarPath) {
    return null
  }

  const {
    data,
  } = supabase.storage
    .from(AVATAR_BUCKET)
    .getPublicUrl(avatarPath)

  return data?.publicUrl || null
}

export async function createStudentResumeSignedUrl(
  resumePath,
  expiresIn = 600
) {
  if (!resumePath) {
    return null
  }

  const safeExpiry =
    Number.isFinite(
      Number(expiresIn)
    )
      ? Math.min(
          Math.max(
            Number(expiresIn),
            60
          ),
          3600
        )
      : 600

  const {
    data,
    error,
  } = await supabase.storage
    .from(RESUME_BUCKET)
    .createSignedUrl(
      resumePath,
      safeExpiry
    )

  if (error) {
    throw error
  }

  return data?.signedUrl || null
}

export async function getStudentStorageState() {
  const {
    user,
    profile,
  } = await requireStudent()

  const resumePath =
    await getPrimaryResumePath(
      user.id
    )

  return {
    avatarPath:
      profile.avatar_path || null,

    avatarUrl:
      getStudentAvatarUrl(
        profile.avatar_path
      ),

    resumePath,
  }
}

export async function uploadStudentAvatar(
  file
) {
  const extension =
    validateAvatar(file)

  const {
    user,
    profile,
  } = await requireStudent()

  const previousPath =
    profile.avatar_path || null

  const newPath = [
    user.id,
    `avatar-${createUniqueId()}.${extension}`,
  ].join('/')

  const {
    error: uploadError,
  } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(
      newPath,
      file,
      {
        cacheControl: '3600',
        contentType: file.type,
        upsert: false,
      }
    )

  if (uploadError) {
    throw uploadError
  }

  try {
    const {
      error: updateError,
    } = await supabase.rpc(
      'set_student_avatar_path',
      {
        asset_path: newPath,
      }
    )

    if (updateError) {
      throw updateError
    }
  } catch (error) {
    await removeObjectQuietly(
      AVATAR_BUCKET,
      newPath
    )

    throw error
  }

  if (
    previousPath &&
    previousPath !== newPath
  ) {
    await removeObjectQuietly(
      AVATAR_BUCKET,
      previousPath
    )
  }

  return {
    path: newPath,
    publicUrl:
      getStudentAvatarUrl(
        newPath
      ),
  }
}

export async function deleteStudentAvatar() {
  const {
    profile,
  } = await requireStudent()

  const previousPath =
    profile.avatar_path || null

  const {
    error,
  } = await supabase.rpc(
    'set_student_avatar_path',
    {
      asset_path: null,
    }
  )

  if (error) {
    throw error
  }

  await removeObjectQuietly(
    AVATAR_BUCKET,
    previousPath
  )

  return true
}

export async function uploadStudentResume(
  file
) {
  const extension =
    validateResume(file)

  const {
    user,
  } = await requireStudent()

  const previousPath =
    await getPrimaryResumePath(
      user.id
    )

  const newPath = [
    user.id,
    `resume-${createUniqueId()}.${extension}`,
  ].join('/')

  const {
    error: uploadError,
  } = await supabase.storage
    .from(RESUME_BUCKET)
    .upload(
      newPath,
      file,
      {
        cacheControl: '3600',
        contentType:
          'application/pdf',
        upsert: false,
      }
    )

  if (uploadError) {
    throw uploadError
  }

  try {
    const {
      error: updateError,
    } = await supabase.rpc(
      'set_student_resume_path',
      {
        asset_path: newPath,
      }
    )

    if (updateError) {
      throw updateError
    }
  } catch (error) {
    await removeObjectQuietly(
      RESUME_BUCKET,
      newPath
    )

    throw error
  }

  if (
    previousPath &&
    previousPath !== newPath
  ) {
    try {
      const isReferenced =
        await isResumeUsedByApplication(
          user.id,
          previousPath
        )

      if (!isReferenced) {
        await removeObjectQuietly(
          RESUME_BUCKET,
          previousPath
        )
      }
    } catch (cleanupError) {
      console.error(
        'Unable to check the previous resume:',
        cleanupError
      )
    }
  }

  return {
    path: newPath,

    signedUrl:
      await createStudentResumeSignedUrl(
        newPath
      ),
  }
}

export async function deleteStudentResume() {
  const {
    user,
  } = await requireStudent()

  const previousPath =
    await getPrimaryResumePath(
      user.id
    )

  const {
    error,
  } = await supabase.rpc(
    'set_student_resume_path',
    {
      asset_path: null,
    }
  )

  if (error) {
    throw error
  }

  if (previousPath) {
    const isReferenced =
      await isResumeUsedByApplication(
        user.id,
        previousPath
      )

    if (!isReferenced) {
      await removeObjectQuietly(
        RESUME_BUCKET,
        previousPath
      )
    }
  }

  return true
}