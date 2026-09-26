/**
 * A tiny trend line — decorative context beside a number the text already
 * states, so it is `aria-hidden`. Two series draw two lines (blood pressure).
 * An optional band shades the lab's own reference range.
 */
export default function Sparkline({
  series,
  band,
  width = 96,
  height = 28,
}: {
  series: number[][]
  band?: { low: number | null; high: number | null }
  width?: number
  height?: number
}) {
  const all = series.flat()
  if (all.length === 0) return null
  const bandVals = [band?.low, band?.high].filter((v): v is number => v !== null && v !== undefined)
  let min = Math.min(...all, ...bandVals)
  let max = Math.max(...all, ...bandVals)
  if (max === min) {
    max += 1
    min -= 1
  }
  const pad = 3
  const x = (i: number, n: number): number => (n <= 1 ? width / 2 : pad + (i * (width - pad * 2)) / (n - 1))
  const y = (v: number): number => height - pad - ((v - min) / (max - min)) * (height - pad * 2)
  const strokes = ['var(--color-primary-600)', 'var(--color-ink-subtle)']
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="overflow-visible">
      {band && band.low !== null && band.high !== null && (
        <rect x={0} width={width} y={y(band.high)} height={Math.max(1, y(band.low) - y(band.high))} fill="var(--color-success-bg)" />
      )}
      {series.map((s, k) => {
        if (s.length === 0) return null
        const d = s.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i, s.length).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
        const last = s[s.length - 1]
        return (
          <g key={k}>
            {s.length > 1 && <path d={d} fill="none" stroke={strokes[k] ?? strokes[0]} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />}
            <circle cx={x(s.length - 1, s.length)} cy={y(last)} r={2.4} fill={strokes[k] ?? strokes[0]} />
          </g>
        )
      })}
    </svg>
  )
}
