'use client'
import { useState, useEffect } from 'react'

const TABS = ['Persona', 'Example Posts', 'RSS Keywords', 'Prompts', 'Schedule']

const DEFAULT_SCAN_TIMES = ['22:00', '01:00', '04:00']

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const h = i.toString().padStart(2, '0')
  const label = i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`
  return { value: `${h}:00`, label }
})

function timeToLabel(t) {
  const opt = HOUR_OPTIONS.find(o => o.value === t)
  return opt ? opt.label : t
}

export default function TriageSetup({ supabase, session, streams }) {
  const [pages, setPages] = useState([])
  const [selectedPageId, setSelectedPageId] = useState(null)
  const [showNewPage, setShowNewPage] = useState(false)
  const [newPageName, setNewPageName] = useState('')
  const [creating, setCreating] = useState(false)
  const [tab, setTab] = useState(0)
  const [saving, setSaving] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [toast, setToast] = useState(null)
  const toastRef = useState(null)

  // Per-page editable fields
  const [persona, setPersona] = useState('')
  const [streamId, setStreamId] = useState('')
  const [examplePosts, setExamplePosts] = useState([])
  const [newExampleUrl, setNewExampleUrl] = useState('')
  const [newExampleContent, setNewExampleContent] = useState('')
  const [newExampleImage, setNewExampleImage] = useState(null) // File object
  const [newExampleImagePreview, setNewExampleImagePreview] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [keywords, setKeywords] = useState([])
  const [newKeyword, setNewKeyword] = useState('')
  const [headlinePrompt, setHeadlinePrompt] = useState('')
  const [captionPrompt, setCaptionPrompt] = useState('')
  const [relevancePrompt, setRelevancePrompt] = useState('')
  const [scanTimes, setScanTimes] = useState(DEFAULT_SCAN_TIMES)
  const [scanWindowHours, setScanWindowHours] = useState(6)

  const userId = session?.user?.id

  useEffect(() => { if (userId) loadPages() }, [userId])

  async function getToken() {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token
  }

  async function loadPages() {
    const token = await getToken()
    const res = await fetch('/api/triage/pages', { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) return
    const data = await res.json()
    setPages(data)
    if (data.length > 0 && !selectedPageId) {
      selectPage(data[0])
    }
  }

  function selectPage(page) {
    setSelectedPageId(page.id)
    setPersona(page.persona || '')
    setStreamId(page.stream_id || '')
    setExamplePosts(page.example_posts || [])
    setKeywords(page.keywords?.map(k => k.keyword) || [])
    setHeadlinePrompt(page.headline_prompt || '')
    setCaptionPrompt(page.caption_prompt || '')
    setRelevancePrompt(page.relevance_prompt || '')
    setScanTimes(page.scan_times || DEFAULT_SCAN_TIMES)
    setScanWindowHours(page.scan_window_hours || 6)
    setScanResult(null)
  }

  function showToastMsg(msg, type = 'success') {
    if (toastRef[0]) clearTimeout(toastRef[0])
    setToast({ msg, type })
    toastRef[0] = setTimeout(() => setToast(null), 2500)
  }

  async function createPage(e) {
    e.preventDefault()
    if (!newPageName.trim()) return
    setCreating(true)
    const token = await getToken()
    const res = await fetch('/api/triage/pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: newPageName.trim(), scan_times: DEFAULT_SCAN_TIMES }),
    })
    const data = await res.json()
    if (res.ok) {
      setPages(prev => [...prev, data])
      selectPage(data)
      setNewPageName('')
      setShowNewPage(false)
    } else {
      showToastMsg(data.error || 'Failed to create', 'error')
    }
    setCreating(false)
  }

  async function deletePage(id) {
    if (!confirm('Delete this triage page and all its cards?')) return
    const token = await getToken()
    await fetch(`/api/triage/pages?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    const remaining = pages.filter(p => p.id !== id)
    setPages(remaining)
    if (selectedPageId === id) {
      if (remaining.length > 0) selectPage(remaining[0])
      else setSelectedPageId(null)
    }
  }

  async function saveCurrentTab() {
    if (!selectedPageId) return
    setSaving(true)
    const token = await getToken()

    let body = { id: selectedPageId }
    if (tab === 0) {
      body = { ...body, persona, stream_id: streamId || null }
    } else if (tab === 1) {
      body = { ...body, example_posts: examplePosts }
    } else if (tab === 2) {
      body = { ...body, keywords }
    } else if (tab === 3) {
      body = { ...body, headline_prompt: headlinePrompt, caption_prompt: captionPrompt, relevance_prompt: relevancePrompt }
    } else if (tab === 4) {
      body = { ...body, scan_times: scanTimes, scan_window_hours: scanWindowHours }
    }

    const res = await fetch('/api/triage/pages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (res.ok) {
      setPages(prev => prev.map(p => p.id === selectedPageId ? { ...p, persona, stream_id: streamId || null, headline_prompt: headlinePrompt, caption_prompt: captionPrompt, relevance_prompt: relevancePrompt, scan_times: scanTimes, scan_window_hours: scanWindowHours } : p))
      showToastMsg('Saved!')
    } else {
      showToastMsg(data.error || 'Failed to save', 'error')
    }
    setSaving(false)
  }

  async function runScanNow() {
    if (!selectedPageId) return
    setScanning(true)
    setScanResult(null)
    const token = await getToken()
    const res = await fetch('/api/triage/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ triagePageId: selectedPageId }),
    })
    const data = await res.json()
    if (res.ok) {
      setScanResult({ ok: true, added: data.added, total: data.total })
      showToastMsg(`Scan complete — ${data.added} new card${data.added !== 1 ? 's' : ''} added`)
    } else {
      setScanResult({ ok: false, error: data.error })
      showToastMsg(data.error || 'Scan failed', 'error')
    }
    setScanning(false)
  }

  function handleExampleImageChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setNewExampleImage(file)
    setNewExampleImagePreview(URL.createObjectURL(file))
  }

  async function addExamplePost() {
    if (!newExampleUrl.trim() && !newExampleContent.trim() && !newExampleImage) return
    setUploadingImage(true)
    let imageUrl = null
    if (newExampleImage) {
      const ext = newExampleImage.name.split('.').pop()
      const path = `${userId}/${Date.now()}.${ext}`
      const { data, error } = await supabase.storage.from('triage-example-images').upload(path, newExampleImage, { upsert: false })
      if (!error && data) {
        const { data: { publicUrl } } = supabase.storage.from('triage-example-images').getPublicUrl(data.path)
        imageUrl = publicUrl
      } else if (error) {
        showToastMsg('Image upload failed: ' + error.message, 'error')
        setUploadingImage(false)
        return
      }
    }
    setExamplePosts(prev => [...prev, { url: newExampleUrl.trim() || null, content: newExampleContent.trim() || null, image_url: imageUrl }])
    setNewExampleUrl('')
    setNewExampleContent('')
    setNewExampleImage(null)
    setNewExampleImagePreview(null)
    setUploadingImage(false)
  }

  function removeExamplePost(i) {
    setExamplePosts(prev => prev.filter((_, idx) => idx !== i))
  }

  function addKeyword() {
    const kw = newKeyword.trim()
    if (!kw || keywords.includes(kw)) return
    setKeywords(prev => [...prev, kw])
    setNewKeyword('')
  }

  function removeKeyword(kw) {
    setKeywords(prev => prev.filter(k => k !== kw))
  }

  function updateScanTime(i, val) {
    setScanTimes(prev => prev.map((t, idx) => idx === i ? val : t))
  }

  function addScanTime() {
    if (scanTimes.length >= 6) return
    setScanTimes(prev => [...prev, '08:00'])
  }

  function removeScanTime(i) {
    if (scanTimes.length <= 1) return
    setScanTimes(prev => prev.filter((_, idx) => idx !== i))
  }

  const selectedPage = pages.find(p => p.id === selectedPageId)

  return (
    <div className="flex-1 overflow-y-auto">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg animate-slide-up ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-gray-800 text-white border border-gray-700'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex h-full min-h-0">
        {/* Left panel — page list */}
        <div className="w-56 shrink-0 border-r border-gray-800 bg-gray-900 flex flex-col">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Triage Pages</span>
            <button onClick={() => setShowNewPage(v => !v)} className="text-gray-500 hover:text-indigo-400 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </button>
          </div>

          {showNewPage && (
            <form onSubmit={createPage} className="p-3 border-b border-gray-800">
              <input
                type="text"
                value={newPageName}
                onChange={e => setNewPageName(e.target.value)}
                placeholder="Page name..."
                autoFocus
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-400 mb-2"
              />
              <div className="flex gap-2">
                <button type="submit" disabled={creating} className="flex-1 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-xs font-semibold text-white transition-colors disabled:opacity-50">
                  {creating ? 'Creating…' : 'Create'}
                </button>
                <button type="button" onClick={() => { setShowNewPage(false); setNewPageName('') }} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs text-gray-300 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="flex-1 overflow-y-auto p-2">
            {pages.length === 0 && !showNewPage && (
              <button onClick={() => setShowNewPage(true)} className="w-full mt-2 px-3 py-3 rounded-xl border-2 border-dashed border-gray-700 hover:border-indigo-500/50 hover:bg-indigo-500/5 text-gray-500 hover:text-indigo-400 text-xs font-medium transition-all text-center">
                + Create your first triage page
              </button>
            )}
            {pages.map(page => (
              <div
                key={page.id}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-xl mb-1 cursor-pointer transition-colors ${selectedPageId === page.id ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                onClick={() => selectPage(page)}
              >
                <span className="text-sm font-medium truncate">{page.name}</span>
                <button
                  onClick={e => { e.stopPropagation(); deletePage(page.id) }}
                  className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all shrink-0 ml-1"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel — tabs */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {!selectedPage ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center mx-auto mb-4 text-gray-600">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="16" x2="13" y2="16" /></svg>
                </div>
                <p className="text-gray-500 text-sm">Select a triage page or create one to get started.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Page header */}
              <div className="shrink-0 px-6 pt-6 pb-0 border-b border-gray-800">
                <h2 className="text-xl font-bold text-white mb-4">{selectedPage.name}</h2>
                <div className="flex gap-0.5">
                  {TABS.map((t, i) => (
                    <button
                      key={t}
                      onClick={() => setTab(i)}
                      className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${tab === i ? 'bg-gray-950 text-indigo-400 border-t border-l border-r border-gray-800' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto p-6">

                {/* ─── Persona Tab ─── */}
                {tab === 0 && (
                  <div className="max-w-2xl space-y-5">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Linked Stream</label>
                      <select
                        value={streamId}
                        onChange={e => setStreamId(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-xl text-sm text-gray-100 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 appearance-none cursor-pointer"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '40px' }}
                      >
                        <option value="">— No stream selected —</option>
                        {(streams || []).map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-600 mt-1.5">Which stream&apos;s Facebook pages should this triage page scan?</p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Audience Persona</label>
                      <textarea
                        value={persona}
                        onChange={e => setPersona(e.target.value)}
                        rows={8}
                        placeholder="Describe your audience in detail. Who are they? What do they care about? What makes content resonate with them? What are their pain points, interests, and values?"
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 resize-y"
                      />
                      <p className="text-xs text-gray-600 mt-1.5">This persona is used by AI to score which posts are relevant to your page.</p>
                    </div>

                    <button
                      onClick={saveCurrentTab}
                      disabled={saving}
                      className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                )}

                {/* ─── Example Posts Tab ─── */}
                {tab === 1 && (
                  <div className="max-w-2xl space-y-5">
                    <p className="text-sm text-gray-400">Add example posts that represent the type of content you want to surface. GPT-4o analyzes uploaded images for visual style, text overlay, emotional hook, and caption structure to calibrate relevance scoring.</p>

                    <div className="space-y-3">
                      {examplePosts.map((ep, i) => (
                        <div key={i} className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-start gap-3">
                          {ep.image_url && (
                            <img src={ep.image_url} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0 border border-gray-600" onError={e => { e.currentTarget.style.display = 'none' }} />
                          )}
                          <div className="flex-1 min-w-0">
                            {ep.url && <p className="text-xs text-indigo-400 truncate mb-1">{ep.url}</p>}
                            {ep.content && <p className="text-sm text-gray-300 line-clamp-3">{ep.content}</p>}
                            {ep.image_url && !ep.url && !ep.content && <p className="text-xs text-gray-500">Image only</p>}
                          </div>
                          <button onClick={() => removeExamplePost(i)} className="text-gray-600 hover:text-red-400 transition-colors shrink-0">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Add Example Post</p>
                      <input
                        type="text"
                        value={newExampleUrl}
                        onChange={e => setNewExampleUrl(e.target.value)}
                        placeholder="URL (optional)"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-400"
                      />
                      <textarea
                        value={newExampleContent}
                        onChange={e => setNewExampleContent(e.target.value)}
                        rows={3}
                        placeholder="Post text (optional)"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-400 resize-y"
                      />
                      <div>
                        <p className="text-xs text-gray-500 mb-1.5">Post image (optional) — GPT-4o will analyze visual style, text overlay, and emotional hook</p>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-xl text-xs text-gray-300 transition-colors">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                            {newExampleImage ? newExampleImage.name : 'Choose image…'}
                          </div>
                          <input type="file" accept="image/*" onChange={handleExampleImageChange} className="hidden" />
                          {newExampleImagePreview && (
                            <img src={newExampleImagePreview} alt="" className="w-12 h-12 rounded-lg object-cover border border-gray-600" />
                          )}
                          {newExampleImage && (
                            <button type="button" onClick={() => { setNewExampleImage(null); setNewExampleImagePreview(null) }} className="text-gray-600 hover:text-red-400 transition-colors text-xs">Remove</button>
                          )}
                        </label>
                      </div>
                      <button onClick={addExamplePost} disabled={uploadingImage} className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-sm text-white rounded-xl transition-colors disabled:opacity-50">
                        {uploadingImage && <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />}
                        {uploadingImage ? 'Uploading…' : 'Add Example'}
                      </button>
                    </div>

                    <button onClick={saveCurrentTab} disabled={saving} className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                )}

                {/* ─── RSS Keywords Tab ─── */}
                {tab === 2 && (
                  <div className="max-w-2xl space-y-5">
                    <p className="text-sm text-gray-400">These keywords are used to poll Google News RSS every hour. Matching news articles are stored as triage cards.</p>

                    <div className="flex flex-wrap gap-2">
                      {keywords.map(kw => (
                        <span key={kw} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-sm">
                          {kw}
                          <button onClick={() => removeKeyword(kw)} className="text-indigo-400 hover:text-red-400 transition-colors ml-0.5">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                          </button>
                        </span>
                      ))}
                      {keywords.length === 0 && <p className="text-sm text-gray-600">No keywords yet.</p>}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newKeyword}
                        onChange={e => setNewKeyword(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addKeyword() } }}
                        placeholder="e.g. Nashville real estate"
                        className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-400"
                      />
                      <button onClick={addKeyword} className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-sm text-white rounded-xl transition-colors">
                        Add
                      </button>
                    </div>

                    <button onClick={saveCurrentTab} disabled={saving} className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                )}

                {/* ─── Prompts Tab ─── */}
                {tab === 3 && (
                  <div className="max-w-2xl space-y-6">
                    <p className="text-sm text-gray-400">Customize the AI prompts used during scanning and content generation. Leave blank to use defaults.</p>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Relevance Scoring Prompt</label>
                      <p className="text-xs text-gray-600 mb-2">Prepended to the relevance scoring request. Default: &ldquo;You are a relevance filter for a Facebook page.&rdquo;</p>
                      <textarea
                        value={relevancePrompt}
                        onChange={e => setRelevancePrompt(e.target.value)}
                        rows={4}
                        placeholder="Leave blank for default…"
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-400 resize-y"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Headline Prompt</label>
                      <p className="text-xs text-gray-600 mb-2">Used when generating Facebook post headlines from a triage card.</p>
                      <textarea
                        value={headlinePrompt}
                        onChange={e => setHeadlinePrompt(e.target.value)}
                        rows={4}
                        placeholder="Leave blank for default…"
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-400 resize-y"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Caption Prompt</label>
                      <p className="text-xs text-gray-600 mb-2">Used when generating Facebook post captions from a triage card.</p>
                      <textarea
                        value={captionPrompt}
                        onChange={e => setCaptionPrompt(e.target.value)}
                        rows={4}
                        placeholder="Leave blank for default…"
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-400 resize-y"
                      />
                    </div>

                    <button onClick={saveCurrentTab} disabled={saving} className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
                      {saving ? 'Saving…' : 'Save Prompts'}
                    </button>
                  </div>
                )}

                {/* ─── Schedule Tab ─── */}
                {tab === 4 && (
                  <div className="max-w-xl space-y-6">

                    {/* Status indicator */}
                    {streamId ? (
                      <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                        <p className="text-sm text-emerald-300 font-medium">Schedule active</p>
                        <p className="text-xs text-emerald-600 ml-auto">Runs at {selectedPage?.scan_times?.join(', ') || scanTimes.join(', ')} CT</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/25">
                        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                        <p className="text-sm text-amber-300 font-medium">No stream linked</p>
                        <p className="text-xs text-amber-600 ml-1">— schedule won't run until a stream is set in the Persona tab</p>
                      </div>
                    )}

                    <div>
                      <p className="text-sm text-gray-300 font-medium mb-1">Overnight Scan Schedule</p>
                      <p className="text-sm text-gray-500 mb-5">
                        Configure up to 6 scan times (Central Time). The GitHub Actions workflow checks every 30 minutes and fires scans within a ±20-minute window of each saved time. Changes take effect after clicking <strong className="text-gray-400">Save Schedule</strong>.
                      </p>

                      <div className="space-y-3">
                        {scanTimes.map((t, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-600 w-16">Scan {i + 1}</span>
                            <select
                              value={t}
                              onChange={e => updateScanTime(i, e.target.value)}
                              className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-xl text-sm text-gray-100 focus:outline-none focus:border-indigo-400 appearance-none cursor-pointer"
                              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '40px' }}
                            >
                              {HOUR_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label} CT</option>
                              ))}
                            </select>
                            {scanTimes.length > 1 && (
                              <button onClick={() => removeScanTime(i)} className="text-gray-600 hover:text-red-400 transition-colors">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      {scanTimes.length < 6 && (
                        <button onClick={addScanTime} className="mt-3 flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                          Add time
                        </button>
                      )}
                    </div>

                    <div>
                      <p className="text-sm text-gray-300 font-medium mb-1">Scan Window</p>
                      <p className="text-sm text-gray-500 mb-3">How far back each scan looks for posts. Applies to both scheduled and manual scans.</p>
                      <select
                        value={scanWindowHours}
                        onChange={e => setScanWindowHours(Number(e.target.value))}
                        className="w-full px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-xl text-sm text-gray-100 focus:outline-none focus:border-indigo-400 appearance-none cursor-pointer"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '40px' }}
                      >
                        {[6, 12, 24, 48, 72].map(h => (
                          <option key={h} value={h}>Last {h} hours</option>
                        ))}
                      </select>
                    </div>

                    <button onClick={saveCurrentTab} disabled={saving} className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
                      {saving ? 'Saving…' : 'Save Schedule'}
                    </button>

                    <div className="border-t border-gray-800 pt-6">
                      <p className="text-sm text-gray-300 font-medium mb-1">Manual Scan</p>
                      <p className="text-sm text-gray-500 mb-4">
                        Trigger the full overnight pipeline right now. This will pull the latest posts from your linked stream, score them, and add new cards. May take up to 5 minutes.
                      </p>

                      {scanResult && (
                        <div className={`mb-4 p-4 rounded-xl border text-sm ${scanResult.ok ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
                          {scanResult.ok
                            ? `Scan complete. ${scanResult.added} new card${scanResult.added !== 1 ? 's' : ''} added (${scanResult.total} total scraped).`
                            : `Scan failed: ${scanResult.error}`}
                        </div>
                      )}

                      <button
                        onClick={runScanNow}
                        disabled={scanning}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${scanning ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 animate-pulse cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-600 text-white'}`}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                        {scanning ? 'Scanning…' : 'Scan Now'}
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
