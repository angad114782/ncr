import { Route, Routes } from 'react-router-dom'
import { Building2, LayoutDashboard, MessageSquare, User as UserIcon } from 'lucide-react'
import PanelShell from '../components/layout/PanelShell'
import ProtectedRoute from '../components/layout/ProtectedRoute'
import AgentHome from '../pages/agent/AgentHome'
import AgentListings from '../pages/agent/AgentListings'
import AgentLeads from '../pages/agent/AgentLeads'
import AgentProfilePage from '../pages/agent/AgentProfilePage'

const agentNav = [
  { to: '/agent', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/agent/listings', label: 'My listings', icon: Building2 },
  { to: '/agent/leads', label: 'Enquiries', icon: MessageSquare },
  { to: '/agent/profile', label: 'Profile', icon: UserIcon },
]

/** The property agent's own panel — a lazily-loaded chunk mounted at /agent/*. Agents only. */
export default function AgentArea() {
  return (
    <Routes>
      <Route
        element={
          <ProtectedRoute roles={['agent']}>
            <PanelShell title="Agent Panel" navItems={agentNav} />
          </ProtectedRoute>
        }
      >
        <Route index element={<AgentHome />} />
        <Route path="listings" element={<AgentListings />} />
        <Route path="leads" element={<AgentLeads />} />
        <Route path="profile" element={<AgentProfilePage />} />
      </Route>
    </Routes>
  )
}
