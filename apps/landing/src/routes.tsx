import type { RouteRecord } from 'vite-react-ssg'
import { App } from './App'
import { LandingPage } from './LandingPage'
import { Seo } from './components/Seo'
import { SITE_DESCRIPTION } from './lib/site'
import { SiteLayout } from './layouts/SiteLayout'
import { DocsLayout } from './layouts/DocsLayout'
import { DocsPage, DocsRedirect } from './pages/DocsPage'
import { BlogIndex } from './pages/BlogIndex'
import { BlogPost } from './pages/BlogPost'
import { AboutPage } from './pages/AboutPage'
import { NotFound } from './pages/NotFound'

export const routes: RouteRecord[] = [
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: (
          <>
            <Seo
              title="PingBoard — Dead-simple, self-hosted uptime monitoring"
              description={SITE_DESCRIPTION}
              path="/"
            />
            <LandingPage />
          </>
        ),
      },
      {
        path: 'docs',
        element: <SiteLayout width="wide"><DocsLayout /></SiteLayout>,
        children: [
          { index: true, element: <DocsRedirect /> },
          { path: ':slug', element: <DocsPage /> },
        ],
      },
      {
        path: 'blog',
        element: <SiteLayout />,
        children: [
          { index: true, element: <BlogIndex /> },
          { path: ':slug', element: <BlogPost /> },
        ],
      },
      {
        path: 'about',
        element: <SiteLayout><AboutPage /></SiteLayout>,
      },
      { path: '*', element: <SiteLayout><NotFound /></SiteLayout> },
    ],
  },
]
