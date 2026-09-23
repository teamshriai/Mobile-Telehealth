import { createContext } from 'react'
import type { RoleName, User } from '../types/domain'
import type { MeProfile } from '../services/auth.service'

export type AuthStatus = 'checking' | 'anonymous' | 'authenticated'

export interface AuthError {
  message: string
  fieldErrors: Record<string, string[]> | string[] | null
}

export type AuthResult =
  | { success: true; role: string | undefined; needsOnboarding: boolean }
  | { success: false; fieldErrors: Record<string, string[]> | string[] | null }

export interface RegisterFormInput {
  firstName: string
  lastName: string
  email: string
  dateOfBirth: string
  phoneNumber: string
  password: string
  role?: RoleName
  agreed: boolean
}

export interface LoginCredentialsInput {
  email: string
  password: string
}

export interface AuthContextValue {
  user: User | null
  permissions: string[]
  profile: MeProfile
  status: AuthStatus
  error: AuthError | null
  loading: boolean
  isAuthenticated: boolean
  isChecking: boolean
  role: string | null
  needsOnboarding: boolean
  can: (permission: string) => boolean
  login: (credentials: LoginCredentialsInput) => Promise<AuthResult>
  register: (formData: RegisterFormInput) => Promise<AuthResult>
  logout: () => Promise<void>
  endSession: () => void
  reloadUser: () => Promise<void>
  clearError: () => void
}

/**
 * The context object lives in its own module, imported by both the provider
 * (AuthContext.tsx) and the hook (useAuth.ts). A file that exports the raw
 * context object alongside the Provider *component* would still trip
 * react-refresh/only-export-components — that is the whole reason for this
 * three-way split.
 */
export const AuthContext = createContext<AuthContextValue | null>(null)
