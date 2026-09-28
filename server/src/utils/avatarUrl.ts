/**
 * Portrait URLs sent to patients — the one place they are built.
 *
 * `DoctorProfile.profilePhoto` and `PatientProfile.profilePhoto` hold a KEY,
 * such as "doctors/priya-nair.webp", never a URL (schema.prisma: "Stores only
 * the relative filename… Full URL is constructed at the service layer"). The
 * files themselves are served by the web app from `client/public/avatars/`,
 * so a patient's browser only ever loads portraits from our own origin.
 *
 * ⚠️ A doctor can currently write any string of up to 500 characters into
 * their own `profilePhoto` (doctorProfile.validator.ts). Anything that is not
 * a known-safe key therefore becomes null — never passed through — so a
 * patient's page can never be pointed at an arbitrary address (a tracking
 * pixel, mixed content, a `javascript:` URL).
 */
// A lower-case slug of 1–64 characters. Flat and bounded, so it runs in linear
// time; a slug may not start or end with a hyphen (checked below).
const AVATAR_KEY = /^(?:doctors|patients)\/([a-z0-9-]{1,64})\.webp$/;

export function avatarUrl(key: string | null | undefined): string | null {
  if (typeof key !== 'string') return null;
  const trimmed = key.trim();
  const slug = AVATAR_KEY.exec(trimmed)?.[1];
  if (slug === undefined || slug.startsWith('-') || slug.endsWith('-')) return null;
  return `/avatars/${trimmed}`;
}
