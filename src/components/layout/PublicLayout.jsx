import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import AuthSheet from './AuthSheet'
import ContactRail from './ContactRail'
import TopBanner from './TopBanner'
import CompareBar from '../property/CompareBar'

export default function PublicLayout() {
  const [authOpen, setAuthOpen] = useState(false)

  return (
    <div className="min-h-screen flex flex-col">
      <TopBanner />
      <Navbar onAuthOpen={() => setAuthOpen(true)} />
      <main className="flex-1 px-4 max-w-6xl mx-auto w-full" style={{ paddingTop: 'calc(7rem + var(--banner-h, 0px))' }}>
        <Outlet context={{ openAuth: () => setAuthOpen(true) }} />
      </main>
      <Footer />
      <AuthSheet open={authOpen} onClose={() => setAuthOpen(false)} />
      <ContactRail />
      <CompareBar />
    </div>
  )
}
