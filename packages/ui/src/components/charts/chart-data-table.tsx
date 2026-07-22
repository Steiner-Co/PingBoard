import { cn } from '@/lib/utils'

/**
 * Visually-hidden data table for chart primitives. Charts render an `<svg
 * aria-hidden>` for sighted users; this sibling gives screen readers the same
 * data points and a sentence summary.
 *
 * The table is `sr-only` (visually hidden) but still read by AT in document
 * order — sits before the SVG so it's announced before the user lands on
 * the decorative visual.
 */
export function ChartDataTable({
  caption,
  summary,
  columns,
  rows,
  className,
}: {
  caption: string
  summary?: string
  /** Header row. First cell is treated as the row label. */
  columns: string[]
  /** One row per data point. Values are pre-formatted strings. */
  rows: Array<Record<string, string>>
  className?: string
}) {
  return (
    <div role="img" aria-label={caption} className={cn('sr-only', className)}>
      <table>
        <caption>{caption}</caption>
        {summary && <p>{summary}</p>}
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={c} scope={i === 0 ? 'row' : 'col'}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c}>{row[c] ?? ''}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
