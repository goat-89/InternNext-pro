import { z } from 'zod'

const passwordSchema = z
  .string()
  .min(8, 'Password must contain at least 8 characters.')
  .regex(
    /[A-Z]/,
    'Include at least one uppercase letter.'
  )
  .regex(
    /[a-z]/,
    'Include at least one lowercase letter.'
  )
  .regex(
    /[0-9]/,
    'Include at least one number.'
  )
  .regex(
    /[^A-Za-z0-9]/,
    'Include at least one special character.'
  )

export const studentSignupSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Enter your full name.')
      .max(120),

    email: z
      .string()
      .trim()
      .email('Enter a valid email address.'),

    phone: z
      .string()
      .trim()
      .min(7, 'Enter a valid phone number.')
      .max(20),

    password: passwordSchema,

    confirmPassword: z.string(),

    acceptedTerms: z.literal(true, {
      errorMap: () => ({
        message:
          'You must accept the terms and privacy policy.',
      }),
    }),
  })
  .refine(
    (values) =>
      values.password ===
      values.confirmPassword,
    {
      message: 'Passwords do not match.',
      path: ['confirmPassword'],
    }
  )

export const employerSignupSchema = z
  .object({
    contactPerson: z
      .string()
      .trim()
      .min(2, 'Enter the contact person name.'),

    companyName: z
      .string()
      .trim()
      .min(2, 'Enter the company name.'),

    email: z
      .string()
      .trim()
      .email('Enter a valid business email.'),

    phone: z
      .string()
      .trim()
      .min(7)
      .max(20),

    password: passwordSchema,
    confirmPassword: z.string(),

    acceptedTerms: z.literal(true, {
      errorMap: () => ({
        message:
          'You must accept the terms and privacy policy.',
      }),
    }),
  })
  .refine(
    (values) =>
      values.password ===
      values.confirmPassword,
    {
      message: 'Passwords do not match.',
      path: ['confirmPassword'],
    }
  )

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Enter a valid email address.'),

  password: z
    .string()
    .min(1, 'Enter your password.'),
})

export const studentEmailOtpSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Enter a valid email address.'),
})

export const studentPhoneOtpSchema = z.object({
  countryCode: z
    .string()
    .trim()
    .regex(/^\+\d{1,4}$/, 'Select a valid country code.'),

  phone: z
    .string()
    .trim()
    .min(6, 'Enter a valid mobile number.')
    .max(15, 'Enter a valid mobile number.')
    .regex(/^[0-9\s()-]+$/, 'Use digits only.'),
})

export const otpVerificationSchema = z.object({
  token: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter the six-digit code.'),
})

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Enter a valid email address.'),
})

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine(
    (values) =>
      values.password ===
      values.confirmPassword,
    {
      message: 'Passwords do not match.',
      path: ['confirmPassword'],
    }
  )
