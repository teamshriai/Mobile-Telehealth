import os from 'node:os'

/**
 * This machine's LAN address, discovered at runtime.
 *
 * ⚠️ NEVER HARDCODE THE IP. It is handed out by DHCP and changes with the
 * network, the router's lease table and the time of day. A test pinned to
 * `192.168.29.230` passes on one laptop on one afternoon and is a mystery
 * failure everywhere else — and worse, it passes for the wrong reason if some
 * other machine happens to answer on that address.
 *
 * Returns the first non-internal IPv4 address. IPv4 rather than IPv6 because
 * `dev:lan` (`vite --host`) advertises the v4 address in its "Network:" line,
 * so this matches what a person would actually type into a phone.
 */
export function lanAddress(): string | null {
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const a of addrs ?? []) {
      // Node <18 reports `family` as the string 'IPv4'; newer as the number 4.
      const isV4 = a.family === 'IPv4' || (a.family as unknown as number) === 4
      if (isV4 && !a.internal) return a.address
    }
  }
  return null
}

/** The origin a device on the Wi-Fi would open, or `null` if there is no LAN. */
export function lanOrigin(port = 3000): string | null {
  const ip = lanAddress()
  return ip === null ? null : `http://${ip}:${port}`
}
