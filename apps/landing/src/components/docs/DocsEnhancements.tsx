import { useEffect } from 'react'

/**
 * Adds a copy button to every <pre> inside [data-docs-article].
 * Runs on mount and re-runs when the article subtree changes (route nav).
 */
export function useDocsCopyButtons() {
  useEffect(() => {
    const article = document.querySelector('[data-docs-article]')
    if (!article) return

    const enhance = () => {
      const pres = article.querySelectorAll('pre')
      pres.forEach((pre) => {
        if (pre.querySelector('[data-copy-btn]')) return

        // Ensure pre is positioned for absolute button
        const htmlPre = pre as HTMLElement
        if (getComputedStyle(htmlPre).position === 'static') {
          htmlPre.style.position = 'relative'
        }

        const btn = document.createElement('button')
        btn.setAttribute('data-copy-btn', 'true')
        btn.setAttribute('aria-label', 'Copy code')
        btn.style.cssText =
          'position:absolute;top:8px;right:8px;display:inline-flex;align-items:center;gap:4px;border-radius:6px;border:1px solid var(--border);background:var(--card);padding:4px 8px;font-size:11px;font-weight:500;color:var(--muted-foreground);cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,0.05);transition:colors 150ms;'
        btn.innerHTML =
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" style="width:12px;height:12px" aria-hidden><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v3" stroke-linejoin="round"/></svg> Copy'

        const code = pre.querySelector('code')
        const text = (code?.textContent ?? pre.textContent ?? '').trim()

        btn.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(text)
          } catch {
            const ta = document.createElement('textarea')
            ta.value = text
            ta.style.position = 'fixed'
            ta.style.opacity = '0'
            document.body.appendChild(ta)
            ta.select()
            document.execCommand('copy')
            document.body.removeChild(ta)
          }
          btn.innerHTML =
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" style="width:12px;height:12px" aria-hidden><path d="M5 13 9 17l10-10" stroke-linecap="round" stroke-linejoin="round"/></svg> Copied'
          setTimeout(() => {
            btn.innerHTML =
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" style="width:12px;height:12px" aria-hidden><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v3" stroke-linejoin="round"/></svg> Copy'
          }, 1600)
        })

        // Hover: only show on pre hover (desktop)
        btn.style.opacity = '0'
        btn.style.pointerEvents = 'none'
        htmlPre.addEventListener('mouseenter', () => {
          btn.style.opacity = '1'
          btn.style.pointerEvents = 'auto'
        })
        htmlPre.addEventListener('mouseleave', () => {
          btn.style.opacity = '0'
          btn.style.pointerEvents = 'none'
        })
        // Always visible on touch (no hover)
        if (window.matchMedia('(hover: none)').matches) {
          btn.style.opacity = '1'
          btn.style.pointerEvents = 'auto'
        }

        pre.appendChild(btn)
      })
    }

    enhance()
    const observer = new MutationObserver(enhance)
    observer.observe(article, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])
}
