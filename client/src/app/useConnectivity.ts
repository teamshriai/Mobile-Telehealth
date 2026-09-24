import { useEffect, useState } from 'react'

/**
 * Am I online?
 *
 * ⚠️ `navigator.onLine` IS NOT A REACHABILITY TEST and this hook does not
 * pretend otherwise. The browser reports "online" for any network interface
 * being up, including a ward Wi-Fi that has an IP address and no route to the
 * hospital. So: `false` here means *definitely* offline and is trustworthy;
 * `true` means "no reason to think otherwise" and is not.
 *
 * That asymmetry is why the `OFFLINE` strip (`C-37`) is driven from this hook
 * but a *failed request* is handled separately by the screens. This is the
 * cheap, instant signal; a request that times out is the authoritative one.
 * Treating `navigator.onLine === true` as proof of connectivity is the
 * classic way to build an offline indicator that lies.
 *
 * ⚠️ NO POLLING. A heartbeat request every few seconds from every open tab is
 * real load on a hospital's network for a signal the browser already pushes.
 * The `online`/`offline` events fire on the transitions that matter.
 */
export function useConnectivity(): { online: boolean; since: Date | null } {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )
  const [since, setSince] = useState<Date | null>(null)

  useEffect(() => {
    function goOnline() {
      setOnline(true)
      setSince(null)
    }
    function goOffline() {
      setOnline(false)
      // Stamped once, on the transition — so the strip can say how long, and
      // does not reset every render.
      setSince(new Date())
    }

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return { online, since }
}
