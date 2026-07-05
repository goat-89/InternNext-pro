import {
  Component,
} from 'react'

import {
  AlertTriangle,
  House,
  RefreshCw,
} from 'lucide-react'

import {
  createErrorReference,
  reportOperationalEvent,
} from '../lib/operationalEventsApi'

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)

    this.state = {
      failed: false,
      referenceId: '',
    }
  }

  static getDerivedStateFromError() {
    return {
      failed: true,
    }
  }

  componentDidCatch() {
    const referenceId =
      createErrorReference()

    this.setState({ referenceId })

    void reportOperationalEvent({
      eventType: 'react_render_error',
      code: 'REACT_RENDER_ERROR',
      requestId: referenceId,
    })
  }

  render() {
    if (!this.state.failed) {
      return this.props.children
    }

    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10 text-slate-950 dark:bg-slate-950 dark:text-white">
        <section className="w-full max-w-md text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
            <AlertTriangle size={24} />
          </span>

          <h1 className="mt-5 text-2xl font-black">
            Something went wrong
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            The page could not continue safely.
            Reload it or return to the home page.
          </p>

          {this.state.referenceId && (
            <p className="mt-4 font-mono text-xs text-slate-500">
              Reference:{' '}
              {this.state.referenceId}
            </p>
          )}

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              className="btn-primary"
              onClick={() =>
                window.location.reload()
              }
            >
              <RefreshCw size={17} />
              Reload
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                window.location.assign('/')
              }
            >
              <House size={17} />
              Home
            </button>
          </div>
        </section>
      </main>
    )
  }
}
