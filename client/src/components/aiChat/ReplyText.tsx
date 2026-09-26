import { Fragment, useMemo, type ReactElement } from 'react'
import { Link } from 'react-router-dom'
import { formatReply, type Inline } from './formatReply'

/**
 * A generated reply, rendered from parsed data — never as HTML (see
 * formatReply.ts). Source tags become small chips linking to the page the
 * fact came from, so "where does it say that?" is one tap away.
 */

function InlineRun({ nodes, onNavigate }: { nodes: Inline[]; onNavigate?: () => void }): ReactElement {
  return (
    <>
      {nodes.map((n, i) => {
        if (n.t === 'text') return <Fragment key={i}>{n.v}</Fragment>
        if (n.t === 'bold') return <strong key={i} className="font-semibold text-ink"><InlineRun nodes={n.v} onNavigate={onNavigate} /></strong>
        return (
          <Link
            key={i}
            to={n.to ?? '#'}
            onClick={onNavigate}
            data-testid="source-chip"
            title={`Open: ${n.label}`}
            className="focus-ring mx-0.5 inline-flex items-center whitespace-nowrap rounded-md border border-border-soft bg-surface-1 px-1.5 py-px align-baseline text-2xs font-medium text-ink-muted no-underline transition-colors hover:border-border-strong hover:text-ink"
          >
            {n.label}
          </Link>
        )
      })}
    </>
  )
}

export default function ReplyText({ text, onNavigate }: { text: string; onNavigate?: () => void }): ReactElement {
  const blocks = useMemo(() => formatReply(text), [text])
  return (
    <div className="space-y-2 break-words text-sm leading-relaxed">
      {blocks.map((b, i) =>
        b.t === 'p' ? (
          <p key={i}>
            {b.lines.map((line, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                <InlineRun nodes={line} onNavigate={onNavigate} />
              </Fragment>
            ))}
          </p>
        ) : b.t === 'ul' ? (
          <ul key={i} className="list-disc space-y-1 pl-5 marker:text-ink-subtle">
            {b.items.map((item, j) => <li key={j}><InlineRun nodes={item} onNavigate={onNavigate} /></li>)}
          </ul>
        ) : (
          <ol key={i} className="list-decimal space-y-1 pl-5 marker:text-ink-subtle">
            {b.items.map((item, j) => <li key={j}><InlineRun nodes={item} onNavigate={onNavigate} /></li>)}
          </ol>
        ),
      )}
    </div>
  )
}
