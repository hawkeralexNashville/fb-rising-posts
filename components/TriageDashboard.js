'use client'
import { useState, useEffect, useRef } from 'react'

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function formatNumber(n) {
  if (!n) return '0'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n.toString()
}

function ScoreBadge({ score }) {
  if (score == null) return null
  const color = score >= 7 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
    : score >= 4 ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    : 'bg-red-500/20 text-red-300 border-red-500/30'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${color}`}>
      {score >= 8 ? '🎯' : score >= 5 ? '✓' : '~'} {score}/10
    </span>
  )
}

function SourceBadge({ type }) {
  if (type === 'facebook') return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full text-xs font-medium">📘 Facebook</span>
  if (type === 'rss') return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-700 text-gray-300 border border-gray-600 rounded-full text-xs font-medium">📰 RSS</span>
  return null
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${copied ? 'bg-emerald-500 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>
      {copied
        ? <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg> Copied</>
        : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg> Copy</>
      }
    </button>
  )
}

function TriageCard({ card, onArchive, onRestore, onDelete, onGenerate, generating, localGenerated, isArchived }) {
  const [expanded, setExpanded] = useState(false)

  const headline = localGenerated?.headline ?? card.generated_headline
  const caption = localGenerated?.caption ?? card.generated_caption
  const hasGenerated = headline || caption

  useEffect(() => {
    if (localGenerated?.headline || localGenerated?.caption) setExpanded(true)
  }, [localGenerated?.headline, localGenerated?.caption])

  const isGeneratingHeadline = generating === 'headline'
  const isGeneratingCaption = generating === 'caption'

  return (
    <div className={`bg-gray-900 rounded-2xl border transition-all ${card.is_top_five && !isArchived ? 'border-indigo-500/50 ring-1 ring-indigo-500/20 shadow-lg shadow-indigo-500/5' : 'border-gray-700 hover:border-gray-600'}`}>
      {/* Card header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <SourceBadge type={card.source_type} />
            {card.is_top_five && !isArchived && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-semibold">⭐ Top 5</span>
            )}
            {card.title && <span className="text-sm font-semibold text-orange-400 truncate max-w-[200px]">{card.title}</span>}
            <span className="text-xs text-gray-500">{timeAgo(card.created_at)}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ScoreBadge score={card.ai_relevance_score} />
            {card.url && (
              <a href={card.url} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-orange-400 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
              </a>
            )}
          </div>
        </div>

        {card.ai_relevance_reason && (
          <p className="text-xs text-gray-500 mb-2 italic">{card.ai_relevance_reason}</p>
        )}

        {card.content && (
          <p className="text-sm text-gray-200 leading-relaxed line-clamp-3">{card.content}</p>
        )}

        {card.image_url && (
          <div className="mt-3 rounded-xl overflow-hidden bg-gray-800 border border-gray-700 max-h-40">
            <img
              src={card.image_url}
              alt=""
              className="w-full max-h-40 object-cover"
              loading="lazy"
              onError={e => { e.currentTarget.parentElement.style.display = 'none' }}
            />
          </div>
        )}

        {/* Stats row */}
        {(card.total_interactions > 0 || card.velocity > 0) && (
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
            {card.total_interactions > 0 && <span>Interactions <span className="text-gray-300 font-medium">{formatNumber(card.total_interactions)}</span></span>}
            {card.velocity > 0 && <span>Velocity <span className="text-orange-400 font-medium">{card.velocity}/hr</span></span>}
          </div>
        )}
      </div>

      {/* Generated content area */}
      {(hasGenerated || expanded) && (headline || caption) && (
        <div className="mx-4 mb-3 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-3">
          {headline && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-1.5">Headline</p>
              <div className="flex items-start gap-2">
                <p className="flex-1 text-sm text-gray-100 leading-relaxed">{headline}</p>
                <CopyButton text={headline} />
              </div>
            </div>
          )}
          {caption && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-1.5">Caption</p>
              <div className="flex items-start gap-2">
                <p className="flex-1 text-sm text-gray-100 leading-relaxed">{caption}</p>
                <CopyButton text={caption} />
              </div>
            </div>
          )}
          {headline && caption && (
            <CopyButton text={`${headline}\n\n${caption}`} />
          )}
        </div>
      )}

      {/* Actions */}
      <div className="px-4 pb-4 flex flex-wrap items-center gap-2">
        {!isArchived ? (
          <>
            <button
              onClick={() => onGenerate(card.id, 'headline')}
              disabled={isGeneratingHeadline || isGeneratingCaption}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
              {isGeneratingHeadline
                ? <><span className="w-3 h-3 border border-indigo-400 border-t-transparent rounded-full animate-spin" /> Generating…</>
                : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></svg> {headline ? 'Redo Headline' : 'Headline'}</>
              }
            </button>
            <button
              onClick={() => onGenerate(card.id, 'caption')}
              disabled={isGeneratingHeadline || isGeneratingCaption}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
              {isGeneratingCaption
                ? <><span className="w-3 h-3 border border-indigo-400 border-t-transparent rounded-full animate-spin" /> Generating…</>
                : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="17" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="17" y1="18" x2="3" y2="18" /></svg> {caption ? 'Redo Caption' : 'Caption'}</>
              }
            </button>
            <button
              onClick={() => onArchive(card.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 border border-gray-700 rounded-lg text-xs font-medium transition-colors ml-auto"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" /><line x1="10" y1="12" x2="14" y2="12" /></svg>
              Archive
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => onRestore(card.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 rounded-lg text-xs font-medium transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-4.08" /></svg>
              Restore
            </button>
            <button
              onClick={() => onDelete(card.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-medium transition-colors ml-auto"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function TriageDashboard({ supabase, session, onOpenSetup }) {
  const [pages, setPages] = useState([])
  const [selectedPageId, setSelectedPageId] = useState(null)
  const [tab, setTab] = useState('cards') // cards | archive | log
  const [sourceFilter, setSourceFilter] = useState('all')

  const [cards, setCards] = useState([])
  const [cardsLoading, setCardsLoading] = useState(false)
  const [cardsOffset, setCardsOffset] = useState(0)
  const [cardsHasMore, setCardsHasMore] = useState(false)

  const [archivedCards, setArchivedCards] = useState([])
  const [archivedLoading, setArchivedLoading] = useState(false)
  const [archivedOffset, setArchivedOffset] = useState(0)
  const [archivedHasMore, setArchivedHasMore] = useState(false)

  const [scanLog, setScanLog] = useState([])
  const [logLoading, setLogLoading] = useState(false)

  const [generating, setGenerating] = useState({}) // { [cardId]: 'headline' | 'caption' }
  const [localGenerated, setLocalGenerated] = useState({}) // { [cardId]: { headline?, caption? } }

  const [scanning, setScanning] = useState(false)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  const userId = session?.user?.id
  const LIMIT = 50

  useEffect(() => { if (userId) loadPages() }, [userId])

  async function getToken() {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token
  }

  function showToast(msg, type = 'success') {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ msg, type })
    toastTimer.current = setTimeout(() => setToast(null), 2500)
  }

  async function loadPages() {
    const token = await getToken()
    const res = await fetch('/api/triage/pages', { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) return
    const data = await res.json()
    setPages(data)
    if (data.length > 0) selectPage(data[0].id)
  }

  function selectPage(pageId) {
    setSelectedPageId(pageId)
    setCards([])
    setArchivedCards([])
    setScanLog([])
    setCardsOffset(0)
    setArchivedOffset(0)
    setLocalGenerated({})
    setTab('cards')
    loadCards(pageId, 0)
  }

  async function loadCards(pageId, offset = 0) {
    setCardsLoading(true)
    const token = await getToken()
    const res = await fetch(`/api/triage/cards?triagePageId=${pageId}&archived=false&limit=${LIMIT}&offset=${offset}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const data = await res.json()
      if (offset === 0) setCards(data)
      else setCards(prev => [...prev, ...data])
      setCardsHasMore(data.length === LIMIT)
      setCardsOffset(offset + data.length)
    }
    setCardsLoading(false)
  }

  async function loadArchivedCards(pageId, offset = 0) {
    setArchivedLoading(true)
    const token = await getToken()
    const res = await fetch(`/api/triage/cards?triagePageId=${pageId}&archived=true&limit=${LIMIT}&offset=${offset}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const data = await res.json()
      if (offset === 0) setArchivedCards(data)
      else setArchivedCards(prev => [...prev, ...data])
      setArchivedHasMore(data.length === LIMIT)
      setArchivedOffset(offset + data.length)
    }
    setArchivedLoading(false)
  }

  async function loadScanLog(pageId) {
    setLogLoading(true)
    const { data } = await supabase
      .from('triage_scan_log')
      .select('*')
      .eq('triage_page_id', pageId)
      .order('created_at', { ascending: false })
      .limit(50)
    setScanLog(data || [])
    setLogLoading(false)
  }

  function switchTab(t) {
    setTab(t)
    if (!selectedPageId) return
    if (t === 'archive' && archivedCards.length === 0) loadArchivedCards(selectedPageId, 0)
    if (t === 'log' && scanLog.length === 0) loadScanLog(selectedPageId)
  }

  async function archiveCard(cardId) {
    const token = await getToken()
    await fetch('/api/triage/cards', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: cardId, is_archived: true }),
    })
    setCards(prev => prev.filter(c => c.id !== cardId))
    // Add to archive list if it's loaded
    setArchivedCards(prev => {
      const card = cards.find(c => c.id === cardId)
      if (!card) return prev
      return [{ ...card, is_archived: true }, ...prev]
    })
  }

  async function restoreCard(cardId) {
    const token = await getToken()
    await fetch('/api/triage/cards', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: cardId, is_archived: false }),
    })
    const card = archivedCards.find(c => c.id === cardId)
    setArchivedCards(prev => prev.filter(c => c.id !== cardId))
    if (card) setCards(prev => [{ ...card, is_archived: false }, ...prev])
    showToast('Card restored')
  }

  async function deleteCard(cardId) {
    if (!confirm('Permanently delete this card?')) return
    const token = await getToken()
    await fetch(`/api/triage/cards?id=${cardId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    setArchivedCards(prev => prev.filter(c => c.id !== cardId))
    showToast('Card deleted')
  }

  async function generateContent(cardId, type) {
    setGenerating(prev => ({ ...prev, [cardId]: type }))
    const token = await getToken()
    try {
      const res = await fetch('/api/triage/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ cardId, type }),
      })
      const data = await res.json()
      if (res.ok && data.text) {
        setLocalGenerated(prev => ({
          ...prev,
          [cardId]: { ...prev[cardId], [type]: data.text },
        }))
        // Update card in list
        const updater = c => c.id === cardId ? { ...c, [type === 'headline' ? 'generated_headline' : 'generated_caption']: data.text } : c
        setCards(prev => prev.map(updater))
        setArchivedCards(prev => prev.map(updater))
      } else {
        showToast(data.error || 'Generation failed', 'error')
      }
    } catch {
      showToast('Generation failed', 'error')
    }
    setGenerating(prev => { const n = { ...prev }; delete n[cardId]; return n })
  }

  async function runScanNow() {
    if (!selectedPageId) return
    setScanning(true)
    const token = await getToken()
    const res = await fetch('/api/triage/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ triagePageId: selectedPageId }),
    })
    const data = await res.json()
    if (res.ok) {
      showToast(`Scan done — ${data.added} new card${data.added !== 1 ? 's' : ''} added`)
      if (data.added > 0) {
        setCards([])
        setCardsOffset(0)
        loadCards(selectedPageId, 0)
      }
      if (tab === 'log') loadScanLog(selectedPageId)
    } else {
      showToast(data.error || 'Scan failed', 'error')
    }
    setScanning(false)
  }

  const selectedPage = pages.find(p => p.id === selectedPageId)

  const filteredCards = sourceFilter === 'all' ? cards
    : sourceFilter === 'top5' ? cards.filter(c => c.is_top_five)
    : cards.filter(c => c.source_type === sourceFilter)

  const topFiveCards = filteredCards.filter(c => c.is_top_five)
  const restCards = filteredCards.filter(c => !c.is_top_five)

  return (
    <div className="flex-1 flex overflow-hidden">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg animate-slide-up ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-gray-800 text-white border border-gray-700'}`}>
          {toast.msg}
        </div>
      )}

      {/* Left panel — page list */}
      <div className="w-52 shrink-0 border-r border-gray-800 bg-gray-900 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Triage Pages</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {pages.length === 0 && (
            <p className="text-xs text-gray-600 p-3">No pages yet. Use Setup to create one.</p>
          )}
          {pages.map(page => (
            <button
              key={page.id}
              onClick={() => selectPage(page.id)}
              className={`w-full text-left px-3 py-2.5 rounded-xl mb-1 transition-colors text-sm font-medium ${selectedPageId === page.id ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
            >
              {page.name}
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-gray-800">
          <button
            onClick={onOpenSetup}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-medium text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
            Triage Setup
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {!selectedPage ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-600 text-sm">Select a triage page on the left.</p>
          </div>
        ) : (
          <>
            {/* Page header */}
            <div className="shrink-0 px-6 py-4 border-b border-gray-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-bold text-white">{selectedPage.name}</h2>
                <div className="flex gap-0.5">
                  {[
                    { key: 'cards', label: `Cards${cards.length ? ` (${cards.length}${cardsHasMore ? '+' : ''})` : ''}` },
                    { key: 'archive', label: 'Archive' },
                    { key: 'log', label: 'Scan Log' },
                  ].map(t => (
                    <button
                      key={t.key}
                      onClick={() => switchTab(t.key)}
                      className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${tab === t.key ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={runScanNow}
                disabled={scanning}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shrink-0 ${scanning ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 animate-pulse cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-600 text-white'}`}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                {scanning ? 'Scanning…' : 'Scan Now'}
              </button>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">

              {/* ─── Cards Tab ─── */}
              {tab === 'cards' && (
                <div className="p-5 max-w-3xl">
                  {/* Source filter */}
                  <div className="flex items-center gap-2 mb-5">
                    {[
                      { key: 'all', label: 'All' },
                      { key: 'top5', label: '⭐ Top 5' },
                      { key: 'facebook', label: '📘 Facebook' },
                      { key: 'rss', label: '📰 RSS' },
                    ].map(f => (
                      <button
                        key={f.key}
                        onClick={() => setSourceFilter(f.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${sourceFilter === f.key ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/40' : 'bg-gray-800 text-gray-400 border border-gray-700 hover:text-gray-200'}`}
                      >
                        {f.label}
                      </button>
                    ))}
                    <span className="text-xs text-gray-600 ml-auto">{filteredCards.length} card{filteredCards.length !== 1 ? 's' : ''}</span>
                  </div>

                  {cardsLoading && cards.length === 0 && (
                    <div className="flex items-center justify-center py-16">
                      <div className="w-6 h-6 border-2 border-indigo-800 border-t-indigo-400 rounded-full animate-spin" />
                    </div>
                  )}

                  {!cardsLoading && filteredCards.length === 0 && (
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-10 text-center">
                      <p className="text-gray-500 text-sm">No cards yet. Run a scan or wait for the overnight cron.</p>
                    </div>
                  )}

                  {/* Top 5 section */}
                  {topFiveCards.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Top 5</span>
                        <div className="flex-1 h-px bg-indigo-500/20" />
                      </div>
                      <div className="space-y-3">
                        {topFiveCards.map(card => (
                          <TriageCard
                            key={card.id}
                            card={card}
                            onArchive={archiveCard}
                            onGenerate={generateContent}
                            generating={generating[card.id]}
                            localGenerated={localGenerated[card.id]}
                            isArchived={false}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rest of cards */}
                  {restCards.length > 0 && (
                    <div>
                      {topFiveCards.length > 0 && (
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Other Cards</span>
                          <div className="flex-1 h-px bg-gray-800" />
                        </div>
                      )}
                      <div className="space-y-3">
                        {restCards.map(card => (
                          <TriageCard
                            key={card.id}
                            card={card}
                            onArchive={archiveCard}
                            onGenerate={generateContent}
                            generating={generating[card.id]}
                            localGenerated={localGenerated[card.id]}
                            isArchived={false}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {cardsHasMore && (
                    <button
                      onClick={() => loadCards(selectedPageId, cardsOffset)}
                      disabled={cardsLoading}
                      className="mt-4 w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
                    >
                      {cardsLoading ? 'Loading…' : 'Load more'}
                    </button>
                  )}
                </div>
              )}

              {/* ─── Archive Tab ─── */}
              {tab === 'archive' && (
                <div className="p-5 max-w-3xl">
                  {archivedLoading && archivedCards.length === 0 && (
                    <div className="flex items-center justify-center py-16">
                      <div className="w-6 h-6 border-2 border-indigo-800 border-t-indigo-400 rounded-full animate-spin" />
                    </div>
                  )}

                  {!archivedLoading && archivedCards.length === 0 && (
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-10 text-center">
                      <p className="text-gray-500 text-sm">No archived cards yet.</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    {archivedCards.map(card => (
                      <TriageCard
                        key={card.id}
                        card={card}
                        onRestore={restoreCard}
                        onDelete={deleteCard}
                        onGenerate={generateContent}
                        generating={generating[card.id]}
                        localGenerated={localGenerated[card.id]}
                        isArchived={true}
                      />
                    ))}
                  </div>

                  {archivedHasMore && (
                    <button
                      onClick={() => loadArchivedCards(selectedPageId, archivedOffset)}
                      disabled={archivedLoading}
                      className="mt-4 w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
                    >
                      {archivedLoading ? 'Loading…' : 'Load more'}
                    </button>
                  )}
                </div>
              )}

              {/* ─── Scan Log Tab ─── */}
              {tab === 'log' && (
                <div className="p-5 max-w-3xl">
                  {logLoading && (
                    <div className="flex items-center justify-center py-16">
                      <div className="w-6 h-6 border-2 border-indigo-800 border-t-indigo-400 rounded-full animate-spin" />
                    </div>
                  )}

                  {!logLoading && scanLog.length === 0 && (
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-10 text-center">
                      <p className="text-gray-500 text-sm">No scan history yet. Run a scan to get started.</p>
                    </div>
                  )}

                  {scanLog.length > 0 && (
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-700">
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Time</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Type</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Items</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Error</th>
                          </tr>
                        </thead>
                        <tbody>
                          {scanLog.map((entry, i) => (
                            <tr key={entry.id || i} className={`border-b border-gray-800 last:border-0 ${entry.status === 'failed' ? 'bg-red-500/5' : ''}`}>
                              <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                                {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{' '}
                                {new Date(entry.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${entry.scan_type === 'apify' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-gray-700 text-gray-300 border-gray-600'}`}>
                                  {entry.scan_type === 'apify' ? '📘 Facebook' : '📰 RSS'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-xs font-semibold ${entry.status === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {entry.status === 'success' ? '✓ success' : '✗ failed'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-300">{entry.items_processed ?? '—'}</td>
                              <td className="px-4 py-3 text-xs text-red-400 max-w-xs truncate">{entry.error_message || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
