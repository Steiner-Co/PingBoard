import type { RouteRecord } from 'vite-react-ssg'
import { App } from './App'
import { LandingPage } from './LandingPage'
import { Seo } from './components/Seo'
import { SITE_DESCRIPTION } from './lib/site'
import { SiteLayout } from './layouts/SiteLayout'
import { DocsShell } from './layouts/DocsShell'
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
        element: <DocsShell />,
        children: [
          { index: true, element: <DocsRedirect /> },
          { path: ':slug', element: <DocsPage /> },
        ],
      },
      {
        path: 'blog',
        children: [
          { index: true, element: <SiteLayout width="wide"><BlogIndex /></SiteLayout> },
          // Reader has its own wide shell (sticky rail outside the card),
          // so it must not inherit the narrow SiteLayout wrapper.
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
