import { useState } from 'react'
import {
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  Database,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function SupabaseConnectionTest() {
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState(
    'Connection has not been tested.'
  )

  async function testConnection() {
    try {
      setStatus('loading')
      setMessage('Connecting to Supabase...')

      /*
       * This checks whether the Supabase Auth client can initialize
       * correctly with the current project configuration.
       */
      const { error } = await supabase.auth.getSession()

      if (error) {
        throw error
      }

      setStatus('success')
      setMessage(
        'Supabase client initialized successfully. Database tables will be tested in Step 2.'
      )
    } catch (error) {
      console.error('Supabase connection test failed:', error)

      setStatus('error')
      setMessage(
        error.message || 'Unable to initialize Supabase.'
      )
    }
  }

  return (
    <section className="mx-auto max-w-2xl p-6">
      <div className="card p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-brand-50 p-3 dark:bg-brand-950">
            <Database className="h-6 w-6 text-brand-600" />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold">
              Supabase connection
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Verify that InternNext can initialize the Supabase
              client.
            </p>

            <div className="mt-5 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex items-start gap-3">
                {status === 'success' && (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                )}

                {status === 'error' && (
                  <CircleAlert className="mt-0.5 h-5 w-5 text-red-600" />
                )}

                {status === 'loading' && (
                  <LoaderCircle className="mt-0.5 h-5 w-5 animate-spin" />
                )}

                <p className="text-sm">{message}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={testConnection}
              disabled={status === 'loading'}
              className="btn-primary mt-5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === 'loading' ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Testing connection
                </>
              ) : (
                'Test Supabase connection'
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}