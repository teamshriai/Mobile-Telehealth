/* Stroke AI brand mark — circular blue badge with a heartbeat/pulse glyph.
   Single source of truth so the logo isn't hand-drawn separately in every
   header (sidebar, landing nav/footer, auth screens). */
export default function BrandMark({ size = 18, rounded = 'rounded-lg' }) {
  return (
    <div
      className={`flex flex-shrink-0 items-center justify-center ${rounded}`}
      style={{
        width: size + 14,
        height: size + 14,
        background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)',
      }}
    >
      <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
        <path
          d="M1.5 9.5H5L6.5 4.5L9.5 13.5L11 9.5H16.5"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}
