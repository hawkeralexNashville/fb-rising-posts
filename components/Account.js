'use client'
import { useState, useEffect } from 'react'

export default function Account({ supabase, session, settings, setSettings, saveSettings, timeWindow, setTimeWindow, minInteractions, setMinInteractions, maxInteractions, setMaxInteractions, streams, savedScans }) {
  const [email] = useState(session?.user?.email || '')
  const [createdAt] = useState(session?.user?.created_at || '')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState(null)
  const [passwordError, setPasswordError] = useState(null)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const TIME_OPTIONS = [
    { value: 2, label: 'Last 2 hours' },
    { value: 6, label: 'Last 6 hours' },
    { value: 12, label: 'Last 12 hours' },
    { value: 24, label: 'Last 24 hours' },
    { value: 48, label: 'Last 48 hours' },
  ]

  const MAX_INTERACTION_OPTIONS = [
    { value: 0, label: 'No Limit' },
    { value: 500, label: '500' },
    { value: 1000, label: '1,000' },
    { value: 2500, label: '2,500' },
    { value: 5000, label: '5,000' },
    { value: 10000, label: '10,000' },
    { value: 25000, label: '25,000' },
    { value: 50000, label: '50,000' },
  ]

  const selectStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
  }

  function formatJoinDate(dateStr) {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    setPasswordError(null)
    setPasswordMessage(null)

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }

    setPasswordLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setPasswordError(error.message)
    } else {
      setPasswordMessage('Password updated successfully.')
      setNewPassword('')
      setConfirmPassword('')
    }
    setPasswordLoading(false)
  }

  async function handleSaveSettings() {
    await saveSettings()
    setSettingsSaved(true)
    setTimeout(() => setSettingsSaved(false), 2000)
  }

  async function handleDeleteAccount() {
    // Note: full account deletion requires a server-side admin call.
    // For now, sign out and show a message.
    alert('To fully delete your account and all data, please contact support. You will now be signed out.')
    await supabase.auth.signOut()
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 max-w-2xl">
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Account</h2>
        <p className="text-base text-slate-400 mb-8">Manage your profile, preferences, and scan defaults.</p>

        {/* ─── Profile ─── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
          <h3 className="text-base font-semibold text-slate-900 mb-5">Profile</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Email</label>
              <p className="text-base text-slate-800">{email}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Member Since</label>
              <p className="text-base text-slate-800">{formatJoinDate(createdAt)}</p>
            </div>
          </div>
        </div>

        {/* ─── Usage Stats ─── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
          <h3 className="text-base font-semibold text-slate-900 mb-5">Usage</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{streams?.length || 0}</p>
              <p className="text-sm text-slate-400 mt-1">Streams</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{savedScans?.length || 0}</p>
              <p className="text-sm text-slate-400 mt-1">Saved Scans</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-orange-600">{savedScans?.reduce((sum, s) => sum + (s.rising_count || 0), 0) || 0}</p>
              <p className="text-sm text-orange-400 mt-1">Rising Posts Found</p>
            </div>
          </div>
        </div>

        {/* ─── Default Scan Settings ─── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
          <h3 className="text-base font-semibold text-slate-900 mb-1">Default Scan Settings</h3>
          <p className="text-sm text-slate-400 mb-5">These defaults pre-fill when you start a new scan.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Default Time Window</label>
              <select value={timeWindow} onChange={(e) => setTimeWindow(parseInt(e.target.value))} className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 appearance-none cursor-pointer pr-10" style={selectStyle}>
                {TIME_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Default Min Interactions</label>
              <input type="number" min="0" value={minInteractions} onChange={(e) => setMinInteractions(parseInt(e.target.value) || 0)} className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Default Max Interactions</label>
              <select value={maxInteractions} onChange={(e) => setMaxInteractions(parseInt(e.target.value))} className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 appearance-none cursor-pointer pr-10" style={selectStyle}>
                {MAX_INTERACTION_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
          </div>

          <h4 className="text-sm font-semibold text-slate-700 mb-1 mt-6">Velocity &amp; Delta Thresholds</h4>
          <p className="text-sm text-slate-400 mb-4">Controls how the algorithm judges &quot;rising.&quot; Lower = more results, higher = stricter.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Min Velocity (interactions/hr)</label>
              <input type="number" min="1" value={settings.min_velocity} onChange={(e) => setSettings({ ...settings, min_velocity: parseInt(e.target.value) || 1 })} className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20" />
              <p className="text-xs text-slate-400 mt-1">First-seen posts must grow this fast</p>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Min Delta (between scans)</label>
              <input type="number" min="1" value={settings.min_delta} onChange={(e) => setSettings({ ...settings, min_delta: parseInt(e.target.value) || 1 })} className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20" />
              <p className="text-xs text-slate-400 mt-1">Repeat-seen posts must gain this many</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleSaveSettings} className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 rounded-xl text-sm font-semibold text-white transition-colors">
              Save Settings
            </button>
            {settingsSaved && <span className="text-sm text-emerald-600 font-medium animate-fade-in">Saved!</span>}
          </div>
        </div>

        {/* ─── Change Password ─── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
          <h3 className="text-base font-semibold text-slate-900 mb-5">Change Password</h3>
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">New Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6} required className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20" placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Confirm New Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={6} required className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20" placeholder="••••••••" />
            </div>
            {passwordError && <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">{passwordError}</div>}
            {passwordMessage && <div className="text-emerald-700 text-sm bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">{passwordMessage}</div>}
            <button type="submit" disabled={passwordLoading} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 rounded-xl text-sm font-semibold text-white transition-colors">
              {passwordLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* ─── Danger Zone ─── */}
        <div className="bg-white border border-red-200 rounded-2xl p-6">
          <h3 className="text-base font-semibold text-red-600 mb-1">Danger Zone</h3>
          <p className="text-sm text-slate-400 mb-5">Permanent actions that can&apos;t be undone.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            {!deleteConfirm ? (
              <button onClick={() => setDeleteConfirm(true)} className="px-5 py-2.5 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl text-sm font-medium text-red-600 transition-colors">
                Delete Account
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-600">Are you sure?</span>
                <button onClick={handleDeleteAccount} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-xl text-sm font-semibold text-white transition-colors">
                  Yes, delete everything
                </button>
                <button onClick={() => setDeleteConfirm(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm text-slate-500 transition-colors">
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
