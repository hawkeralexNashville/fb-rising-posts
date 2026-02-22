'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import Homepage from '../components/Homepage'
import Auth from '../components/Auth'
import Dashboard from '../components/Dashboard'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Home() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAuth, setShowAuth] = useState(false)
  const [authMode, setAuthMode] = useState('login')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        if (session) setShowAuth(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (session) {
    return <Dashboard supabase={supabase} session={session} />
  }

  if (showAuth) {
    return <Auth supabase={supabase} initialMode={authMode} onBack={() => setShowAuth(false)} />
  }

  return (
    <Homepage
      onSignIn={() => { setAuthMode('login'); setShowAuth(true) }}
      onGetStarted={() => { setAuthMode('signup'); setShowAuth(true) }}
    />
  )
}
