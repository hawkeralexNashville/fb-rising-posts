'use client'
import { useState, useEffect } from 'react'

export default function Admin({ session }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to load users')
      }
      const data = await res.json()
      setUsers(data.users || [])
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  const totalUsers = users.length
  const totalScans = users.reduce((sum, u) => sum + u.scan_count, 0)
  const totalCost = users.reduce((sum, u) => sum + u.total_cost, 0)

  function formatDate(dateStr) {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function timeAgo(dateStr) {
    if (!dateStr) return 'Never'
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
    return formatDate(dateStr)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 max-w-5xl">
        <div className="flex items-center gap-2 mb-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-500">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <h2 className="text-xl font-bold text-slate-900">Admin</h2>
        </div>
        <p className="text-base text-slate-500 mb-6">User management and platform analytics.</p>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Total Users</p>
            <p className="text-2xl font-bold text-slate-900">{totalUsers}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Total Scans</p>
            <p className="text-2xl font-bold text-slate-900">{totalScans}</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-orange-400 mb-1">Total Cost</p>
            <p className="text-2xl font-bold text-orange-600">${totalCost.toFixed(4)}</p>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">{error}</div>
        )}

        {!loading && !error && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-slate-400 px-5 py-3">User</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-slate-400 px-5 py-3">Signed Up</th>
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-slate-400 px-5 py-3">Last Active</th>
                  <th className="text-right text-xs font-semibold uppercase tracking-wider text-slate-400 px-5 py-3">Scans</th>
                  <th className="text-right text-xs font-semibold uppercase tracking-wider text-slate-400 px-5 py-3">Cost</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-medium text-slate-800">{user.email}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-slate-500">{formatDate(user.created_at)}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-slate-500">{timeAgo(user.last_sign_in)}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className={`text-sm font-medium ${user.scan_count > 0 ? 'text-slate-800' : 'text-slate-300'}`}>{user.scan_count}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className={`text-sm font-medium ${user.total_cost > 0 ? 'text-orange-600' : 'text-slate-300'}`}>
                        {user.total_cost > 0 ? `$${user.total_cost.toFixed(4)}` : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
