/**
 * Where the API lives, for specs that talk to it directly.
 *
 * ⚠️ IN ITS OWN FILE TO BREAK AN IMPORT CYCLE. `authState.ts` imports the demo
 * cast from `helpers.ts`, so the moment `helpers.ts` imported `API_ORIGIN`
 * back from `authState.ts` the two modules formed a cycle — `DOCTOR` was still
 * `undefined` when `authState` initialised `DEMO_USERS`, and Playwright
 * reported "No tests found" rather than anything resembling the cause. A
 * constant with no imports of its own cannot participate in a cycle.
 *
 * ⚠️ NOT the app's origin. The client is served on one port and the API on
 * another; `VITE_API_BASE_URL` overrides both in a deployed build.
 */
export const API_ORIGIN = process.env.VITE_API_BASE_URL ?? 'http://localhost:5000'
