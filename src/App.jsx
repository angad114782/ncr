import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { LayoutDashboard, MessageSquare, User as UserIcon, Heart } from 'lucide-react'
import { BookOpen, Building2, HelpCircle, LayoutTemplate, Settings, Star, UserCheck, Users as UsersIcon } from 'lucide-react'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import { SettingsProvider } from './context/SettingsContext'

import PublicLayout from './components/layout/PublicLayout'
import PanelShell from './components/layout/PanelShell'
import ProtectedRoute from './components/layout/ProtectedRoute'
import TrackingScripts from './components/layout/TrackingScripts'
import ScrollToTop from './components/layout/ScrollToTop'

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
import NotFound from './pages/public/NotFound'

import DashboardHome from './pages/dashboard/DashboardHome'
import Saved from './pages/dashboard/Saved'
import MyInquiries from './pages/dashboard/MyInquiries'
import Profile from './pages/dashboard/Profile'

import AdminHome from './pages/admin/AdminHome'
import ManageListings from './pages/admin/ManageListings'
import ManageUsers from './pages/admin/ManageUsers'
import ManageInquiries from './pages/admin/ManageInquiries'
import AdminSettings from './pages/admin/AdminSettings'
import ManageBlog from './pages/admin/ManageBlog'
import ManageFaqs from './pages/admin/ManageFaqs'
import ManageTestimonials from './pages/admin/ManageTestimonials'
import ManageAgents from './pages/admin/ManageAgents'
import SiteContent from './pages/admin/SiteContent'

const dashboardNav = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/dashboard/saved', label: 'Saved', icon: Heart },
  { to: '/dashboard/inquiries', label: 'Inquiries', icon: MessageSquare },
  { to: '/dashboard/profile', label: 'Profile', icon: UserIcon },
]

const adminNav = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/listings', label: 'Listings', icon: Building2 },
  { to: '/admin/blog', label: 'Blog', icon: BookOpen },
  { to: '/admin/faqs', label: 'FAQs', icon: HelpCircle },
  { to: '/admin/testimonials', label: 'Reviews', icon: Star },
  { to: '/admin/agents', label: 'Agents', icon: UserCheck },
  { to: '/admin/users', label: 'Users', icon: UsersIcon },
  { to: '/admin/inquiries', label: 'Inquiries', icon: MessageSquare },
  { to: '/admin/site', label: 'Site Content', icon: LayoutTemplate },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
  { to: '/admin/profile', label: 'Profile', icon: UserIcon },
]

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DataProvider>
          <SettingsProvider>
            <BrowserRouter>
              <ScrollToTop />
              <TrackingScripts />
              <Routes>
                <Route element={<PublicLayout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/listings" element={<Listings />} />
                  <Route path="/property/:id" element={<PropertyDetail />} />
                  <Route path="/agents" element={<Agents />} />
                  <Route path="/agents/:id" element={<AgentProfile />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/team" element={<Team />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/blog/:slug" element={<BlogPost />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/compare" element={<Compare />} />
                  <Route path="/thank-you" element={<ThankYou />} />
                  <Route path="*" element={<NotFound />} />
                </Route>

                <Route
                  element={
                    <ProtectedRoute>
                      <PanelShell title="Dashboard" navItems={dashboardNav} />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/dashboard" element={<DashboardHome />} />
                  <Route path="/dashboard/saved" element={<Saved />} />
                  <Route path="/dashboard/inquiries" element={<MyInquiries />} />
                  <Route path="/dashboard/profile" element={<Profile />} />
                </Route>

                <Route
                  element={
                    <ProtectedRoute requireAdmin>
                      <PanelShell title="Admin Panel" navItems={adminNav} />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/admin" element={<AdminHome />} />
                  <Route path="/admin/listings" element={<ManageListings />} />
                  <Route path="/admin/blog" element={<ManageBlog />} />
                  <Route path="/admin/faqs" element={<ManageFaqs />} />
                  <Route path="/admin/testimonials" element={<ManageTestimonials />} />
                  <Route path="/admin/agents" element={<ManageAgents />} />
                  <Route path="/admin/site" element={<SiteContent />} />
                  <Route path="/admin/users" element={<ManageUsers />} />
                  <Route path="/admin/inquiries" element={<ManageInquiries />} />
                  <Route path="/admin/settings" element={<AdminSettings />} />
                  <Route path="/admin/profile" element={<Profile />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </SettingsProvider>
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
