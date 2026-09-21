import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { PanelSkeleton } from './components/common/Skeleton'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import { SettingsProvider } from './context/SettingsContext'
import { InterestProvider } from './context/InterestContext'

import PublicLayout from './components/layout/PublicLayout'
import TrackingScripts from './components/layout/TrackingScripts'
import ScrollToTop from './components/layout/ScrollToTop'
import SmoothScroll from './components/layout/SmoothScroll'

import Home from './pages/public/Home'
import Listings from './pages/public/Listings'
import PropertyDetail from './pages/public/PropertyDetail'
import Agents from './pages/public/Agents'
import AgentProfile from './pages/public/AgentProfile'
import About from './pages/public/About'
import Contact from './pages/public/Contact'
import Compare from './pages/public/Compare'
import ThankYou from './pages/public/ThankYou'
import Team from './pages/public/Team'
import Blog from './pages/public/Blog'
import BlogPost from './pages/public/BlogPost'
import SiteMap from './pages/public/SiteMap'
import LegalPage from './pages/public/LegalPage'
import NotFound from './pages/public/NotFound'

// Admin panel and signed-in dashboard are separate chunks: visitors and crawlers never download them.
const AdminArea = lazy(() => import('./areas/AdminArea'))
const DashboardArea = lazy(() => import('./areas/DashboardArea'))
const AgentArea = lazy(() => import('./areas/AgentArea'))

// While a panel's code downloads: the shape of a panel, not a lone spinner.
const PageLoader = <PanelSkeleton />

/** Global state. Shared by the browser entry (main.jsx) and the pre-render entry (entry-server.jsx). */
export function Providers({ children }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DataProvider>
          <SettingsProvider><InterestProvider>{children}</InterestProvider></SettingsProvider>
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

/** Every route. Rendered inside a router by the browser (BrowserRouter) and by pre-rendering (StaticRouter). */
export function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <SmoothScroll />
      <TrackingScripts />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/listings" element={<Listings />} />
          <Route path="/buy" element={<Listings purpose="Buy" />} />
          <Route path="/buy/:a" element={<Listings purpose="Buy" />} />
          <Route path="/buy/:a/:b" element={<Listings purpose="Buy" />} />
          <Route path="/rent" element={<Listings purpose="Rent" />} />
          <Route path="/rent/:a" element={<Listings purpose="Rent" />} />
          <Route path="/rent/:a/:b" element={<Listings purpose="Rent" />} />
          <Route path="/property/:id" element={<PropertyDetail />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/agents/:id" element={<AgentProfile />} />
          <Route path="/about" element={<About />} />
          <Route path="/team" element={<Team />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/sitemap" element={<SiteMap />} />
          <Route path="/privacy" element={<LegalPage kind="privacy" />} />
          <Route path="/terms" element={<LegalPage kind="terms" />} />
          <Route path="/disclaimer" element={<LegalPage kind="disclaimer" />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/thank-you" element={<ThankYou />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="/dashboard/*" element={<Suspense fallback={PageLoader}><DashboardArea /></Suspense>} />
        <Route path="/agent/*" element={<Suspense fallback={PageLoader}><AgentArea /></Suspense>} />
        <Route path="/admin/*" element={<Suspense fallback={PageLoader}><AdminArea /></Suspense>} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <Providers>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </Providers>
  )
}
