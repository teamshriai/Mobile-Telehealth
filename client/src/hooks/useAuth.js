/**
 * useAuth.js
 *
 * Thin React hook that surfaces auth operations and status to components.
 * - Exposes login / register / logout / user.
 * - Manages loading + error state so components stay declarative.
 */

import { useState, useCallback } from 'react'
import * as authService from '../services/auth.service'

export function useAuth() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [user, setUser] = useState(() => authService.getStoredUser())

  const clearError = useCallback(() => setError(null), [])

  const handleLogin = useCallback(async (credentials) => {
    setLoading(true)
    setError(null)
    try {
      const { user: u } = await authService.login(credentials)
      setUser(u)
      return { success: true }
    } catch (err) {
      const fieldErrors = err.fieldErrors ?? null
      setError({ message: err.message, fieldErrors })
      return { success: false, fieldErrors }
    } finally {
      setLoading(false)
    }
  }, [])

  const handleRegister = useCallback(async (formData) => {
    setLoading(true)
    setError(null)
    try {
      const { user: u } = await authService.register(formData)
      setUser(u)
      return { success: true }
    } catch (err) {
      const fieldErrors = err.fieldErrors ?? null
      setError({ message: err.message, fieldErrors })
      return { success: false, fieldErrors }
    } finally {
      setLoading(false)
    }
  }, [])

  const handleLogout = useCallback(async () => {
    await authService.logout()
    setUser(null)
  }, [])

  return {
    user,
    loading,
    error,
    clearError,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
  }
}
