import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import AuthSheet from './AuthSheet'
import ContactRail from './ContactRail'
import TopBanner from './TopBanner'
import CompareBar from '../property/CompareBar'
import CursorFollower from '../effects/CursorFollower'
import LoginNudge from './LoginNudge'
import WelcomeModal from './WelcomeModal'
import ApiToast from './ApiToast'

export default function PublicLayout() {
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [authSource, setAuthSource] = useState('')
  const [authRole, setAuthRole] = useState('user')
  const [welcomeOpen, setWelcomeOpen] = useState(false)
  const openAuth = (mode = 'login', source = '', role = 'user') => {
    setAuthMode(mode === 'signup' ? 'signup' : 'login')
    setAuthSource(source)
    setAuthRole(role === 'agent' ? 'agent' : 'user')
    setAuthOpen(true)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopBanner />
      <Navbar onAuthOpen={() => openAuth('login')} />
      <main className="flex-1 px-4 max-w-6xl mx-auto w-full" style={{ paddingTop: 'calc(7rem + var(--banner-h, 0px))' }}>
        <Outlet context={{ openAuth }} />
      </main>
      <Footer />
      <AuthSheet open={authOpen} onClose={() => setAuthOpen(false)} initialMode={authMode} source={authSource} initialRole={authRole} />
      <WelcomeModal onOpenAuth={openAuth} authOpen={authOpen} onOpenChange={setWelcomeOpen} />
      <LoginNudge onOpenAuth={openAuth} authOpen={authOpen || welcomeOpen} />
      <ApiToast />
      <ContactRail />
      <CompareBar />
      <CursorFollower />
    </div>
  )
}
