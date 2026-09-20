import { Route, Routes } from 'react-router-dom'
import { Heart, LayoutDashboard, MessageSquare, User as UserIcon } from 'lucide-react'
import PanelShell from '../components/layout/PanelShell'
import ProtectedRoute from '../components/layout/ProtectedRoute'
import DashboardHome from '../pages/dashboard/DashboardHome'
import Saved from '../pages/dashboard/Saved'
import MyInquiries from '../pages/dashboard/MyInquiries'
import Profile from '../pages/dashboard/Profile'

const dashboardNav = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/dashboard/saved', label: 'Saved', icon: Heart },
  { to: '/dashboard/inquiries', label: 'Inquiries', icon: MessageSquare },
  { to: '/dashboard/profile', label: 'Profile', icon: UserIcon },
]

/** Signed-in user area — a lazily-loaded chunk mounted at /dashboard/*. */
export default function DashboardArea() {
  return (
    <Routes>
      <Route
        element={
          <ProtectedRoute>
            <PanelShell title="Dashboard" navItems={dashboardNav} />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardHome />} />
        <Route path="saved" element={<Saved />} />
        <Route path="inquiries" element={<MyInquiries />} />
        <Route path="profile" element={<Profile />} />
      </Route>
    </Routes>
  )
}
