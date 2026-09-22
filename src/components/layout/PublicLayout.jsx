import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import AuthSheet from './AuthSheet'
import ContactRail from './ContactRail'
import ContactStrip from './ContactStrip'
import TopBanner from './TopBanner'
import DisableInspect from './DisableInspect'
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
  const [authOnSuccess, setAuthOnSuccess] = useState(null)
  // `onSuccess`, when given, means "stay on this page and hand the signed-in user back" (e.g. reveal an agent's
  // number) instead of the usual redirect to the person's panel — see AuthSheet's use of `onSuccess`.
  const openAuth = (mode = 'login', source = '', role = 'user', onSuccess = null) => {
    setAuthMode(mode === 'signup' ? 'signup' : 'login')
    setAuthSource(source)
    setAuthRole(role === 'agent' ? 'agent' : 'user')
    setAuthOnSuccess(() => onSuccess)
    setAuthOpen(true)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <DisableInspect />
      <ContactStrip />
      <TopBanner />
      <Navbar onAuthOpen={() => openAuth('login')} onAgentDoor={() => openAuth('signup', 'list', 'agent')} />
      <main className="flex-1 px-4 max-w-6xl mx-auto w-full" style={{ paddingTop: 'calc(7rem + var(--banner-h, 0px) + var(--contact-h, 0px))' }}>
        <Outlet context={{ openAuth }} />
      </main>
      <Footer />
      <AuthSheet open={authOpen} onClose={() => setAuthOpen(false)} initialMode={authMode} source={authSource} initialRole={authRole} onSuccess={authOnSuccess} />
      <WelcomeModal onOpenAuth={openAuth} authOpen={authOpen} onOpenChange={setWelcomeOpen} />
      <LoginNudge onOpenAuth={openAuth} authOpen={authOpen || welcomeOpen} />
      <ApiToast />
      <ContactRail />
      <CompareBar />
      <CursorFollower />
    </div>
  )
}
