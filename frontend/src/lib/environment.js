const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY

export const environment = {
  appName: 'InternNext',
  mode: import.meta.env.MODE,
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  appUrl: import.meta.env.VITE_APP_URL,
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseKey,
  whatsappOtpEnabled:
    import.meta.env.VITE_ENABLE_WHATSAPP_OTP ===
    'true',
}

function isValidUrl(value, requireHttps) {
  try {
    const url = new URL(value)

    return requireHttps
      ? url.protocol === 'https:'
      : ['http:', 'https:'].includes(
          url.protocol
        )
  } catch {
    return false
  }
}

export function validateEnvironment(
  candidate = environment
) {
  const missingVariables = []
  const invalidVariables = []

  if (!candidate.supabaseUrl) {
    missingVariables.push(
      'VITE_SUPABASE_URL'
    )
  }

  if (!candidate.supabaseKey) {
    missingVariables.push(
      'VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY'
    )
  }

  if (
    candidate.isProduction &&
    !candidate.appUrl
  ) {
    missingVariables.push('VITE_APP_URL')
  }

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing environment variables: ${missingVariables.join(', ')}`
    )
  }

  if (
    !isValidUrl(
      candidate.supabaseUrl,
      candidate.isProduction
    )
  ) {
    invalidVariables.push('VITE_SUPABASE_URL')
  }

  if (
    candidate.appUrl &&
    !isValidUrl(
      candidate.appUrl,
      candidate.isProduction
    )
  ) {
    invalidVariables.push('VITE_APP_URL')
  }

  if (invalidVariables.length > 0) {
    throw new Error(
      `Invalid environment variables: ${invalidVariables.join(', ')}`
    )
  }

  return true
}
