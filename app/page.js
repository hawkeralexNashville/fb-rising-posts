'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import Auth from '../components/Auth'
import Dashboard from '../components/Dashboard'
import ResetPassword from '../components/ResetPassword'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Home() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showResetPassword, setShowResetPassword] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session)
        if (event === 'PASSWORD_RECOVERY') {
          setShowResetPassword(true)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-7 h-7 border-2 border-orange-800 border-t-orange-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (showResetPassword && session) {
    return <ResetPassword supabase={supabase} onDone={() => setShowResetPassword(false)} />
  }

  if (session) {
    return <Dashboard supabase={supabase} session={session} />
  }

  return <Auth supabase={supabase} initialMode="login" />
}
