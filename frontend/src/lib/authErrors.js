export function getAuthErrorMessage(error) {
  const message = error?.message?.toLowerCase() || ''

  if (message.includes('invalid login credentials')) {
    return 'The email or password is incorrect.'
  }

  if (message.includes('email not confirmed')) {
    return 'Please verify your email before signing in.'
  }

  if (message.includes('user already registered')) {
    return 'An account already exists with this email.'
  }

  if (message.includes('password should be')) {
    return 'Use a stronger password with at least 8 characters.'
  }

  if (message.includes('rate limit')) {
    return 'Too many attempts. Please wait before trying again.'
  }

  if (
    message.includes('otp') ||
    message.includes('token')
  ) {
    return 'The code is invalid or expired. Request a new code and try again.'
  }

  if (
    message.includes('signups not allowed') ||
    message.includes('user not found') ||
    message.includes('shouldcreateuser')
  ) {
    return 'We could not complete this request. Check your details or choose create account.'
  }

  if (
    message.includes('provider') ||
    message.includes('oauth') ||
    message.includes('unsupported')
  ) {
    return 'This sign-in provider is not configured yet. Try another method or contact support.'
  }

  if (message.includes('network')) {
    return 'Network error. Check your internet connection.'
  }

  return error?.message || 'Something went wrong.'
}
