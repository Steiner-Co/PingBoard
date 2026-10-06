/**
 * Theme-aware product screenshot for docs MDX. Renders the light and dark
 * captures from /public/screens and toggles them with the .dark class, so
 * the shot matches the reader's theme. `not-prose` keeps the typography
 * plugin's image margins from double-spacing the frame.
 *
 * Usage: <Screenshot name="dashboard" alt="..." />
 */
export function Screenshot({ name, alt }: { name: string; alt: string }) {
  return (
    <span className="not-prose my-6 block overflow-hidden rounded-xl border border-border">
      <img src={`/screens/${name}-light.png`} alt={alt} loading="lazy" className="block w-full dark:hidden" />
      <img src={`/screens/${name}-dark.png`} alt={alt} loading="lazy" className="hidden w-full dark:block" />
    </span>
  )
}
