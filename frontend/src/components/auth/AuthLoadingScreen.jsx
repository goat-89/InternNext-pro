import { LoaderCircle } from 'lucide-react'

export default function AuthLoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <LoaderCircle className="mx-auto h-8 w-8 animate-spin" />

        <p className="mt-3 text-sm text-slate-500">
          Loading your InternNext account…
        </p>
      </div>
    </div>
  )
}