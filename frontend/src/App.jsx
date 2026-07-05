import {
  lazy,
  Suspense,
} from 'react'

import {
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'

import { PublicLayout } from './components/Layout'

import GuestRoute from './components/auth/GuestRoute'
import OnboardingRoute from './components/auth/OnboardingRoute'
import ProtectedRoute from './components/ProtectedRoute'

import {
  PublicInternshipAccessGate,
} from './components/PublicInternshipAccessGate';

const Home = lazy(() =>
  import('./pages/PublicPages').then(
    (module) => ({
      default: module.Home,
    })
  )
)

const About = lazy(() =>
  import('./pages/PublicPages').then(
    (module) => ({
      default: module.About,
    })
  )
)

const Services = lazy(() =>
  import('./pages/PublicPages').then(
    (module) => ({
      default: module.Services,
    })
  )
)

const Blog = lazy(() =>
  import('./pages/ResourcePages').then(
    (module) => ({
      default: module.Resources,
    })
  )
)

const Help = lazy(() =>
  import('./pages/ResourcePages').then(
    (module) => ({
      default: module.HelpCenter,
    })
  )
)

const Contact = lazy(() =>
  import('./pages/PublicPages').then(
    (module) => ({
      default: module.Contact,
    })
  )
)

const Legal = lazy(() =>
  import('./pages/LegalPages')
)

const NotFound = lazy(() =>
  import('./pages/PublicPages').then(
    (module) => ({
      default: module.NotFound,
    })
  )
)

const Internships = lazy(() =>
  import('./pages/InternshipPages').then(
    (module) => ({
      default: module.Internships,
    })
  )
)

const InternshipDetail = lazy(() =>
  import('./pages/InternshipPages').then(
    (module) => ({
      default: module.InternshipDetail,
    })
  )
)

const Pricing = lazy(() =>
  import('./pages/PricingPages').then(
    (module) => ({
      default: module.Pricing,
    })
  )
)

const Checkout = lazy(() =>
  import('./pages/PricingPages').then(
    (module) => ({
      default: module.Checkout,
    })
  )
)

const PaymentResult = lazy(() =>
  import('./pages/PricingPages').then(
    (module) => ({
      default: module.PaymentResult,
    })
  )
)

const EmployerAccessInvite = lazy(() =>
  import('./pages/EmployerAccessInvite')
)

const StudentDashboard = lazy(() =>
  import('./pages/Dashboards').then(
    (module) => ({
      default: module.StudentDashboard,
    })
  )
)

const StudentApplications = lazy(() =>
  import('./pages/Dashboards').then(
    (module) => ({
      default: module.StudentApplications,
    })
  )
)

const Saved = lazy(() =>
  import('./pages/Dashboards').then(
    (module) => ({
      default: module.Saved,
    })
  )
)

const Billing = lazy(() =>
  import('./pages/Dashboards').then(
    (module) => ({
      default: module.Billing,
    })
  )
)

const StudentRecommendations = lazy(() =>
  import('./pages/StudentRecommendations')
)

const AdminDashboard = lazy(() =>
  import('./pages/Dashboards').then(
    (module) => ({
      default: module.AdminDashboard,
    })
  )
)

const EmployerDashboard = lazy(() =>
  import('./pages/EmployerDashboard')
)

const EmployerPipeline = lazy(() =>
  import('./pages/EmployerPipeline')
)

const EmployerBilling = lazy(() =>
  import('./pages/EmployerBilling')
)

const EmployerSupport = lazy(() =>
  import('./pages/EmployerSupport')
)

const PostInternship = lazy(() =>
  import('./pages/PostInternship')
)

const StudentPasswordlessAuth = lazy(() =>
  import('./pages/auth/StudentPasswordlessAuth')
)

const EmployerSignup = lazy(() =>
  import('./pages/auth/EmployerSignup')
)

const PublicAuthRouter = lazy(() =>
  import('./pages/auth/PublicAuthRouter')
)

const LoginPage = lazy(() =>
  import('./pages/auth/LoginPage')
)

const AdminAccessPage = lazy(() =>
  import('./pages/auth/AdminAccessPage')
)

const VerifyEmail = lazy(() =>
  import('./pages/auth/VerifyEmail')
)

const AuthCallback = lazy(() =>
  import('./pages/auth/AuthCallback')
)

const ForgotPassword = lazy(() =>
  import('./pages/auth/ForgotPassword')
)

const ResetPassword = lazy(() =>
  import('./pages/auth/ResetPassword')
)

const Unauthorized = lazy(() =>
  import('./pages/auth/Unauthorized')
)

const AccountSuspended = lazy(() =>
  import('./pages/auth/AccountSuspended')
)

const AccountDeleted = lazy(() =>
  import('./pages/auth/AccountDeleted')
)

const StudentOnboarding = lazy(() =>
  import('./pages/onboarding/StudentOnboarding')
)

const EmployerOnboarding = lazy(() =>
  import('./pages/onboarding/EmployerOnboarding')
)

const EmployerListings = lazy(() =>
  import('./pages/EmployerListings')
)

const Applicants = lazy(() =>
  import('./pages/Applicants')
)

const AdminInternships = lazy(() =>
  import('./pages/AdminInternships')
)

const AdminEmployers = lazy(() =>
  import('./pages/AdminEmployers')
)

const AdminStudents = lazy(() =>
  import('./pages/AdminStudents')
)

const EditInternship = lazy(() =>
  import('./pages/EditInternship')
)

const EmployerAnalytics = lazy(() =>
  import('./pages/EmployerAnalytics')
)

const Notifications = lazy(() =>
  import('./pages/Notifications')
)

const NotificationSettings = lazy(() =>
  import('./pages/NotificationSettings')
)

const StudentInterviews = lazy(() =>
  import('./pages/StudentInterviews')
)

const StudentProfile = lazy(() =>
  import('./pages/StudentProfile')
)

const EmployerSettings = lazy(() =>
  import('./pages/EmployerSettings')
)

const AdminAuditLogs = lazy(() =>
  import('./pages/AdminAuditLogs')
)

const AdminReports = lazy(() =>
  import('./pages/AdminReports')
)

const AdminPlatformSettings = lazy(() =>
  import('./pages/AdminPlatformSettings')
)

const AdminSupportTickets = lazy(() =>
  import('./pages/AdminSupportTickets')
)

const AdminPayments = lazy(() =>
  import('./pages/AdminPayments')
)

const AdminSubscriptions = lazy(() =>
  import('./pages/AdminSubscriptions')
)

const AdminNotificationDelivery = lazy(() =>
  import('./pages/AdminNotificationDelivery')
)

const AdminSystemHealth = lazy(() =>
  import('./pages/AdminSystemHealth')
)

function RouteFallback() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 text-sm font-semibold text-slate-500 dark:bg-slate-950 dark:text-slate-300">
      Loading...
    </div>
  )
}

function PublicPage({ children }) {
  return (
    <PublicLayout>
      {children}
    </PublicLayout>
  )
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
      {/* =====================================================
          PUBLIC WEBSITE
      ===================================================== */}

      <Route
        path="/"
        element={
          <PublicPage>
            <Home />
          </PublicPage>
        }
      />

      <Route
        path="/about"
        element={
          <PublicPage>
            <About />
          </PublicPage>
        }
      />

      <Route
        path="/services"
        element={
          <PublicPage>
            <Services />
          </PublicPage>
        }
      />

      <Route
  path="/internships"
  element={
    <PublicPage>
      <PublicInternshipAccessGate>
        <Internships />
      </PublicInternshipAccessGate>
    </PublicPage>
  }
/>

      <Route
  path="/internships/:id"
  element={
    <PublicPage>
      <PublicInternshipAccessGate>
        <InternshipDetail />
      </PublicInternshipAccessGate>
    </PublicPage>
  }
/>

      <Route
        path="/pricing"
        element={
          <PublicPage>
            <Pricing />
          </PublicPage>
        }
      />

      <Route
        path="/contact"
        element={
          <PublicPage>
            <Contact />
          </PublicPage>
        }
      />

      <Route
        path="/employer-access/:token"
        element={
          <PublicPage>
            <EmployerAccessInvite />
          </PublicPage>
        }
      />

      <Route
        path="/blog"
        element={
          <PublicPage>
            <Blog />
          </PublicPage>
        }
      />

      <Route
        path="/help"
        element={
          <PublicPage>
            <Help />
          </PublicPage>
        }
      />

      <Route
        path="/privacy"
        element={
          <PublicPage>
            <Legal documentKey="privacy" />
          </PublicPage>
        }
      />

      <Route
        path="/terms"
        element={
          <PublicPage>
            <Legal documentKey="terms" />
          </PublicPage>
        }
      />

      <Route
        path="/refund"
        element={
          <PublicPage>
            <Legal documentKey="refund" />
          </PublicPage>
        }
      />

      <Route
        path="/cookies"
        element={
          <PublicPage>
            <Legal documentKey="cookies" />
          </PublicPage>
        }
      />

      <Route
        path="/employer-terms"
        element={
          <PublicPage>
            <Legal documentKey="employer" />
          </PublicPage>
        }
      />

      <Route
        path="/student-safety"
        element={
          <PublicPage>
            <Legal documentKey="safety" />
          </PublicPage>
        }
      />

      <Route
        path="/community-guidelines"
        element={
          <PublicPage>
            <Legal documentKey="community" />
          </PublicPage>
        }
      />

      <Route
        path="/data-deletion"
        element={
          <PublicPage>
            <Legal documentKey="deletion" />
          </PublicPage>
        }
      />

      <Route
        path="/grievance"
        element={
          <PublicPage>
            <Legal documentKey="grievance" />
          </PublicPage>
        }
      />

      <Route
        path="/acceptable-use"
        element={
          <PublicPage>
            <Legal documentKey="acceptableUse" />
          </PublicPage>
        }
      />

      {/* =====================================================
          GUEST-ONLY AUTHENTICATION
      ===================================================== */}

      <Route element={<GuestRoute />}>
        <Route
          path="/signup/student"
          element={<StudentPasswordlessAuth initialMode="signup" />}
        />

        <Route
          path="/signup/employer"
          element={<EmployerSignup />}
        />
  
        <Route
          path="/login"
          element={<PublicAuthRouter />}
        />

        <Route
          path="/login/student"
          element={<StudentPasswordlessAuth initialMode="login" />}
        />

        <Route
          path="/login/employer"
          element={<LoginPage expectedRole="employer" />}
        />

        <Route
          path="/internal/access"
          element={<AdminAccessPage />}
        />

        <Route
          path="/forgot-password"
          element={
            <PublicPage>
              <ForgotPassword />
            </PublicPage>
          }
        />
      </Route>

      {/* Old signup URL redirect */}
      <Route
        path="/signup"
        element={
          <Navigate
            to="/signup/student"
            replace
          />
        }
      />

      {/* =====================================================
          EMAIL VERIFICATION AND PASSWORD RECOVERY
      ===================================================== */}

      <Route
        path="/verify-email"
        element={
          <PublicPage>
            <VerifyEmail />
          </PublicPage>
        }
      />

      <Route
        path="/auth/callback"
        element={<AuthCallback />}
      />

      <Route
        path="/reset-password"
        element={
          <PublicPage>
            <ResetPassword />
          </PublicPage>
        }
      />

      <Route
        path="/unauthorized"
        element={
          <PublicPage>
            <Unauthorized />
          </PublicPage>
        }
      />

      <Route
        path="/account-suspended"
        element={<AccountSuspended />}
      />

      <Route
        path="/account-deleted"
        element={<AccountDeleted />}
      />

      {/* =====================================================
          STUDENT ONBOARDING
      ===================================================== */}

      <Route
        element={
          <OnboardingRoute role="student" />
        }
      >
        <Route
          path="/onboarding/student"
          element={<StudentOnboarding />}
        />
      </Route>

      {/* =====================================================
          EMPLOYER ONBOARDING
      ===================================================== */}

      <Route
        element={
          <OnboardingRoute role="employer" />
        }
      >
        <Route
          path="/onboarding/employer"
          element={<EmployerOnboarding />}
        />
      </Route>

      {/* =====================================================
          STUDENT DASHBOARD
      ===================================================== */}

      <Route
        element={
          <ProtectedRoute
            allowedRoles={['student']}
          />
        }
      >
        <Route
          path="/student/dashboard"
          element={<StudentDashboard />}
        />

        <Route
          path="/student/applications"
          element={<StudentApplications />}
        />

        <Route
          path="/student/saved"
          element={<Saved />}
        />

        <Route
          path="/student/interviews"
          element={<StudentInterviews />}
        />

        <Route
          path="/student/recommendations"
          element={<StudentRecommendations />}
        />

        <Route
          path="/student/notifications"
          element={<Notifications />}
        />

        <Route
          path="/student/notification-settings"
          element={<NotificationSettings />}
        />

        <Route
          path="/student/billing"
          element={<Billing />}
        />

        <Route
          path="/student/settings"
          element={<StudentProfile />}
        />

      </Route>

      {/* =====================================================
          EMPLOYER DASHBOARD
      ===================================================== */}

      <Route
        element={
          <ProtectedRoute
            allowedRoles={['employer']}
          />
        }
      >
        <Route
          path="/employer/dashboard"
          element={<EmployerDashboard />}
        />

        <Route
          path="/employer/post"
          element={<PostInternship />}
        />

        <Route
          path="/employer/post-internship"
          element={<PostInternship />}
        />

        <Route
          path="/employer/listings"
          element={<EmployerListings />}
        />

        <Route
          path="/employer/applicants"
          element={<Applicants />}
        />

        <Route
          path="/employer/pipeline"
          element={<EmployerPipeline />}
        />

        <Route
          path="/employer/analytics"
          element={<EmployerAnalytics />}
        />

        <Route
          path="/employer/billing"
          element={<EmployerBilling />}
        />

        <Route
          path="/employer/notifications"
          element={<Notifications />}
        />

        <Route
          path="/employer/notification-settings"
          element={<NotificationSettings />}
        />

        <Route
          path="/employer/listings/:id/edit"
          element={<EditInternship />}
        />

        <Route
          path="/employer/settings"
          element={<EmployerSettings />}
        />

        <Route
          path="/employer/support"
          element={<EmployerSupport />}
        />
      </Route>

      {/* =====================================================
          ADMIN DASHBOARD
      ===================================================== */}

      <Route
        element={
          <ProtectedRoute
            allowedRoles={['admin']}
          />
        }
      >
        <Route
          path="/admin/dashboard"
          element={<AdminDashboard />}
        />

        <Route
          path="/admin/audit-logs"
          element={<AdminAuditLogs />}
          />

        <Route
          path="/admin/students"
          element={<AdminStudents />}
        />

        <Route
          path="/admin/employers"
          element={<AdminEmployers />}
        />    

        <Route
          path="/admin/internships"
          element={<AdminInternships />}
        />

        <Route
          path="/admin/payments"
          element={<AdminPayments />}
        />

        <Route
          path="/admin/subscriptions"
          element={<AdminSubscriptions />}
        />

        <Route
          path="/admin/support"
          element={<AdminSupportTickets />}
        />

        <Route
          path="/admin/reports"
          element={<AdminReports />}
        />

        <Route
          path="/admin/notifications"
          element={<Notifications />}
        />

        <Route
          path="/admin/notification-delivery"
          element={<AdminNotificationDelivery />}
        />

        <Route
          path="/admin/system-health"
          element={<AdminSystemHealth />}
        />

        <Route
          path="/admin/notification-settings"
          element={<NotificationSettings />}
        />

        <Route
          path="/admin/settings"
          element={<AdminPlatformSettings />}
        />
      </Route>

      {/* =====================================================
          PROTECTED CHECKOUT
      ===================================================== */}

      <Route
        element={
          <ProtectedRoute
            allowedRoles={[
              'student',
              'employer',
            ]}
          />
        }
      >
        <Route
          path="/checkout"
          element={
            <PublicPage>
              <Checkout />
            </PublicPage>
          }
        />
      </Route>

      {/* =====================================================
          PAYMENT RESULT
      ===================================================== */}

      <Route
        path="/payment-success"
        element={
          <PublicPage>
            <PaymentResult success />
          </PublicPage>
        }
      />

      <Route
        path="/payment-failed"
        element={
          <PublicPage>
            <PaymentResult success={false} />
          </PublicPage>
        }
      />

      {/* Legacy dashboard URL */}
      <Route
        path="/dashboard"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />

      {/* Legacy OTP URL */}
      <Route
        path="/otp"
        element={
          <Navigate
            to="/verify-email"
            replace
          />
        }
      />

      {/* =====================================================
          404
      ===================================================== */}

      <Route
        path="*"
        element={
          <PublicPage>
            <NotFound />
          </PublicPage>
        }
      />
      </Routes>
    </Suspense>
  )
}
