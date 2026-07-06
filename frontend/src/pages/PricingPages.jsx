import {
  useMemo,
  useState,
} from 'react'
import {
  Link,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Check,
  CreditCard,
  Landmark,
  LoaderCircle,
  ShieldCheck,
  Smartphone,
} from 'lucide-react'

import {
  Accordion,
  Section,
} from '../components/UI'
import {
  createRazorpayOrder,
  formatPaymentAmount,
  verifyRazorpayPayment,
} from '../lib/paymentsApi'

const pricingFaqs = [
  [
    'Is applying free for students?',
    'Yes. Students can browse, save, and apply for standard internships without buying a paid plan.',
  ],
  [
    'What do student paid plans include?',
    'Paid student plans add career services such as resume review, mock interview support, mentorship, priority support, and placement preparation.',
  ],
  [
    'What do employer paid plans include?',
    'Employer plans unlock paid hiring packages such as listing visibility, applicant dashboard access, hiring analytics, featured placement, and support options based on the selected plan.',
  ],
  [
    'How are payments verified?',
    'Razorpay orders are created through Supabase Edge Functions, and payment status is marked paid only after server-side signature verification.',
  ],
  [
    'Where can I view payment history?',
    'Students and employers can view completed Razorpay payment orders from their billing pages.',
  ],
  [
    'Can failed payments be retried?',
    'Yes. If checkout fails or verification does not complete, no plan is activated and you can retry the payment.',
  ],
]

const plans = {
  student: [
    {
      name: 'Starter',
      price: 0,
      features: [
        'Unlimited browsing',
        'Save internships',
        'Application tracking',
      ],
    },
    {
      name: 'Career Pro',
      planKey: 'student_career_pro',
      price: 1499,
      popular: true,
      features: [
        'ATS resume review',
        'Mock interview support',
        'Career mentorship',
        'Priority support',
      ],
    },
    {
      name: 'Placement Max',
      planKey: 'student_placement_max',
      price: 2999,
      features: [
        'Everything in Career Pro',
        'DSA mentoring',
        'Certification bundle',
        'Placement preparation support',
      ],
    },
  ],
  employer: [
    {
      name: 'Single Post',
      planKey: 'employer_single_post',
      price: 999,
      features: [
        '1 internship listing',
        'Applicant dashboard',
        '30-day visibility',
      ],
    },
    {
      name: 'Growth',
      planKey: 'employer_growth',
      price: 3499,
      popular: true,
      features: [
        '10 active listings',
        'Featured placement',
        'Hiring analytics',
        'Priority support',
      ],
    },
    {
      name: 'Scale',
      planKey: 'employer_scale',
      price: 7999,
      features: [
        'Expanded hiring campaigns',
        'Company spotlight',
        'Advanced analytics',
        'Account support',
      ],
    },
  ],
}

const methodOptions = [
  ['upi', 'UPI', Smartphone],
  ['card', 'Card', CreditCard],
  ['netbanking', 'Net banking', Landmark],
]

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function getPlanKey(type, plan) {
  if (plan?.planKey) {
    return plan.planKey
  }

  return `${type}_${slugify(plan?.name)}`
}

function loadRazorpayScript() {
  if (typeof window === 'undefined') {
    return Promise.resolve(false)
  }

  if (window.Razorpay) {
    return Promise.resolve(true)
  }

  return new Promise((resolve) => {
    const existingScript =
      document.querySelector(
        'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
      )

    if (existingScript) {
      existingScript.addEventListener(
        'load',
        () => resolve(true),
        { once: true }
      )
      existingScript.addEventListener(
        'error',
        () => resolve(false),
        { once: true }
      )
      return
    }

    const script =
      document.createElement('script')
    script.src =
      'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export function Pricing() {
  const [type, setType] =
    useState('student')
  const navigate = useNavigate()

  function choosePlan(plan) {
    if (Number(plan.price || 0) <= 0) {
      navigate('/signup/student')
      return
    }

    navigate('/checkout', {
      state: {
        plan,
        type,
      },
    })
  }

  return (
    <Section
      eyebrow="Simple pricing"
      title="Choose support that matches your goals"
    >
      <div className="mb-8 flex w-fit gap-2 rounded-2xl border bg-white p-1 dark:bg-slate-900">
        <button
          type="button"
          className={
            type === 'student'
              ? 'btn-primary'
              : 'btn'
          }
          onClick={() => setType('student')}
        >
          For students
        </button>

        <button
          type="button"
          className={
            type === 'employer'
              ? 'btn-primary'
              : 'btn'
          }
          onClick={() => setType('employer')}
        >
          For employers
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {plans[type].map((plan) => (
          <div
            key={plan.name}
            className={`card relative ${
              plan.popular
                ? 'border-brand-500 ring-4 ring-brand-50 dark:ring-brand-900/30'
                : ''
            }`}
          >
            {plan.popular && (
              <span className="badge absolute right-5 top-5 bg-brand-600 text-white">
                Most popular
              </span>
            )}

            <h3 className="text-2xl font-black">
              {plan.name}
            </h3>

            <p className="mt-5 text-4xl font-black">
              INR{' '}
              {plan.price.toLocaleString(
                'en-IN'
              )}
              <span className="text-sm font-medium text-slate-500">
                {' '}
                / plan
              </span>
            </p>

            <div className="mt-6 space-y-3">
              {plan.features.map(
                (feature) => (
                  <p
                    className="flex gap-2 text-sm"
                    key={feature}
                  >
                    <Check
                      className="text-emerald-600"
                      size={18}
                    />
                    {feature}
                  </p>
                )
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                choosePlan(plan)
              }
              className="btn-primary mt-7 w-full"
            >
              {plan.price > 0
                ? `Choose ${plan.name}`
                : 'Start free'}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-16">
        <h2 className="mb-6 text-2xl font-black">
          Pricing questions
        </h2>

        <Accordion items={pricingFaqs} />
      </div>
    </Section>
  )
}

export function Checkout() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const plan = state?.plan || plans.student[1]
  const type = state?.type || 'student'

  const [method, setMethod] =
    useState('upi')
  const [paying, setPaying] =
    useState(false)
  const [billing, setBilling] =
    useState({
      fullName: '',
      email: '',
      phone: '',
      gstNumber: '',
    })

  const planKey = useMemo(
    () => getPlanKey(type, plan),
    [type, plan]
  )

  function change(event) {
    const { name, value } =
      event.target

    setBilling((current) => ({
      ...current,
      [name]: value,
    }))
  }

  async function pay(event) {
    event.preventDefault()

    if (Number(plan.price || 0) <= 0) {
      toast.error(
        'This plan does not require payment.'
      )
      return
    }

    setPaying(true)

    try {
      const loaded =
        await loadRazorpayScript()

      if (!loaded) {
        throw new Error(
          'Unable to load Razorpay Checkout.'
        )
      }

      const order =
        await createRazorpayOrder({
          plan_key: planKey,
          billing: {
            full_name:
              billing.fullName,
            email: billing.email,
            phone: billing.phone,
            gst_number:
              billing.gstNumber,
          },
        })

      const checkout =
        new window.Razorpay({
          key: order.key_id,
          amount: order.amount,
          currency: order.currency,
          name: 'InternNext',
          description:
            order.plan_name ||
            plan.name,
          order_id:
            order.razorpay_order_id,
          prefill: {
            name:
              order.billing?.name ||
              billing.fullName,
            email:
              order.billing?.email ||
              billing.email,
            contact:
              order.billing?.contact ||
              billing.phone,
          },
          notes: {
            payment_order_id:
              order.payment_order_id,
            plan_key: planKey,
          },
          theme: {
            color: '#2563eb',
          },
          handler: async (response) => {
            try {
              const verification =
                await verifyRazorpayPayment({
                  payment_order_id:
                    order.payment_order_id,
                  razorpay_payment_id:
                    response.razorpay_payment_id,
                  razorpay_order_id:
                    response.razorpay_order_id,
                  razorpay_signature:
                    response.razorpay_signature,
                })

              toast.success(
                'Payment verified.'
              )

              navigate('/payment-success', {
                state: {
                  plan,
                  order:
                    verification.order,
                },
              })
            } catch (error) {
              toast.error(
                error?.message ||
                  'Payment verification failed.'
              )

              navigate('/payment-failed', {
                state: { plan },
              })
            } finally {
              setPaying(false)
            }
          },
          modal: {
            ondismiss: () => {
              setPaying(false)
            },
          },
        })

      checkout.open()
    } catch (error) {
      toast.error(
        error?.message ||
          'Unable to start payment.'
      )
      setPaying(false)
    }
  }

  return (
    <div className="container-app py-12">
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <form
          onSubmit={pay}
          className="card space-y-6"
        >
          <div>
            <h1 className="text-3xl font-black">
              Secure checkout
            </h1>

            <p className="mt-2 text-slate-500">
              Razorpay creates the order on the server and verifies payment before your plan is marked paid.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <input
              required
              className="input"
              name="fullName"
              value={billing.fullName}
              onChange={change}
              placeholder="Full name"
            />

            <input
              required
              type="email"
              className="input"
              name="email"
              value={billing.email}
              onChange={change}
              placeholder="Billing email"
            />

            <input
              className="input"
              name="phone"
              value={billing.phone}
              onChange={change}
              placeholder="Phone number"
            />

            <input
              className="input"
              name="gstNumber"
              value={billing.gstNumber}
              onChange={change}
              placeholder="GST number (optional)"
            />
          </div>

          <div>
            <h2 className="font-black">
              Preferred method
            </h2>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {methodOptions.map(
                ([id, name, Icon]) => (
                  <button
                    type="button"
                    onClick={() =>
                      setMethod(id)
                    }
                    className={
                      method === id
                        ? 'btn-primary'
                        : 'btn-secondary'
                    }
                    key={id}
                  >
                    <Icon size={18} />
                    {name}
                  </button>
                )
              )}
            </div>

            <p className="mt-2 text-xs text-slate-500">
              Razorpay will show all enabled payment options in the secure checkout window.
            </p>
          </div>

          <button
            disabled={paying}
            className="btn-primary w-full"
          >
            {paying ? (
              <LoaderCircle
                className="animate-spin"
                size={18}
              />
            ) : (
              <ShieldCheck size={18} />
            )}
            Pay{' '}
            {formatPaymentAmount(
              plan.price * 100,
              'INR'
            )}
          </button>
        </form>

        <aside className="card h-fit">
          <h2 className="text-xl font-black">
            Order summary
          </h2>

          <div className="mt-5 flex justify-between">
            <span>{plan.name}</span>
            <b>
              {formatPaymentAmount(
                plan.price * 100,
                'INR'
              )}
            </b>
          </div>

          <div className="mt-3 flex justify-between text-sm text-slate-500">
            <span>Taxes</span>
            <span>Included</span>
          </div>

          <div className="mt-5 flex justify-between border-t pt-5 text-lg font-black">
            <span>Total</span>
            <span>
              {formatPaymentAmount(
                plan.price * 100,
                'INR'
              )}
            </span>
          </div>

          <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-slate-500">
            <ShieldCheck
              className="mt-0.5 shrink-0"
              size={15}
            />
            Payment is fulfilled only after server-side Razorpay signature verification.
          </p>
        </aside>
      </div>
    </div>
  )
}

export function PaymentResult({
  success = true,
}) {
  const { state } = useLocation()
  const planName =
    state?.order?.plan_name ||
    state?.plan?.name ||
    'Your plan'
  const billingPath =
    state?.order?.role_scope ===
    'employer'
      ? '/employer/billing'
      : '/student/billing'

  return (
    <div className="container-app grid min-h-[70vh] place-items-center text-center">
      <div className="card max-w-lg">
        <div
          className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${
            success
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-rose-100 text-rose-700'
          }`}
        >
          {success ? 'OK' : '!'}
        </div>

        <h1 className="mt-5 text-3xl font-black">
          Payment{' '}
          {success
            ? 'successful'
            : 'failed'}
        </h1>

        <p className="mt-3 text-slate-500">
          {success
            ? `${planName} is active after server verification.`
            : 'No plan was activated. Review the details and retry.'}
        </p>

        <div className="mt-6 flex justify-center gap-3">
          <Link
            className="btn-primary"
            to={
              success
                ? billingPath
                : '/checkout'
            }
            state={state}
          >
            {success
              ? 'View billing'
              : 'Retry payment'}
          </Link>

          <Link
            className="btn-secondary"
            to="/"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  )
}
