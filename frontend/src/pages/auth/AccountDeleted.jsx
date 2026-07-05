import { Link } from 'react-router-dom'

export default function AccountDeleted() {
  return (
    <main className="mx-auto max-w-lg px-4 py-20 text-center">
      <div className="card p-8">
        <h1 className="text-2xl font-black">
          Account deleted
        </h1>

        <p className="mt-3 text-slate-500">
          This InternNext account has been
          deactivated. Contact support if this was a
          mistake or if you need help with your data.
        </p>

        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to="/contact"
            className="btn-primary"
          >
            Contact support
          </Link>

          <Link
            to="/"
            className="btn-secondary"
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  )
}
