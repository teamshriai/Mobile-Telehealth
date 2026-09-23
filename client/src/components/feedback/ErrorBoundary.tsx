import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

/**
 * ErrorBoundary
 *
 * Phase 1 found no error boundary anywhere: a single render-time throw
 * white-screened the whole application with no recovery path.
 *
 * Class component because React provides no hook equivalent of
 * componentDidCatch — this is one of the few places a class is still required.
 *
 * Note what it does NOT catch, so callers do not over-trust it: event handlers,
 * async code, and errors thrown during SSR. Those still need local try/catch.
 */
export interface ErrorBoundaryProps {
  children?: ReactNode
  label?: string
  fallback?: (args: { error: Error | null; reset: () => void }) => ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Console only for now. Wire to Sentry/equivalent in Phase 4 — deliberately
    // not adding a monitoring dependency during a foundation phase.
    console.error('[ErrorBoundary]', this.props.label ?? 'app', error, errorInfo)
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children

    if (this.props.fallback) {
      return this.props.fallback({ error: this.state.error, reset: this.handleReset })
    }

    return (
      <div
        role="alert"
        className="flex min-h-[60vh] w-full items-center justify-center px-4 py-10"
      >
        <div className="w-full max-w-md text-center">
          <span
            aria-hidden="true"
            className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-critical-bg"
          >
            <AlertTriangle size={26} className="text-critical-fg" />
          </span>

          <h1 className="text-xl font-semibold text-ink">
            Something went wrong on this page
          </h1>

          {/* Plain language, no stack trace, no error codes. A patient can act
              on "try again"; they cannot act on a component stack. */}
          <p className="mt-2.5 text-sm leading-relaxed text-ink-muted">
            This part of the portal could not be displayed. Your information is safe.
            Try again, and if it keeps happening please contact your care team.
          </p>

          <div className="mt-7 flex flex-col justify-center gap-2.5 sm:flex-row">
            <button
              type="button"
              onClick={this.handleReset}
              className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary-600 px-5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-700"
            >
              <RefreshCw size={15} aria-hidden="true" /> Try again
            </button>
            {/* "/" rather than "/app": this boundary wraps every portal, and
                the patient home is the wrong destination for a doctor or an
                administrator. RootRedirect resolves "/" to whichever portal
                the signed-in role actually belongs to. A plain <a> (not a
                Link) is deliberate — a full reload is the reliable escape
                when the router itself may be what threw. */}
            <a
              href="/"
              className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-surface-1 px-5 text-sm font-semibold text-ink-muted transition-colors hover:bg-surface-2"
            >
              <Home size={15} aria-hidden="true" /> Back to home
            </a>
          </div>

          {/* Dev-only detail. Never rendered in a production build. */}
          {import.meta.env.DEV && this.state.error && (
            <pre className="mt-6 overflow-x-auto rounded-lg bg-surface-2 p-3 text-left text-xs text-critical-fg">
              {String(this.state.error?.stack ?? this.state.error)}
            </pre>
          )}
        </div>
      </div>
    )
  }
}
