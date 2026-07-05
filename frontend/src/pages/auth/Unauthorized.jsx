import { Link } from 'react-router-dom'

export default function Unauthorized() {
  return (
    <main className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="text-3xl font-bold">
        Access restricted
      </h1>

      <p className="mt-3 text-slate-500">
        Your account does not have permission to open this page.
      </p>

      <Link
        to="/"
        className="btn-primary mt-6"
      >
        Return home
      </Link>
    </main>
  )
}