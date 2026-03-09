'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

// ─── Helpers ───
function formatNumber(n) {
  if (n == null) return '—'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n.toLocaleString()
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

// ─── Icons ───
const Icons = {
  trending: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>,
  link: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>,
  lock: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>,
  copy: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>,
  check: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>,
}

const PLATFORMS = {
  facebook: { label: 'Facebook', icon: '📘' },
  x: { label: 'X / Twitter', icon: '𝕏' },
  reddit: { label: 'Reddit', icon: '🔴' },
}

// ─── Strategy Panel ───
function StrategyPanel({ strategy }) {
  const [expanded, setExpanded] = useState(false)
  if (!strategy) return null
  const colorClass = strategy.relevance === 'high' ? 'border-violet-500/50 bg-violet-950/40' : strategy.relevance === 'moderate' ? 'border-blue-500/40 bg-blue-950/30' : 'border-gray-700 bg-gray-900/60'
  return (
    <div className={`mt-3 border rounded-xl overflow-hidden ${colorClass}`}>
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left">
        <div className="flex items-center gap-2">
          <span className="text-sm">🧠</span>
          <span className={`text-xs font-semibold ${strategy.relevance === 'high' ? 'text-violet-400' : strategy.relevance === 'moderate' ? 'text-blue-400' : 'text-gray-400'}`}>
            AI Strategy · {strategy.relevance} relevance
          </span>
        </div>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/10 pt-3">
          {strategy.why_trending && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Why It's Trending</p>
              <p className="text-sm text-gray-300">{strategy.why_trending}</p>
            </div>
          )}
          {strategy.best_angle && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Best Angle</p>
              <p className="text-sm text-gray-300">{strategy.best_angle}</p>
            </div>
          )}
          {strategy.hooks?.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Hooks</p>
              <div className="space-y-1.5">
                {strategy.hooks.map((hook, i) => (
                  <div key={i} className="flex items-start gap-2 bg-black/30 rounded-lg px-3 py-2">
                    <span className="text-xs text-violet-400 font-bold mt-0.5 shrink-0">{i + 1}</span>
                    <p className="text-sm text-gray-200">{hook}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {strategy.engagement_question && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Engagement Question</p>
              <p className="text-sm text-gray-300 italic">"{strategy.engagement_question}"</p>
            </div>
          )}
          {strategy.monetization_direction && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Monetization Direction</p>
              <p className="text-sm text-gray-300">{strategy.monetization_direction}</p>
            </div>
          )}
          {strategy.risk_warnings?.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-500 mb-1">Risk Warnings</p>
              {strategy.risk_warnings.map((w, i) => (
                <p key={i} className="text-xs text-amber-300">⚠ {w}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Batch Strategy Panel ───
function BatchStrategyPanel({ strategy }) {
  const [openOpp, setOpenOpp] = useState(null)
  const [copied, setCopied] = useState(null)

  if (!strategy?.opportunities?.length) return null

  function copy(text, key) {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  const PURPOSE_COLORS = {
    'engagement bait': 'bg-orange-500/20 text-orange-400 border-orange-500/40',
    'authority building': 'bg-blue-500/20 text-blue-400 border-blue-500/40',
    'controversy play': 'bg-red-500/20 text-red-400 border-red-500/40',
    'aspiration trigger': 'bg-violet-500/20 text-violet-400 border-violet-500/40',
    'fear/urgency play': 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    'default': 'bg-gray-700 text-gray-300 border-gray-600',
  }
  function purposeColor(p) {
    const key = (p || '').toLowerCase()
    return PURPOSE_COLORS[key] || PURPOSE_COLORS.default
  }

  return (
    <div className="mb-6 bg-violet-950/30 border border-violet-500/30 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-violet-500/20">
        <div className="flex items-center gap-2">
          <span className="text-lg">🧠</span>
          <h3 className="text-base font-bold text-violet-300">AI Publishing Plan</h3>
          <span className="text-xs text-violet-500 font-medium bg-violet-500/10 border border-violet-500/30 rounded-full px-2.5 py-0.5">
            {strategy.opportunities.length} opportunities
          </span>
        </div>
        {strategy.cluster_theme && (
          <p className="text-sm text-violet-400/80 mt-1">{strategy.cluster_theme}</p>
        )}
      </div>
      <div className="p-4 space-y-3">
        {strategy.opportunities.map((opp, oi) => (
          <div key={oi} className="bg-gray-900/80 border border-gray-700 rounded-xl overflow-hidden">
            <button onClick={() => setOpenOpp(openOpp === oi ? null : oi)}
              className="w-full flex items-start justify-between gap-3 px-4 py-3 text-left hover:bg-gray-800/50 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${purposeColor(opp.purpose)}`}>{opp.purpose}</span>
                  <span className="text-xs text-gray-500">{opp.emotional_lever}</span>
                </div>
                <p className="text-sm font-semibold text-gray-100 line-clamp-1">{opp.angle}</p>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                className={`text-gray-500 shrink-0 mt-1 transition-transform ${openOpp === oi ? 'rotate-180' : ''}`}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {openOpp === oi && opp.moves?.length > 0 && (
              <div className="border-t border-gray-700/60 px-4 py-3 space-y-4">
                {opp.moves.map((move, mi) => (
                  <div key={mi} className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-orange-400 bg-orange-500/10 border border-orange-500/30 rounded-full px-2.5 py-0.5">Option {mi + 1}</span>
                      {move.format && <span className="text-xs text-gray-500 bg-gray-800 border border-gray-700 rounded-full px-2.5 py-0.5">{move.format}</span>}
                      {move.link_strategy && <span className="text-xs text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2.5 py-0.5">{move.link_strategy}</span>}
                    </div>
                    {move.headline && (
                      <div className="bg-black/30 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-500 font-medium">Headline</span>
                          <button onClick={() => copy(move.headline, `h-${oi}-${mi}`)}
                            className="text-gray-600 hover:text-gray-300 transition-colors">
                            {copied === `h-${oi}-${mi}` ? Icons.check : Icons.copy}
                          </button>
                        </div>
                        <p className="text-sm font-semibold text-gray-100">{move.headline}</p>
                      </div>
                    )}
                    {move.body && (
                      <div className="bg-black/30 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-500 font-medium">Body</span>
                          <button onClick={() => copy(move.body, `b-${oi}-${mi}`)}
                            className="text-gray-600 hover:text-gray-300 transition-colors">
                            {copied === `b-${oi}-${mi}` ? Icons.check : Icons.copy}
                          </button>
                        </div>
                        <p className="text-sm text-gray-300 whitespace-pre-line">{move.body}</p>
                      </div>
                    )}
                    {move.visual_direction && (
                      <p className="text-xs text-indigo-400"><span className="font-medium">Visual:</span> {move.visual_direction}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Post Card ───
function PostCard({ post, postStrategy }) {
  const p = PLATFORMS[post.platform] || PLATFORMS.facebook
  const labels = post.metric_labels || { m1: 'Reactions', m2: 'Comments', m3: 'Shares' }
  const metrics = post.metrics || { reactions: post.reactions, comments: post.comments, shares: post.shares }
  const m1Val = Object.values(metrics)[0] || 0
  const m2Val = Object.values(metrics)[1] || 0
  const m3Val = Object.values(metrics)[2] || 0

  const isEarlyRiser = (post.tags || []).includes('early_riser')
  return (
    <div className={`border rounded-2xl p-5 transition-all ${isEarlyRiser ? 'bg-amber-950/30 border-amber-500/60 ring-1 ring-amber-500/20' : 'bg-gray-900 border-gray-700'}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <span className="text-base shrink-0">{p.icon}</span>
          <span className="text-sm font-bold uppercase tracking-wider text-orange-400">{post.page_name || 'Unknown'}</span>
          {post.posted_at && <span className="text-xs text-gray-500">{timeAgo(post.posted_at)}</span>}
          {post.age_hours && <span className="text-xs text-gray-600">({post.age_hours}h old)</span>}
          {post.post_type && <span className="text-xs text-gray-400 bg-gray-800 border border-gray-700 rounded-full px-2 py-0.5">{post.post_type}</span>}
          {isEarlyRiser && <span className="text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/50 rounded-full px-2.5 py-0.5">🔥 Early Riser</span>}
          {(post.tags || []).includes('viral') && <span className="text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/50 rounded-full px-2.5 py-0.5">⚡ Viral</span>}
          {(post.tags || []).includes('accelerating') && <span className="text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/50 rounded-full px-2.5 py-0.5">📈 Accelerating</span>}
        </div>
        {post.post_url && (
          <a href={post.post_url} target="_blank" rel="noopener noreferrer"
            className="shrink-0 text-gray-600 hover:text-orange-400 transition-colors">
            {Icons.link}
          </a>
        )}
      </div>

      {post.content_preview && (
        <p className="text-base text-gray-200 mb-3 line-clamp-3 leading-relaxed">{post.content_preview}</p>
      )}

      {post.image_url && (
        <div className="mb-3 rounded-xl overflow-hidden bg-gray-800 border border-gray-700">
          <img src={post.image_url} alt="" className="w-full max-h-72 object-cover" loading="lazy" onError={(e) => { e.currentTarget.parentElement.style.display = 'none' }} />
        </div>
      )}

      {post.reason && (
        <div className="mb-3 bg-orange-500/10 border border-orange-500/30 rounded-xl px-4 py-2.5">
          <p className="text-xs leading-relaxed text-orange-300">
            <span className="font-semibold text-orange-400">⚡ Why this post:</span> {post.reason}
          </p>
        </div>
      )}

      {post.relevance_score != null && (
        <div className={`mb-3 rounded-xl px-4 py-2.5 border ${post.relevance_score >= 6 ? 'bg-emerald-500/10 border-emerald-500/30' : post.relevance_score >= 4 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-sm font-bold ${post.relevance_score >= 6 ? 'text-emerald-400' : post.relevance_score >= 4 ? 'text-amber-400' : 'text-red-400'}`}>
              {post.relevance_score >= 8 ? '🎯' : post.relevance_score >= 6 ? '✓' : post.relevance_score >= 4 ? '~' : '✗'} {post.relevance_score}/10
            </span>
            <span className={`text-xs ${post.relevance_score >= 6 ? 'text-emerald-400' : post.relevance_score >= 4 ? 'text-amber-400' : 'text-red-400'}`}>{post.relevance_reason}</span>
          </div>
          {post.relevance_angle && <p className="text-xs text-indigo-400 font-medium">💡 Angle: {post.relevance_angle}</p>}
        </div>
      )}

      <div className="flex items-center gap-5 text-sm flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-gray-500 text-xs">Total</span>
          <span className="font-bold text-white text-base">{formatNumber(post.total_interactions)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-gray-500 text-xs">Velocity</span>
          <span className="font-bold text-orange-400 text-base">{post.velocity?.toFixed(0) || '—'}/hr</span>
        </div>
        {post.delta != null && (
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 text-xs">Delta</span>
            <span className="font-bold text-orange-400">+{post.delta}</span>
          </div>
        )}
        {post.score && (
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 text-xs">Score</span>
            <span className="font-bold text-violet-400">{post.score}</span>
          </div>
        )}
        <div className="flex items-center gap-3 ml-auto text-gray-600 text-xs">
          <span>{labels.m1} {formatNumber(m1Val)}</span>
          <span>{labels.m2} {formatNumber(m2Val)}</span>
          <span>{labels.m3} {formatNumber(m3Val)}</span>
        </div>
      </div>

      {postStrategy?.strategy && <StrategyPanel strategy={postStrategy.strategy} />}
    </div>
  )
}

// ─── Group Post Card ───
function GroupPostCard({ post }) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">👥</span>
          <span className="text-sm font-bold uppercase tracking-wide text-orange-400">{post.page_name}</span>
          {post.age_hours != null && <span className="text-xs text-gray-500">({post.age_hours}h old)</span>}
        </div>
        {post.post_url && (
          <a href={post.post_url} target="_blank" rel="noopener noreferrer"
            className="text-gray-600 hover:text-blue-400 transition-colors">
            {Icons.link}
          </a>
        )}
      </div>
      <p className="text-gray-200 text-base leading-relaxed mb-3">{post.content_preview}</p>

      {post.image_url && (
        <div className="mb-3 rounded-xl overflow-hidden bg-gray-800 border border-gray-700">
          <img src={post.image_url} alt="" className="w-full max-h-72 object-cover" loading="lazy" onError={(e) => { e.currentTarget.parentElement.style.display = 'none' }} />
        </div>
      )}

      {post.reason && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl px-4 py-3 mb-3">
          <p className="text-sm text-blue-300"><span className="font-semibold">📝 Why this post:</span> {post.reason}</p>
        </div>
      )}
      <div className="flex items-center justify-between text-sm">
        <div className="flex gap-3">
          <span className="text-gray-500">💬 <strong className="text-blue-400">{post.comments}</strong></span>
          <span className="text-gray-500">👍 <strong className="text-blue-400">{post.reactions}</strong></span>
          <span className="text-gray-500">↗ {post.shares}</span>
        </div>
        <span className="text-xs text-gray-500">Total <span className="font-bold text-white text-base">{formatNumber(post.total_interactions)}</span></span>
      </div>
    </div>
  )
}

// ─── Main Share Page ───
export default function SharePage() {
  const { token } = useParams()
  const [shareData, setShareData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!token) return
    fetch(`/api/share/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); setLoading(false); return }
        setShareData(data)
        setLoading(false)
      })
      .catch(() => { setError('Failed to load share'); setLoading(false) })
  }, [token])

  function copyLink() {
    navigator.clipboard.writeText(window.location.href).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center mx-auto mb-4 text-3xl">🔍</div>
          <h1 className="text-xl font-bold text-white mb-2">Share Not Found</h1>
          <p className="text-gray-400 mb-6">This share link may have expired or been removed.</p>
          <a href="/" className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-colors">
            Go to Rising Posts
          </a>
        </div>
      </div>
    )
  }

  const posts = shareData?.posts || []
  const batchStrategy = shareData?.batch_strategy
  const postStrategies = shareData?.post_strategies || {}
  const meta = shareData?.scan_meta || {}
  const isGroupScan = meta.scan_type === 'groups'

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center text-white shrink-0">
              {Icons.trending}
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-white truncate">{shareData?.title || 'Scan Results'}</h1>
              {shareData?.created_at && (
                <p className="text-xs text-gray-500">{formatDate(shareData.created_at)}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={copyLink}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium border border-gray-700 bg-gray-800 text-gray-300 hover:text-white hover:border-gray-600 transition-all">
              {copied ? Icons.check : Icons.copy}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
            <a href="/"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white transition-colors">
              Try Rising Posts
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6">
        {/* Login banner */}
        <div className="mb-6 bg-gray-900 border border-gray-700 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-gray-500 shrink-0">{Icons.lock}</span>
            <div>
              <p className="text-sm font-medium text-gray-200">This is a read-only share.</p>
              <p className="text-xs text-gray-500 mt-0.5">Sign in to run your own scans, track rising posts, and generate AI strategies.</p>
            </div>
          </div>
          <a href="/"
            className="shrink-0 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-xl transition-colors">
            Sign In
          </a>
        </div>

        {/* Scan metadata */}
        {(meta.time_window || meta.total_scraped > 0 || posts.length > 0) && (
          <div className="flex flex-wrap gap-2 mb-5">
            {meta.time_window && (
              <span className="text-xs text-gray-400 bg-gray-800 border border-gray-700 rounded-full px-3 py-1">
                🕐 {meta.time_window}h window
              </span>
            )}
            {meta.total_scraped > 0 && (
              <span className="text-xs text-gray-400 bg-gray-800 border border-gray-700 rounded-full px-3 py-1">
                {meta.total_scraped} scraped
              </span>
            )}
            <span className="text-xs text-orange-400 bg-orange-500/10 border border-orange-500/30 rounded-full px-3 py-1 font-medium">
              {posts.length} {isGroupScan ? 'high-engagement' : 'rising'} posts
            </span>
            {meta.cost_usd != null && (
              <span className="text-xs text-gray-400 bg-gray-800 border border-gray-700 rounded-full px-3 py-1">
                ${Number(meta.cost_usd).toFixed(4)} scan cost
              </span>
            )}
          </div>
        )}

        {/* Batch strategy (AI publishing plan) */}
        {batchStrategy && <BatchStrategyPanel strategy={batchStrategy} />}

        {/* Posts */}
        {posts.length === 0 ? (
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-10 text-center">
            <p className="text-gray-500">No posts in this share.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post, i) => (
              isGroupScan
                ? <GroupPostCard key={post.post_id || i} post={post} />
                : <PostCard key={post.post_id || i} post={post} postStrategy={postStrategies[post.post_id]} />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-10 pt-6 border-t border-gray-800 text-center">
          <p className="text-sm text-gray-500 mb-3">Want to find rising posts for your own pages?</p>
          <a href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white text-sm font-semibold rounded-xl shadow-sm transition-all">
            {Icons.trending} Try Rising Posts Free
          </a>
        </div>
      </div>
    </div>
  )
}
