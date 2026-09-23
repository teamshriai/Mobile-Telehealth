import { useContext } from 'react'
import { AuthContext, type AuthContextValue } from './authContextObject'

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (ctx === null) {
    throw new Error('useAuth must be used within <AuthProvider>. Wrap the app in App.tsx.')
  }
  return ctx
}
