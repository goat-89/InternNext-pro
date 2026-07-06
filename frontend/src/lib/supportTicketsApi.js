import { supabase } from './supabase'

const allowedCategories = [
  'student_support',
  'employer_inquiry',
  'payment_support',
  'partnership',
  'general',
]

const allowedStatuses = [
  'open',
  'in_progress',
  'resolved',
  'closed',
]

function cleanText(value) {
  return String(value ?? '').trim()
}

function normalizeCategory(value) {
  const category = cleanText(value)

  if (
    allowedCategories.includes(
      category
    )
  ) {
    return category
  }

  return 'general'
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  )
}

export async function createSupportTicket(
  values
) {
  const fullName = cleanText(
    values?.fullName
  )
  const email = cleanText(
    values?.email
  ).toLowerCase()
  const phone = cleanText(
    values?.phone
  )
  const category = normalizeCategory(
    values?.category
  )
  const subject = cleanText(
    values?.subject
  )
  const message = cleanText(
    values?.message
  )

  if (!fullName) {
    throw new Error(
      'Enter your full name.'
    )
  }

  if (!validateEmail(email)) {
    throw new Error(
      'Enter a valid email address.'
    )
  }

  if (!subject) {
    throw new Error(
      'Enter a subject.'
    )
  }

  if (!message) {
    throw new Error(
      'Tell us how we can help.'
    )
  }

  const { data, error } =
    await supabase.rpc(
      'create_support_ticket',
      {
        ticket_data: {
          full_name: fullName,
          email,
          phone,
          category,
          subject,
          message,
        },
      }
    )

  if (error) {
    throw error
  }

  return data
}

export async function getAdminSupportTickets(
  {
    status = 'all',
    limit = 100,
  } = {}
) {
  const safeStatus =
    status === 'all' ||
    allowedStatuses.includes(status)
      ? status
      : 'all'

  const { data, error } =
    await supabase.rpc(
      'list_admin_support_tickets',
      {
        p_status: safeStatus,
        p_limit: limit,
      }
    )

  if (error) {
    throw error
  }

  return data ?? []
}

export async function updateAdminSupportTicket(
  ticketId,
  {
    status,
    adminNotes = '',
  }
) {
  if (!ticketId) {
    throw new Error(
      'Support ticket ID is required.'
    )
  }

  if (!allowedStatuses.includes(status)) {
    throw new Error(
      'Invalid support ticket status.'
    )
  }

  const { data, error } =
    await supabase.rpc(
      'update_admin_support_ticket',
      {
        p_ticket_id: ticketId,
        p_status: status,
        p_admin_notes: cleanText(
          adminNotes
        ),
      }
    )

  if (error) {
    throw error
  }

  return data
}
