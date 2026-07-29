import { Navigate, useParams } from 'react-router-dom'
import { Seo } from '@/components/Seo'
import { Prose } from '@/components/Prose'
import { DocsPager } from '@/layouts/DocsLayout'
import { docs, firstDoc, getDoc } from '@/lib/content'
import { NotFound } from './NotFound'

/** `/docs` redirects to the first doc in reading order. */
export function DocsRedirect() {
  if (!firstDoc) return <NotFound />
  return <Navigate to={`/docs/${firstDoc.slug}`} replace />
}

export function DocsPage() {
  const { slug } = useParams<{ slug: string }>()
  const doc = getDoc(slug)
  if (!doc) return <NotFound />

  const index = docs.indexOf(doc)
  const prev = index > 0 ? docs[index - 1] : undefined
  const next = index < docs.length - 1 ? docs[index + 1] : undefined
  const { Component } = doc

  return (
    <>
      <Seo title={doc.title} description={doc.description} path={`/docs/${doc.slug}`} />
      <article>
        <header className="mb-8 flex flex-col gap-2 border-b border-border pb-8">
          <h1 className="text-[28px] font-medium leading-[1.1] tracking-[-0.7px] text-foreground">
            {doc.title}
          </h1>
          <p className="text-[14px] leading-[1.35] tracking-[-0.35px] text-foreground/60">
            {doc.description}
          </p>
        </header>
        <Prose>
          <Component />
        </Prose>
        <DocsPager prev={prev} next={next} />
      </article>
    </>
  )
}
