'use client'
import { useState } from 'react'

export default function Auth({ supabase, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  const switchMode = (next) => {
    setMode(next)
    setError(null)
    setMessage(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}`,
      })
      if (error) setError(error.message)
      else setMessage('Password reset link sent! Check your email.')
    } else if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else if (data?.user?.identities?.length === 0) {
        setError('An account with this email already exists. Please sign in instead.')
      } else {
        setMessage('Account created! Check your email to confirm your address.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    }

    setLoading(false)
  }

  const titles = {
    login: 'Welcome back',
    signup: 'Create your account',
    forgot: 'Reset your password',
  }
  const subtitles = {
    login: 'Sign in to your Rising Posts account',
    signup: 'Start catching trends before they peak',
    forgot: "Enter your email and we'll send you a reset link",
  }
  const submitLabel = {
    login: 'Sign In',
    signup: 'Create Account',
    forgot: 'Send Reset Link',
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
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{titles[mode]}</h1>
            <p className="text-slate-500 mt-2 text-base">{subtitles[mode]}</p>
          </div>

          {/* Login / Signup tab toggle */}
          {mode !== 'forgot' && (
            <div className="flex bg-slate-100 rounded-xl p-1 mb-6">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Sign Up
              </button>
            </div>
          )}

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
                <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 transition-all"
                  placeholder="••••••••"
                />
                {mode === 'signup' && (
                  <p className="text-xs text-slate-400 mt-1.5">Minimum 6 characters</p>
                )}
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
              {loading ? 'Please wait...' : submitLabel[mode]}
            </button>
          </form>

          {/* Footer links */}
          <div className="text-center text-sm text-slate-500 mt-6 space-y-2">
            {mode === 'login' && (
              <p>
                <button onClick={() => switchMode('forgot')} className="text-orange-500 hover:text-orange-600 font-medium transition-colors">
                  Forgot your password?
                </button>
              </p>
            )}
            {mode === 'forgot' && (
              <p>
                Remember your password?{' '}
                <button onClick={() => switchMode('login')} className="text-orange-500 hover:text-orange-600 font-medium transition-colors">
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
