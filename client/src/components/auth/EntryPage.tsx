import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Building2, CheckCircle, HeartPulse, Shield, Stethoscope } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import BrandMark from '../common/BrandMark'
import AuthShell from './AuthShell'
import { AUDIENCE_COPY, type Audience } from './audience'

/**
 * "Who are you?" — the entry to Indostates Health.
 *
 * ⚠️ A DOOR, NOT A ROLE CLAIM. Choosing a card changes which sign-in method
 * and wording follow; it is never sent to the server. The account's own role
 * decides where a person lands after signing in (see `audience.ts`).
 *
 * Shown at `/` for signed-out visitors and at `/login` when no audience was
 * chosen, so the guards' existing redirects to `/login` (session expiry, a
 * protected link, a password reset) still arrive somewhere that makes sense.
 * Their router state is forwarded through the card links, so "return to where
 * you were" survives the extra step.
 */

const CARDS: Array<{ audience: Audience; icon: LucideIcon }> = [
  { audience: 'patient', icon: HeartPulse },
  { audience: 'clinician', icon: Stethoscope },
  { audience: 'hospital', icon: Building2 },
]

interface EntryLocationState {
  message?: string
  expired?: boolean
  from?: string
}

export default function EntryPage() {
  const location = useLocation()
  const state = (location.state ?? null) as EntryLocationState | null

  return (
    <AuthShell>
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-5xl flex-col justify-center px-4 py-10 sm:px-6">
        <div className="mb-8 flex items-center gap-2.5">
          <BrandMark size={18} />
          <span className="text-sm font-semibold tracking-tight text-ink">Indostates Health</span>
        </div>

        {state?.expired === true && (
          <p role="status" className="mb-5 flex max-w-xl items-center gap-2 rounded-md border border-warning-fg/40 bg-warning-bg px-3.5 py-2.5 text-sm font-medium text-warning-fg">
            <Shield size={16} strokeWidth={2} aria-hidden="true" className="flex-shrink-0" />
            <span>You were signed out to protect your information. Please sign in again.</span>
          </p>
        )}
        {state?.message !== undefined && state.message !== '' && (
          <p role="status" className="mb-5 flex max-w-xl items-center gap-2 rounded-md border border-success-fg/25 bg-success-bg px-3.5 py-2.5 text-sm font-medium text-success-fg">
            <CheckCircle size={16} strokeWidth={2} aria-hidden="true" className="flex-shrink-0" />
            <span>{state.message}</span>
          </p>
        )}

        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Welcome to Indostates Health
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-muted sm:text-base">
          Choose how you use Indostates Health to sign in.
        </p>

        <ul className="mt-8 grid grid-cols-1 gap-3 lg:grid-cols-3 lg:gap-4">
          {CARDS.map(({ audience, icon: Icon }, i) => {
            const copy = AUDIENCE_COPY[audience]
            return (
              <motion.li
                key={audience}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.05 }}
                className="flex"
              >
                <Link
                  to={`/login?as=${audience}`}
                  state={state ?? undefined}
                  data-testid={`entry-${audience}`}
                  className="focus-ring group flex w-full items-start gap-4 rounded-xl border border-border-soft bg-surface-1 p-5 shadow-card-sm transition-colors hover:border-primary-600/50 lg:flex-col lg:gap-5 lg:p-6"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-600/10 text-primary-700"
                  >
                    <Icon size={20} strokeWidth={1.75} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-base font-semibold text-ink">{copy.title}</span>
                    <span className="mt-1 text-sm leading-relaxed text-ink-muted">{copy.blurb}</span>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 lg:mt-auto lg:pt-5">
                      Sign in
                      <ArrowRight size={15} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </span>
                </Link>
              </motion.li>
            )
          })}
        </ul>

        <p className="mt-6 text-sm text-ink-muted">
          New patient?{' '}
          <Link to="/register" className="focus-ring rounded font-semibold text-primary-700 hover:underline">
            Create an account
          </Link>
        </p>
        <p className="mt-2 max-w-xl text-xs leading-relaxed text-ink-subtle">
          Clinician and hospital accounts are not created here. Your hospital administrator adds
          clinicians; hospital administrators are set up by the Indostates Health team.
        </p>
      </div>
    </AuthShell>
  )
}
