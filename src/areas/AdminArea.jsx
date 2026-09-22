import { Route, Routes } from 'react-router-dom'
import { BarChart3, BookOpen, Building2, HelpCircle, LayoutDashboard, LayoutTemplate, MessageSquare, Settings, ShieldAlert, Star, ThumbsUp, User as UserIcon, UserCheck, Users as UsersIcon } from 'lucide-react'
import PanelShell from '../components/layout/PanelShell'
import ProtectedRoute from '../components/layout/ProtectedRoute'
import Profile from '../pages/dashboard/Profile'
import AdminHome from '../pages/admin/AdminHome'
import ManageListings from '../pages/admin/ManageListings'
import ManageUsers from '../pages/admin/ManageUsers'
import ManageInquiries from '../pages/admin/ManageInquiries'
import AdminSettings from '../pages/admin/AdminSettings'
import ManageBlog from '../pages/admin/ManageBlog'
import ManageFaqs from '../pages/admin/ManageFaqs'
import ManageTestimonials from '../pages/admin/ManageTestimonials'
import ManageReviews from '../pages/admin/ManageReviews'
import ManageAgents from '../pages/admin/ManageAgents'
import SearchAnalytics from '../pages/admin/SearchAnalytics'
import SiteContent from '../pages/admin/SiteContent'
import Security from '../pages/admin/Security'
import { useSettings } from '../context/SettingsContext'
import { ListSkeleton } from '../components/common/Skeleton'

const adminNav = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/listings', label: 'Listings', icon: Building2 },
  { to: '/admin/blog', label: 'Blog', icon: BookOpen },
  { to: '/admin/faqs', label: 'FAQs', icon: HelpCircle },
  { to: '/admin/testimonials', label: 'Reviews', icon: Star },
  { to: '/admin/ratings', label: 'Ratings & Reviews', icon: ThumbsUp },
  { to: '/admin/agents', label: 'Agents', icon: UserCheck },
  { to: '/admin/users', label: 'Users', icon: UsersIcon },
  { to: '/admin/inquiries', label: 'Inquiries', icon: MessageSquare },
  { to: '/admin/search-analytics', label: 'Search Analytics', icon: BarChart3 },
  { to: '/admin/security', label: 'Security', icon: ShieldAlert },
  { to: '/admin/site', label: 'Site Content', icon: LayoutTemplate },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
  { to: '/admin/profile', label: 'Profile', icon: UserIcon },
]

/** These forms copy the settings when they open, so they wait until the live values have arrived. */
function WaitForSettings({ children }) {
  const { settingsLoaded } = useSettings()
  return settingsLoaded ? children : <ListSkeleton rows={5} />
}

/**
 * The whole admin panel is one lazily-loaded chunk (mounted at /admin/*), so ordinary visitors
 * and search-engine crawlers never download any of this code.
 */
export default function AdminArea() {
  return (
    <Routes>
      <Route
        element={
          <ProtectedRoute requireAdmin>
            <PanelShell title="Admin Panel" navItems={adminNav} />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminHome />} />
        <Route path="listings" element={<ManageListings />} />
        <Route path="blog" element={<ManageBlog />} />
        <Route path="faqs" element={<ManageFaqs />} />
        <Route path="testimonials" element={<ManageTestimonials />} />
        <Route path="ratings" element={<ManageReviews />} />
        <Route path="agents" element={<ManageAgents />} />
        <Route path="site" element={<WaitForSettings><SiteContent /></WaitForSettings>} />
        <Route path="users" element={<ManageUsers />} />
        <Route path="inquiries" element={<ManageInquiries />} />
        <Route path="search-analytics" element={<SearchAnalytics />} />
        <Route path="security" element={<Security />} />
        <Route path="settings" element={<WaitForSettings><AdminSettings /></WaitForSettings>} />
        <Route path="profile" element={<Profile />} />
      </Route>
    </Routes>
  )
}
