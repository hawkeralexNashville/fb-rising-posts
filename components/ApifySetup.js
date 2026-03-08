'use client'
import { useState } from 'react'

export default function ApifySetup({ onSave, isUpdate = false }) {
  const [token, setToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSave(e) {
    e.preventDefault()
    setError(null)
    let trimmed = token.trim()
    if (!trimmed) { setError('Please paste your Apify API token.'); return }
    // If they pasted a URL like https://api.apify.com/v2/...?token=apify_api_xxx, extract just the token
    try {
      const urlMatch = trimmed.match(/[?&]token=(apify_api_[^\s&]+)/)
      if (urlMatch) trimmed = urlMatch[1]
    } catch {}
    if (!trimmed.startsWith('apify_api_')) {
      setError('Paste your API token, not the URL. It looks like "apify_api_..." and can be found under Settings → Integrations on apify.com.')
      return
    }
    setSaving(true)
    try {
      await onSave(trimmed)
    } catch (err) {
      setError('Failed to save. Please try again.')
      setSaving(false)
    }
  }

  if (isUpdate) {
    // Compact inline form for the Account page
    return (
      <form onSubmit={handleSave} className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={showToken ? 'text' : 'password'}
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="apify_api_..."
              className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 placeholder-slate-400 font-mono focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 pr-10"
            />
            <button type="button" onClick={() => setShowToken(!showToken)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {showToken
                ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
              }
            </button>
          </div>
          <button type="submit" disabled={saving}
            className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-xl text-sm font-semibold text-white transition-colors shrink-0">
            {saving ? 'Saving…' : 'Save Key'}
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    )
  }

  // Full onboarding screen
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-orange-500/30">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">One last step</h1>
          <p className="text-gray-400 text-base leading-relaxed max-w-sm mx-auto">
            Rising Posts uses <strong className="text-white">Apify</strong> to scan social media. You need a free Apify account and your own API key to run scans.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-3 mb-6">

          {/* Step 1 */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-orange-400">1</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white mb-1">Create a free Apify account</p>
                <p className="text-sm text-gray-400 mb-3">Sign up at apify.com — it's free. You get $5 of free credit every month, which is enough for dozens of scans.</p>
                <a
                  href="https://apify.com/sign-up"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 rounded-xl text-sm font-medium text-white transition-colors"
                >
                  Go to apify.com/sign-up
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                </a>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-orange-400">2</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white mb-1">Copy your API token</p>
                <p className="text-sm text-gray-400 mb-3">Once signed in, go to <strong className="text-white">Settings → Integrations</strong>. Click the <strong className="text-white">copy icon</strong> next to your Personal API token — copy the token itself, not the URL. It starts with <code className="text-orange-400 bg-gray-800 px-1.5 py-0.5 rounded text-xs">apify_api_</code></p>
                <a
                  href="https://console.apify.com/account/integrations"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 rounded-xl text-sm font-medium text-white transition-colors"
                >
                  Go to API token page
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                </a>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-gray-900 border border-orange-500/20 rounded-2xl p-5">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-orange-400">3</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white mb-1">Paste your token below</p>
                <p className="text-sm text-gray-400 mb-4">Your key is stored securely and only used to run scans on your behalf.</p>
                <form onSubmit={handleSave} className="space-y-3">
                  <div className="relative">
                    <input
                      type={showToken ? 'text' : 'password'}
                      value={token}
                      onChange={e => setToken(e.target.value)}
                      placeholder="apify_api_..."
                      autoFocus
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-sm text-white placeholder-gray-500 font-mono focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {showToken
                        ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                        : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                      }
                    </button>
                  </div>
                  {error && <p className="text-sm text-red-400">{error}</p>}
                  <button
                    type="submit"
                    disabled={saving || !token.trim()}
                    className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-base font-semibold text-white shadow-lg shadow-orange-500/25 transition-all"
                  >
                    {saving ? 'Saving…' : 'Save & Start Scanning →'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-600">
          Your API key is encrypted at rest. Rising Posts never sells your data.
        </p>
      </div>
    </div>
  )
}
