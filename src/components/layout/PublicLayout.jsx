import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import AuthSheet from './AuthSheet'
import ContactRail from './ContactRail'
import CompareBar from '../property/CompareBar'

export default function PublicLayout() {
  const [authOpen, setAuthOpen] = useState(false)

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar onAuthOpen={() => setAuthOpen(true)} />
      <main className="flex-1 pt-28 px-4 max-w-6xl mx-auto w-full">
        <Outlet context={{ openAuth: () => setAuthOpen(true) }} />
      </main>
      <Footer />
      <AuthSheet open={authOpen} onClose={() => setAuthOpen(false)} />
      <ContactRail />
      <CompareBar />
    </div>
  )
}
