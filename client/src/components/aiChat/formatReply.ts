/**
 * A model reply, parsed into a small, safe structure.
 *
 * ⚠️ NEVER HTML. The reply is model output — untrusted text. It is parsed
 * into plain data (paragraphs, lists, bold runs, source tags) and rendered
 * as React elements, so nothing in it can become markup, a link to anywhere
 * but a fixed portal page, or a script. Markdown links are reduced to their
 * text; images, code and headings to plain text.
 *
 * Source tags ("[Lab report 10 Sep 2026]") become chips that open the part
 * of the portal the fact came from. Only tag KINDS this product writes are
 * linked; anything else in brackets stays plain text.
 */

export type Inline =
  | { t: 'text'; v: string }
  | { t: 'bold'; v: Inline[] }
  | { t: 'tag'; label: string; to: string | null }

export type Block = { t: 'p'; lines: Inline[][] } | { t: 'ul' | 'ol'; items: Inline[][] }

const TAG_ROUTES: Array<[RegExp, string]> = [
  [/^lab report\b/i, '/app/reports?tab=labs'],
  [/^scan report\b/i, '/app/reports'],
  [/^vitals\b/i, '/app/reports?tab=vitals'],
  [/^(prescription|your dose log)\b/i, '/app/medicines'],
  [/^appointments?\b/i, '/app/appointments'],
  [/^care team\b/i, '/app/my-doctors'],
  [/^(visit|diagnosis|instructions)\b/i, '/app/health'],
  [/^your health note\b/i, '/app/health-notes'],
  [/^your profile\b/i, '/app/profile'],
]

export function routeForTag(label: string): string | null {
  for (const [re, to] of TAG_ROUTES) if (re.test(label.trim())) return to
  return null
}

/** Bold runs and source tags inside one line. */
export function parseInline(text: string): Inline[] {
  const out: Inline[] = []
  // Markdown links → their text; stray markup characters → gone.
  const clean = text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\((?:[^)]*)\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
  const re = /\*\*([^*]+)\*\*|__([^_]+)__|\[([^[\]\n]{2,60})\]/g
  let last = 0
  for (const m of clean.matchAll(re)) {
    const at = m.index ?? 0
    if (at > last) out.push({ t: 'text', v: clean.slice(last, at) })
    if (m[1] !== undefined || m[2] !== undefined) {
      out.push({ t: 'bold', v: parseInline(m[1] ?? m[2]) })
    } else {
      const label = m[3].trim()
      const to = routeForTag(label)
      out.push(to === null ? { t: 'text', v: m[0] } : { t: 'tag', label, to })
    }
    last = at + m[0].length
  }
  if (last < clean.length) out.push({ t: 'text', v: clean.slice(last) })
  // Single * or _ emphasis markers carry no meaning worth keeping.
  return out.map((n) => (n.t === 'text' ? { t: 'text', v: n.v.replace(/(^|\s)[*_](\S)/g, '$1$2').replace(/(\S)[*_](\s|$|[.,;:!?])/g, '$1$2') } : n))
}

const BULLET = /^\s*[-*•]\s+/
const NUMBERED = /^\s*\d+[.)]\s+/

export function formatReply(text: string): Block[] {
  const blocks: Block[] = []
  let para: Inline[][] = []
  let list: { t: 'ul' | 'ol'; items: Inline[][] } | null = null
  const flushPara = (): void => {
    if (para.length > 0) blocks.push({ t: 'p', lines: para })
    para = []
  }
  const flushList = (): void => {
    if (list !== null) blocks.push(list)
    list = null
  }
  for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.replace(/^\s*#{1,6}\s+/, '').trimEnd()
    if (line.trim() === '' || /^\s*([-*_])\1{2,}\s*$/.test(line)) {
      flushPara()
      flushList()
      continue
    }
    const kind = BULLET.test(line) ? 'ul' : NUMBERED.test(line) ? 'ol' : null
    if (kind !== null) {
      flushPara()
      if (list === null || list.t !== kind) {
        flushList()
        list = { t: kind, items: [] }
      }
      list.items.push(parseInline(line.replace(kind === 'ul' ? BULLET : NUMBERED, '')))
      continue
    }
    flushList()
    para.push(parseInline(line.trim()))
  }
  flushPara()
  flushList()
  return blocks
}
