'use client'
import { useState, useEffect, useCallback } from 'react'

// ─── Icons (inline SVGs to avoid dependencies) ───
const Icons = {
  plus: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  trash: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  ),
  scan: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  trending: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
    </svg>
  ),
  settings: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  ),
  logout: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  stream: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
  link: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  ),
  zap: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
}

// ─── Helpers ───
function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n?.toString() || '0'
}

// ─── Rising Posts List Component ───
function RisingPostsList({ posts }) {
  if (!posts || posts.length === 0) return null

  return (
    <div className="space-y-3">
      {posts.map((post, i) => (
        <div
          key={post.post_id || i}
          className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-4 animate-slide-up"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                {post.page_name || 'Unknown Page'}
              </span>
              {post.posted_at && (
                <span className="text-[10px] text-slate-600 ml-2">
                  {timeAgo(post.posted_at)}
                </span>
              )}
            </div>
            {post.post_url && (
              <a
                href={post.post_url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-slate-600 hover:text-emerald-400 transition-colors"
              >
                {Icons.link}
              </a>
            )}
          </div>
          {post.content_preview && (
            <p className="text-sm text-slate-300 mb-3 line-clamp-3 leading-relaxed">
              {post.content_preview}
            </p>
          )}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Total</span>
              <span className="font-semibold text-slate-200">{formatNumber(post.total_interactions)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Velocity</span>
              <span className="font-semibold text-emerald-400">{post.velocity?.toFixed(0) || '—'}/hr</span>
            </div>
            {post.delta !== null && post.delta !== undefined && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Delta</span>
                <span className="font-semibold text-emerald-400">+{post.delta}</span>
              </div>
            )}
            <div className="flex items-center gap-3 ml-auto text-slate-600">
              <span>👍 {formatNumber(post.reactions)}</span>
              <span>💬 {formatNumber(post.comments)}</span>
              <span>🔄 {formatNumber(post.shares)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard({ supabase, session }) {
  const [view, setView] = useState('quick')
  const [streams, setStreams] = useState([])
  const [selectedStreamId, setSelectedStreamId] = useState(null)
  const [pages, setPages] = useState([])
  const [newStreamName, setNewStreamName] = useState('')
  const [newPageUrl, setNewPageUrl] = useState('')
  const [newPageName, setNewPageName] = useState('')
  const [showAddStream, setShowAddStream] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [scanStatus, setScanStatus] = useState('idle')
  const [scanMessage, setScanMessage] = useState('')
  const [risingPosts, setRisingPosts] = useState([])
  const [settings, setSettings] = useState({
    min_velocity: 50,
    min_delta: 20,
    max_post_age_hours: 48,
  })
  const [quickUrl, setQuickUrl] = useState('')
  const [quickScanStatus, setQuickScanStatus] = useState('idle')
  const [quickScanMessage, setQuickScanMessage] = useState('')
  const [quickRisingPosts, setQuickRisingPosts] = useState([])

  const userId = session?.user?.id

  useEffect(() => {
    if (!userId) return
    loadStreams()
    loadSettings()
  }, [userId])

  useEffect(() => {
    if (!selectedStreamId) {
      setPages([])
      setRisingPosts([])
      return
    }
    loadPages(selectedStreamId)
  }, [selectedStreamId])

  async function loadStreams() {
    const { data } = await supabase
      .from('streams')
      .select('*')
      .order('created_at', { ascending: true })
    setStreams(data || [])
  }

  async function loadPages(streamId) {
    const { data } = await supabase
      .from('monitored_pages')
      .select('*')
      .eq('stream_id', streamId)
      .order('created_at', { ascending: true })
    setPages(data || [])
  }

  async function loadSettings() {
    const { data } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single()
    if (data) {
      setSettings({
        min_velocity: data.min_velocity,
        min_delta: data.min_delta,
        max_post_age_hours: data.max_post_age_hours,
      })
    }
  }

  async function createStream(e) {
    e.preventDefault()
    if (!newStreamName.trim()) return
    const { data, error } = await supabase
      .from('streams')
      .insert({ user_id: userId, name: newStreamName.trim() })
      .select()
      .single()
    if (!error && data) {
      setStreams([...streams, data])
      setSelectedStreamId(data.id)
      setNewStreamName('')
      setShowAddStream(false)
    }
  }

  async function deleteStream(id) {
    if (!confirm('Delete this stream and all its pages?')) return
    await supabase.from('streams').delete().eq('id', id)
    setStreams(streams.filter((s) => s.id !== id))
    if (selectedStreamId === id) {
      const remaining = streams.filter((s) => s.id !== id)
      setSelectedStreamId(remaining.length ? remaining[0].id : null)
    }
  }

  async function addPage(e) {
    e.preventDefault()
    if (!newPageUrl.trim()) return
    let url = newPageUrl.trim()
    if (!url.startsWith('http')) url = 'https://www.facebook.com/' + url
    const { data, error } = await supabase
      .from('monitored_pages')
      .insert({
        user_id: userId,
        stream_id: selectedStreamId,
        url: url,
        display_name: newPageName.trim() || url.split('facebook.com/')[1] || url,
      })
      .select()
      .single()
    if (!error && data) {
      setPages([...pages, data])
      setNewPageUrl('')
      setNewPageName('')
    }
  }

  async function deletePage(id) {
    await supabase.from('monitored_pages').delete().eq('id', id)
    setPages(pages.filter((p) => p.id !== id))
  }

  async function saveSettings() {
    const { data: existing } = await supabase
      .from('user_settings')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (existing) {
      await supabase
        .from('user_settings')
        .update({ ...settings, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
    } else {
      await supabase
        .from('user_settings')
        .insert({ user_id: userId, ...settings })
    }
  }

  // ─── Generic scan logic ───
  async function runScan(pageUrls, streamId, setStatus, setMessage, setResults) {
    const token = session?.access_token
    setStatus('starting')
    setMessage('Starting Apify scraper...')
    setResults([])

    try {
      const startRes = await fetch('/api/scan/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pageUrls, streamId }),
      })

      if (!startRes.ok) {
        let errBody
        try { errBody = await startRes.json() } catch { errBody = {} }
        const msg = errBody?.userMessage || errBody?.error || 'Failed to start scan'
        throw new Error(msg)
      }

      const { runId } = await startRes.json()
      setStatus('scanning')
      setMessage('Scanning Facebook pages... This takes 1-3 minutes.')

      let status = 'RUNNING'
      while (status === 'RUNNING' || status === 'READY') {
        await new Promise((r) => setTimeout(r, 5000))

        const statusRes = await fetch(`/api/scan/status?runId=${runId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const statusData = await statusRes.json()
        status = statusData.status

        if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
          throw new Error(`Scan ${status.toLowerCase()}. Try again.`)
        }
      }

      setStatus('processing')
      setMessage('Analyzing posts for rising trends...')

      const resultsRes = await fetch(
        `/api/scan/results?runId=${runId}&streamId=${streamId || ''}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (!resultsRes.ok) {
        const err = await resultsRes.json()
        throw new Error(err.error || 'Failed to process results')
      }

      const { posts, totalScraped } = await resultsRes.json()
      setResults(posts)
      setStatus('done')
      setMessage(
        posts.length > 0
          ? `Found ${posts.length} rising post${posts.length === 1 ? '' : 's'} out of ${totalScraped} scanned.`
          : `Scanned ${totalScraped} posts. No posts currently meet your rising thresholds.`
      )
    } catch (err) {
      setStatus('error')
      setMessage(err.message)
    }
  }

  async function startQuickScan(e) {
    e?.preventDefault()
    if (!quickUrl.trim()) return
    let url = quickUrl.trim()
    if (!url.startsWith('http')) url = 'https://www.facebook.com/' + url
    await runScan([url], null, setQuickScanStatus, setQuickScanMessage, setQuickRisingPosts)
  }

  async function startStreamScan() {
    if (pages.length === 0) {
      setScanMessage('Add some Facebook pages to this stream first.')
      setScanStatus('error')
      return
    }
    await runScan(pages.map((p) => p.url), selectedStreamId, setScanStatus, setScanMessage, setRisingPosts)
  }

  const selectedStream = streams.find((s) => s.id === selectedStreamId)
  const isScanning = ['starting', 'scanning', 'processing'].includes(scanStatus)
  const isQuickScanning = ['starting', 'scanning', 'processing'].includes(quickScanStatus)

  return (
    <div className="min-h-screen flex">
      {/* ─── Sidebar ─── */}
      <div className="w-64 bg-slate-900/50 border-r border-slate-800/50 flex flex-col">
        <div className="p-4 border-b border-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              {Icons.trending}
            </div>
            <span className="font-semibold text-sm tracking-tight">Rising Posts</span>
          </div>
        </div>

        <div className="p-3 border-b border-slate-800/50">
          <button
            onClick={() => { setView('quick'); setSelectedStreamId(null) }}
            className={`flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-sm transition-colors ${
              view === 'quick'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            {Icons.zap}
            <span>Quick Scan</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Streams</span>
            <button
              onClick={() => setShowAddStream(!showAddStream)}
              className="text-slate-500 hover:text-emerald-400 transition-colors"
            >
              {Icons.plus}
            </button>
          </div>

          {showAddStream && (
            <form onSubmit={createStream} className="mb-2">
              <input
                type="text"
                value={newStreamName}
                onChange={(e) => setNewStreamName(e.target.value)}
                placeholder="Stream name..."
                autoFocus
                className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-md text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 mb-1.5"
              />
              <div className="flex gap-1.5">
                <button type="submit" className="flex-1 px-2 py-1 bg-emerald-600 hover:bg-emerald-500 rounded text-[10px] font-medium transition-colors">
                  Create
                </button>
                <button type="button" onClick={() => { setShowAddStream(false); setNewStreamName('') }} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[10px] text-slate-400 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {streams.length === 0 && !showAddStream && (
            <p className="text-xs text-slate-600 mt-2">No streams yet. Create one to get started.</p>
          )}
          {streams.map((stream) => (
            <div
              key={stream.id}
              className={`group flex items-center justify-between px-2.5 py-2 rounded-lg mb-0.5 cursor-pointer transition-colors ${
                view === 'streams' && selectedStreamId === stream.id
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
              onClick={() => { setView('streams'); setSelectedStreamId(stream.id) }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="shrink-0">{Icons.stream}</span>
                <span className="text-sm truncate">{stream.name}</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); deleteStream(stream.id) }}
                className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all"
              >
                {Icons.trash}
              </button>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-slate-800/50 space-y-1">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 w-full px-2.5 py-2 text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 rounded-lg transition-colors"
          >
            {Icons.settings}
            <span>Settings</span>
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-2 w-full px-2.5 py-2 text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 rounded-lg transition-colors"
          >
            {Icons.logout}
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* ─── Main Content ─── */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {showSettings && (
          <div className="bg-slate-900/70 border-b border-slate-800/50 p-5 animate-slide-up">
            <h3 className="text-sm font-semibold mb-4">Rising Post Thresholds</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-2xl">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">
                  Min Velocity (interactions/hr)
                </label>
                <input
                  type="number"
                  min="1"
                  value={settings.min_velocity}
                  onChange={(e) => setSettings({ ...settings, min_velocity: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-emerald-500/50"
                />
                <p className="text-[10px] text-slate-600 mt-1">How fast a new post must be growing</p>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">
                  Min Delta (since last scan)
                </label>
                <input
                  type="number"
                  min="1"
                  value={settings.min_delta}
                  onChange={(e) => setSettings({ ...settings, min_delta: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-emerald-500/50"
                />
                <p className="text-[10px] text-slate-600 mt-1">Interactions gained since last scan</p>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">
                  Max Post Age (hours)
                </label>
                <input
                  type="number"
                  min="1"
                  value={settings.max_post_age_hours}
                  onChange={(e) => setSettings({ ...settings, max_post_age_hours: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-emerald-500/50"
                />
                <p className="text-[10px] text-slate-600 mt-1">Ignore posts older than this</p>
              </div>
            </div>
            <button
              onClick={() => { saveSettings(); setShowSettings(false) }}
              className="mt-4 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-medium transition-colors"
            >
              Save Settings
            </button>
          </div>
        )}

        {/* ─── Quick Scan View ─── */}
        {view === 'quick' && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-amber-400">{Icons.zap}</span>
                <h2 className="text-lg font-semibold">Quick Scan</h2>
              </div>
              <p className="text-xs text-slate-500 mb-5">Paste a Facebook page URL and scan it instantly. No stream needed.</p>

              <form onSubmit={startQuickScan} className="flex gap-2 items-end mb-5">
                <div className="flex-1 max-w-lg">
                  <input
                    type="text"
                    value={quickUrl}
                    onChange={(e) => setQuickUrl(e.target.value)}
                    placeholder="https://facebook.com/PageName or just PageName"
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/25 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isQuickScanning || !quickUrl.trim()}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isQuickScanning
                      ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30 cursor-not-allowed animate-pulse-glow'
                      : !quickUrl.trim()
                      ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                      : 'bg-amber-600 hover:bg-amber-500 text-white'
                  }`}
                >
                  {Icons.scan}
                  {isQuickScanning ? 'Scanning...' : 'Scan'}
                </button>
              </form>

              {quickScanMessage && (
                <p className={`text-xs mb-4 ${quickScanStatus === 'error' ? 'text-red-400' : quickScanStatus === 'done' ? 'text-slate-400' : 'text-amber-400/70'}`}>
                  {quickScanMessage}
                </p>
              )}

              <RisingPostsList posts={quickRisingPosts} />

              {quickScanStatus === 'done' && quickRisingPosts.length === 0 && (
                <div className="bg-slate-900/30 border border-slate-800/30 rounded-xl p-8 text-center">
                  <p className="text-sm text-slate-500">No rising posts found. Try lowering your thresholds in Settings or scanning again later.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Streams View ─── */}
        {view === 'streams' && !selectedStream && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center mx-auto mb-4 text-slate-600">
                {Icons.stream}
              </div>
              <p className="text-slate-500 text-sm">
                {streams.length === 0 ? 'Create your first stream to get started.' : 'Select a stream from the sidebar.'}
              </p>
            </div>
          </div>
        )}

        {view === 'streams' && selectedStream && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-5 pb-0">
              <h2 className="text-lg font-semibold mb-4">{selectedStream.name}</h2>

              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                    Monitored Pages ({pages.length})
                  </span>
                </div>

                {pages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {pages.map((page) => (
                      <div
                        key={page.id}
                        className="group flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-full text-xs"
                      >
                        <span className="text-slate-300">{page.display_name}</span>
                        <button
                          onClick={() => deletePage(page.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <form onSubmit={addPage} className="flex gap-2 items-end">
                  <div className="flex-1 max-w-sm">
                    <input
                      type="text"
                      value={newPageUrl}
                      onChange={(e) => setNewPageUrl(e.target.value)}
                      placeholder="Facebook page URL or name..."
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                  <div className="max-w-[180px]">
                    <input
                      type="text"
                      value={newPageName}
                      onChange={(e) => setNewPageName(e.target.value)}
                      placeholder="Label (optional)"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium transition-colors"
                  >
                    Add Page
                  </button>
                </form>
              </div>

              <div className="flex items-center gap-3 mb-5 pt-3 border-t border-slate-800/30">
                <button
                  onClick={startStreamScan}
                  disabled={isScanning || pages.length === 0}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isScanning
                      ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 cursor-not-allowed animate-pulse-glow'
                      : pages.length === 0
                      ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {Icons.scan}
                  {isScanning ? 'Scanning...' : 'Scan Now'}
                </button>
                {scanMessage && (
                  <span className={`text-xs ${scanStatus === 'error' ? 'text-red-400' : scanStatus === 'done' ? 'text-slate-400' : 'text-emerald-400/70'}`}>
                    {scanMessage}
                  </span>
                )}
              </div>
            </div>

            {risingPosts.length > 0 && (
              <div className="px-5 pb-5">
                <RisingPostsList posts={risingPosts} />
              </div>
            )}

            {scanStatus === 'done' && risingPosts.length === 0 && (
              <div className="px-5 pb-5">
                <div className="bg-slate-900/30 border border-slate-800/30 rounded-xl p-8 text-center">
                  <p className="text-sm text-slate-500">No rising posts found. Try lowering your thresholds in Settings or scanning again later.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}