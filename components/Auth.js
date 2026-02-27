'use client'
import { useState } from 'react'

export default function Auth({ supabase, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}`,
      })
      if (error) {
        setError(error.message)
      } else {
        setMessage('Password reset link sent! Check your email.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 sm:p-10">
          {/* Logo / Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 mb-5 shadow-md shadow-orange-500/20">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                <polyline points="16 7 22 7 22 13" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {mode === 'login' ? 'Rising Posts' : 'Reset your password'}
            </h1>
            <p className="text-slate-500 mt-2 text-base">
              {mode === 'login' ? 'Sign in to your account' : 'Enter your email and we\'ll send you a reset link'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 transition-all"
                placeholder="you@email.com"
              />
            </div>
            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-700">Password</label>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 transition-all"
                  placeholder="••••••••"
                />
              </div>
            )}

            {error && (
              <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>
            )}
            {message && (
              <div className="text-emerald-700 text-sm bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">{message}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-base font-semibold text-white shadow-sm shadow-orange-500/20 transition-all hover:shadow-md"
            >
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Send Reset Link'}
            </button>
          </form>

          {/* Toggle mode */}
          <p className="text-center text-sm text-slate-500 mt-6">
            {mode === 'login' && (
              <button onClick={() => { setMode('forgot'); setError(null); setMessage(null) }} className="text-orange-500 hover:text-orange-600 font-medium transition-colors">Forgot password?</button>
            )}
            {mode === 'forgot' && (
              <>
                Remember your password?{' '}
                <button onClick={() => { setMode('login'); setError(null); setMessage(null) }} className="text-orange-500 hover:text-orange-600 font-medium transition-colors">Sign in</button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
