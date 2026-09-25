/**
 * Minimal rich-text support for the status-page description.
 *
 * The description is stored as an HTML string in the existing `description`
 * column (no migration — it's opaque TEXT to the backend). Only inline
 * formatting is allowed: bold, italic, underline, strikethrough, links, text
 * color, and highlight color. Everything the floating toolbar can produce, and
 * nothing else.
 *
 * Rendering rule: never inject stored HTML directly — always pass it through
 * `sanitizeRichText` first, both in the admin preview and on the public page.
 */

const ALLOWED_TAGS = new Set(['b', 'strong', 'i', 'em', 'u', 's', 'strike', 'a', 'span', 'br'])

const COLOR_VALUE = /^(#[0-9a-f]{3,8}|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)|inherit|transparent)$/i

function isSafeHref(href: string): boolean {
  const v = href.trim().toLowerCase()
  return v.startsWith('http://') || v.startsWith('https://') || v.startsWith('mailto:')
}

/** Strip everything outside the allowlist; safe to inject via dangerouslySetInnerHTML. */
export function sanitizeRichText(dirty: string): string {
  if (!dirty) return ''
  const doc = new DOMParser().parseFromString(`<div>${dirty}</div>`, 'text/html')
  const root = doc.body.firstElementChild
  if (!root) return ''

  const clean = (node: Node): string => {
    let out = ''
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        out += escapeHtml(child.textContent ?? '')
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement
        const tag = el.tagName.toLowerCase()
        if (!ALLOWED_TAGS.has(tag)) {
          // Drop the tag, keep the text (e.g. pasted <div>/<p> wrappers).
          out += clean(el)
          continue
        }
        if (tag === 'br') {
          out += '<br>'
          continue
        }
        if (tag === 'a') {
          const href = el.getAttribute('href') ?? ''
          const text = clean(el)
          out += isSafeHref(href)
            ? `<a href="${escapeAttr(href)}" target="_blank" rel="noreferrer noopener">${text}</a>`
            : text
          continue
        }
        if (tag === 'span') {
          const style = sanitizeInlineStyle(el.getAttribute('style'))
          const text = clean(el)
          out += style ? `<span style="${style}">${text}</span>` : text
          continue
        }
        out += `<${tag}>${clean(el)}</${tag}>`
      }
    }
    return out
  }

  return clean(root)
}

/** Keep only color/background-color declarations with safe values. */
function sanitizeInlineStyle(raw: string | null): string {
  if (!raw) return ''
  const kept: string[] = []
  for (const decl of raw.split(';')) {
    const [prop, ...rest] = decl.split(':')
    const name = prop?.trim().toLowerCase()
    const value = rest.join(':').trim()
    if ((name === 'color' || name === 'background-color') && COLOR_VALUE.test(value)) {
      kept.push(`${name}: ${value}`)
    }
  }
  return kept.join('; ')
}

/** Plain text for <meta>/OG tags and empty checks. */
export function richTextToPlainText(html: string): string {
  if (!html) return ''
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim()
}

/** An editor that only contains <br>/empty tags counts as blank. */
export function isRichTextBlank(html: string): boolean {
  return richTextToPlainText(html) === ''
}

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replaceAll('"', '&quot;')
}
