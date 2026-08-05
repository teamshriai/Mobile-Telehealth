/**
 * useLocalStorage — Synced state with localStorage
 * Drop-in replacement for useState with persistence
 */

import { useState } from 'react'

export function useLocalStorage(key, initialValue) {
  /* ── Read from localStorage on init ── */
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (err) {
      console.warn(`useLocalStorage: Failed to read key "${key}"`, err)
      return initialValue
    }
  })

  /* ── Write to localStorage on change ── */
  const setValue = (value) => {
    try {
      const valueToStore =
        value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      localStorage.setItem(key, JSON.stringify(valueToStore))
    } catch (err) {
      console.warn(`useLocalStorage: Failed to write key "${key}"`, err)
    }
  }

  /* ── Remove from localStorage ── */
  const removeValue = () => {
    try {
      localStorage.removeItem(key)
      setStoredValue(initialValue)
    } catch (err) {
      console.warn(`useLocalStorage: Failed to remove key "${key}"`, err)
    }
  }

  return [storedValue, setValue, removeValue]
}