/**
 * The `◆` mark. §5.5: "`◆` is reserved for AI, at 12px, in AI-indigo."
 *
 * ⚠️ It is a marker, not an icon — its whole job is that a clinician can tell
 * at a glance which parts of a screen came from a model and which came from
 * the record. That only works if it appears on every AI surface and on no
 * other surface, which is why it is a component rather than a literal.
 *
 * `aria-hidden` because it is redundant to a screen reader: every AI region
 * carries "AI suggestion" in its accessible name (§6478), which says the same
 * thing in words.
 */
export default function AiMark({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block text-[12px] leading-none text-ai ${className}`}
    >
      ◆
    </span>
  )
}
