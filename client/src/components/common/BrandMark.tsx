/**
 * SHRI HEALTH brand mark — the SHRI ribbon. One source of truth, so the logo
 * is never redrawn separately per header (shell, sidebar, auth screens).
 *
 * Decorative (`alt=""`): every placement sets the "SHRI HEALTH" wordmark or an
 * sr-only name beside it, so a screen reader hears the name once, not twice.
 *
 * `tile` sets the ribbon on a white rounded chip, for placements on a
 * saturated background where the ribbon's blue half would disappear.
 */
export interface BrandMarkProps {
  /** Legacy sizing knob kept for existing call sites: the mark is `size + 14` px square. */
  size?: number
  tile?: boolean
}

export default function BrandMark({ size = 18, tile = false }: BrandMarkProps) {
  const box = size + 14
  const img = (
    <img
      src="/brand/shri-health-mark-64.webp"
      srcSet="/brand/shri-health-mark-64.webp 64w, /brand/shri-health-mark-128.webp 128w"
      sizes={`${tile ? box - 8 : box}px`}
      width={tile ? box - 8 : box}
      height={tile ? box - 8 : box}
      alt=""
      decoding="async"
      draggable={false}
      className="block select-none object-contain"
    />
  )
  if (!tile) return <span className="inline-flex flex-shrink-0">{img}</span>
  return (
    <span
      className="inline-flex flex-shrink-0 items-center justify-center rounded-xl bg-white shadow-sm"
      style={{ width: box, height: box }}
    >
      {img}
    </span>
  )
}
