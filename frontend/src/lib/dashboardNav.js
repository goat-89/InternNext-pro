import {
Activity,
BadgeIndianRupee,
BarChart3,
Bookmark,
BriefcaseBusiness,
Building2,
CalendarDays,
CreditCard,
FileText,
Headphones,
LayoutDashboard,
ScrollText,
Send,
Settings,
Sparkles,
Users,
} from 'lucide-react'

export const studentNav = [
[
'Overview',
'/student/dashboard',
LayoutDashboard,
],
[
'Internships',
'/internships',
BriefcaseBusiness,
],
[
'Applications',
'/student/applications',
FileText,
],
[
'Saved',
'/student/saved',
Bookmark,
],
[
'Interviews',
'/student/interviews',
CalendarDays,
],
[
'Recommendations',
'/student/recommendations',
Sparkles,
],
[
'Billing',
'/student/billing',
CreditCard,
],
[
'Settings',
'/student/settings',
Settings,
],
]

export const employerNav = [
[
'Overview',
'/employer/dashboard',
LayoutDashboard,
],
[
'Post internship',
'/employer/post',
BriefcaseBusiness,
],
[
'Manage listings',
'/employer/listings',
FileText,
],
[
'Applicants',
'/employer/applicants',
Users,
],
[
'Analytics',
'/employer/analytics',
BarChart3,
],
[
'Billing',
'/employer/billing',
CreditCard,
],
[
'Support',
'/employer/support',
Headphones,
],
[
'Settings',
'/employer/settings',
Settings,
],
]

export const adminNav = [
  ['Overview', '/admin/dashboard', LayoutDashboard],
  ['Students', '/admin/students', Users],
  ['Employers', '/admin/employers', Building2],
  ['Internships', '/admin/internships', BriefcaseBusiness],
  ['Payments', '/admin/payments', BadgeIndianRupee],
  ['Subscriptions', '/admin/subscriptions', CreditCard],
  ['Support', '/admin/support', Headphones],
  ['Reports', '/admin/reports', BarChart3],
  ['Delivery', '/admin/notification-delivery', Send],
  ['System health', '/admin/system-health', Activity],
  ['Audit logs', '/admin/audit-logs', ScrollText],
  ['Settings', '/admin/settings', Settings],
]
