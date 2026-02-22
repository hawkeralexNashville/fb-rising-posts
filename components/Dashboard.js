'use client'
import { useState, useEffect, useRef } from 'react'
import Account from './Account'
import Admin from './Admin'

// ─── Platform Config ───
const PLATFORMS = {
  facebook: { label: 'Facebook', color: 'text-blue-600 bg-blue-50 border-blue-200', icon: '📘', placeholder: 'Page URL, Group URL, or just PageName', urlPrefix: 'https://www.facebook.com/' },
  x: { label: 'X / Twitter', color: 'text-slate-800 bg-slate-100 border-slate-300', icon: '𝕏', placeholder: '@username or https://x.com/username', urlPrefix: 'https://x.com/' },
  reddit: { label: 'Reddit', color: 'text-orange-600 bg-orange-50 border-orange-200', icon: '🔴', placeholder: 'r/subreddit or https://reddit.com/r/subreddit', urlPrefix: 'https://www.reddit.com/r/' },
}

// ─── Category Filters ───
const CATEGORIES = {
  none: { label: 'No Filter', icon: '—', keywords: [] },
  finance: { label: 'Finance & Economics', icon: '💰', keywords: [
    'stock', 'market', 'wall street', 's&p', 'dow', 'nasdaq', 'nyse', 'earning', 'revenue', 'profit', 'gdp',
    'inflation', 'recession', 'interest rate', 'fed ', 'federal reserve', 'central bank', 'treasury', 'bond',
    'yield', 'ipo', 'invest', 'dividend', 'portfolio', 'bull ', 'bear ', 'trading', 'hedge fund', 'mutual fund',
    'etf', 'commodity', 'oil price', 'gold price', 'crypto', 'bitcoin', 'banking', 'jpmorgan', 'goldman',
    'fiscal', 'monetary', 'tariff', 'trade war', 'debt ceiling', 'deficit', 'surplus', 'unemploy', 'jobs report',
    'payroll', 'cpi', 'housing market', 'mortgage', 'credit', 'loan', 'currency', 'forex', 'dollar', 'euro',
    'yen', 'financi', 'econom', 'wall st', 'quarter', 'revenue', 'shareholder', 'valuation', 'startup fund',
    'venture capital', 'private equity', 'wealth', 'pension', 'retail investor', 'sec ', 'securities',
    'dow jones', 'rate cut', 'rate hike', 'quantitative', 'stimulus', 'bailout', 'default', 'credit rating',
    'moody', 'fitch', 'bank of america', 'citigroup', 'wells fargo', 'morgan stanley', 'blackrock',
  ]},
  politics: { label: 'Politics & Policy', icon: '🏛️', keywords: [
    'president', 'congress', 'senate', 'house of rep', 'white house', 'legislation', 'bill sign', 'executive order',
    'election', 'vote', 'campaign', 'democrat', 'republican', 'gop', 'bipartisan', 'impeach', 'supreme court',
    'governor', 'mayor', 'policy', 'regulat', 'sanction', 'foreign policy', 'nato', ' un ', 'diplomacy',
    'immigra', 'border', 'abortion', 'gun control', 'amendment', 'federal government', 'state government',
    'political', 'party', 'cabinet', 'attorney general', 'speaker of', 'filibuster', 'veto', 'partisan',
    'primary', 'ballot', 'swing state', 'electoral', 'lobby', 'caucus', 'geopolit',
  ]},
  tech: { label: 'Tech & AI', icon: '🤖', keywords: [
    ' ai ', 'artificial intelligence', 'chatgpt', 'openai', 'google', 'apple', 'microsoft', 'amazon', 'meta',
    'tesla', 'nvidia', 'startup', 'silicon valley', 'software', ' app ', 'data breach', 'cybersecur', 'robot',
    'automat', 'machine learning', 'chip', 'semiconductor', 'cloud computing', 'blockchain', 'tiktok',
    'social media', 'streaming', 'tech layoff', 'algorithm', 'quantum', 'virtual reality', 'augmented reality',
    'saas', 'platform', 'developer', 'open source', 'neural', 'deep learning', 'large language model', 'llm',
  ]},
  entertainment: { label: 'Entertainment', icon: '🎬', keywords: [
    'movie', 'film', 'tv show', 'series', 'netflix', 'actor', 'actress', 'celebrity', 'grammy', 'oscar', 'emmy',
    'album', 'concert', 'tour', 'box office', 'hollywood', 'music', 'singer', 'rapper', 'viral', 'reality tv',
    'podcast', 'disney', 'hulu', 'hbo', 'broadway', 'comedian', 'stand-up', 'award', 'premiere', 'sequel',
    'soundtrack', 'entertain', 'perform', 'ticket', 'festival',
  ]},
  sports: { label: 'Sports', icon: '🏈', keywords: [
    'nfl', 'nba', 'mlb', 'nhl', 'super bowl', 'world series', 'playoff', 'championship', 'coach', 'draft',
    'trade', 'free agent', 'touchdown', 'home run', 'goal', ' mvp', 'injury', 'roster', 'stadium', 'ncaa',
    'college football', 'march madness', 'quarterback', 'pitcher', 'soccer', 'premier league', 'champions league',
    'tennis', 'golf', 'olympic', 'ufc', 'boxing', 'athlete', 'season', 'game day', 'halftime',
  ]},
  crime: { label: 'Crime & Justice', icon: '⚖️', keywords: [
    'arrest', 'charged', 'convicted', 'sentenced', 'murder', 'shooting', 'robbery', 'fraud', 'lawsuit', 'trial',
    'jury', 'verdict', 'prison', 'indictment', ' fbi', ' doj', 'police', 'investigation', 'crime', 'homicide',
    'suspect', 'victim', 'felony', 'misdemeanor', 'parole', 'prosecutor', 'defense attorney', 'witness',
    'manslaughter', 'assault', 'trafficking', 'cartel', 'organized crime',
  ]},
  health: { label: 'Health & Science', icon: '🧬', keywords: [
    'vaccine', 'pandemic', 'disease', ' fda', ' cdc', 'study finds', 'clinical trial', 'cancer', 'treatment',
    'drug', 'pharmaceut', 'hospital', 'doctor', 'mental health', 'outbreak', 'virus', 'surgery', 'diagnosis',
    'research', 'health', 'medical', 'patient', 'therapy', 'symptom', 'prescription', 'biotech', 'gene',
    'stem cell', 'public health', 'wellness', 'nutrition', 'obesity', 'diabetes',
  ]},
}

function postMatchesCategory(post, categoryKey) {
  if (!categoryKey || categoryKey === 'none') return true
  const cat = CATEGORIES[categoryKey]
  if (!cat || cat.keywords.length === 0) return true
  const text = ((post.content_preview || '') + ' ' + (post.page_name || '')).toLowerCase()
  return cat.keywords.some(kw => text.includes(kw.trim()))
}

// ─── Icons ───
const Icons = {
  plus: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  trash: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>,
  scan: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
  trending: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>,
  stream: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>,
  link: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>,
  zap: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>,
  clock: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
  filter: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>,
  folder: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></svg>,
  user: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
  dollar: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>,
  globe: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg>,
}

const SCANNING_MESSAGES = [
  '🔍 Scanning the internet for your next viral jackpot…',
  '🧠 Teaching the algorithm what "blow up" really means…',
  '🚀 Searching for posts that are about to explode…',
  '💰 Hunting down your next money-maker…',
  '👀 Watching what\'s trending before everyone else does…',
  '📈 Separating future legends from forgotten posts…',
  '🕵️‍♂️ Stalking the algorithm so you don\'t have to…',
  '🔥 Looking for content that\'s already on fire…',
  '🧲 Pulling high-engagement posts out of the noise…',
  '🎯 Locking onto the content that\'s about to take off…',
]

function ScanningAnimation() {
  const [index, setIndex] = useState(0)
  const [fade, setFade] = useState(true)
  useEffect(() => { setIndex(Math.floor(Math.random() * SCANNING_MESSAGES.length)) }, [])
  useEffect(() => {
    const interval = setInterval(() => { setFade(false); setTimeout(() => { setIndex((prev) => (prev + 1) % SCANNING_MESSAGES.length); setFade(true) }, 300) }, 3000)
    return () => clearInterval(interval)
  }, [])
  return (
    <div className="my-8 flex flex-col items-center gap-5">
      <div className="w-full max-w-sm h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-orange-400 via-rose-400 to-orange-400 rounded-full animate-scanning-bar" /></div>
      <p className="text-base font-medium text-slate-500 text-center transition-all duration-300 min-h-[28px]" style={{ opacity: fade ? 1 : 0, transform: fade ? 'translateY(0)' : 'translateY(8px)' }}>{SCANNING_MESSAGES[index]}</p>
    </div>
  )
}

const TIME_OPTIONS = [
  { value: 0.5, label: 'Last 30 minutes' },
  { value: 1, label: 'Last 1 hour' },
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

function timeAgo(dateStr) { if (!dateStr) return ''; const diff = (Date.now() - new Date(dateStr).getTime()) / 1000; if (diff < 60) return 'just now'; if (diff < 3600) return `${Math.floor(diff / 60)}m ago`; if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`; return `${Math.floor(diff / 86400)}d ago` }
function formatNumber(n) { if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'; if (n >= 1000) return (n / 1000).toFixed(1) + 'K'; return n?.toString() || '0' }
function formatDate(dateStr) { const d = new Date(dateStr); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) }
const selectStyle = { backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }

// ─── Platform Tabs ───
function PlatformTabs({ selected, onChange }) {
  return (
    <div className="flex gap-2 mb-5">
      {Object.entries(PLATFORMS).map(([key, p]) => (
        <button key={key} onClick={() => onChange(key)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${selected === key ? p.color + ' shadow-sm' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300'}`}>
          <span className="text-base">{p.icon}</span> {p.label}
        </button>
      ))}
    </div>
  )
}

// ─── Scan Controls ───
function ScanControls({ timeWindow, setTimeWindow, minInteractions, setMinInteractions, maxInteractions, setMaxInteractions, onScan, isScanning, disabled, onStop }) {
  const btnClass = isScanning ? 'bg-orange-100 text-orange-500 border border-orange-200 cursor-not-allowed animate-pulse-glow' : disabled ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white shadow-sm shadow-orange-500/20 hover:shadow-md'
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">{Icons.clock} Time Window</label>
          <select value={timeWindow} onChange={(e) => setTimeWindow(parseFloat(e.target.value))} className="px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 appearance-none cursor-pointer pr-10" style={selectStyle}>{TIME_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select>
        </div>
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">{Icons.filter} Min Interactions</label>
          <input type="number" min="0" value={minInteractions} onChange={(e) => setMinInteractions(parseInt(e.target.value) || 0)} className="w-32 px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20" />
        </div>
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">{Icons.filter} Max Interactions</label>
          <select value={maxInteractions} onChange={(e) => setMaxInteractions(parseInt(e.target.value))} className="px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 appearance-none cursor-pointer pr-10" style={selectStyle}>{MAX_INTERACTION_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select>
        </div>
        <button onClick={onScan} disabled={isScanning || disabled} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${btnClass}`}>{Icons.scan}{isScanning ? 'Scanning...' : 'Scan Now'}</button>
        {isScanning && onStop && (
          <button onClick={onStop} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 transition-all">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
            Stop
          </button>
        )}
      </div>
      <p className="text-xs text-slate-400">Shorter time windows pull fewer posts per page, reducing Apify costs.</p>
    </div>
  )
}

// ─── Rising Posts List ───
function RisingPostsList({ posts }) {
  if (!posts || posts.length === 0) return null
  return (
    <div className="space-y-3">
      {posts.map((post, i) => {
        const p = PLATFORMS[post.platform] || PLATFORMS.facebook
        const labels = post.metric_labels || { m1: 'Reactions', m2: 'Comments', m3: 'Shares' }
        const metrics = post.metrics || { reactions: post.reactions, comments: post.comments, shares: post.shares }
        const m1Val = Object.values(metrics)[0] || 0
        const m2Val = Object.values(metrics)[1] || 0
        const m3Val = Object.values(metrics)[2] || 0
        return (
          <div key={post.post_id || i} className="bg-white border border-slate-200 rounded-2xl p-5 animate-slide-up hover:border-slate-300 transition-colors" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base shrink-0" title={p.label}>{p.icon}</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{post.page_name || 'Unknown'}</span>
                {post.posted_at && <span className="text-xs text-slate-400">{timeAgo(post.posted_at)}</span>}
                {post.age_hours && <span className="text-xs text-slate-300">({post.age_hours}h old)</span>}
              </div>
              {post.post_url && <a href={post.post_url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-slate-400 hover:text-orange-500 transition-colors">{Icons.link}</a>}
            </div>
            {post.content_preview && <p className="text-base text-slate-700 mb-3 line-clamp-3 leading-relaxed">{post.content_preview}</p>}
            {post.reason && (
              <div className="mb-3 bg-orange-50 border border-orange-100 rounded-xl px-4 py-2.5">
                <p className="text-xs leading-relaxed text-orange-700"><span className="font-semibold text-orange-600">⚡ Why this post:</span> {post.reason}</p>
              </div>
            )}
            <div className="flex items-center gap-5 text-sm">
              <div className="flex items-center gap-1.5"><span className="text-slate-400">Total</span><span className="font-semibold text-slate-800">{formatNumber(post.total_interactions)}</span></div>
              <div className="flex items-center gap-1.5"><span className="text-slate-400">Velocity</span><span className="font-semibold text-orange-500">{post.velocity?.toFixed(0) || '—'}/hr</span></div>
              {post.delta !== null && post.delta !== undefined && <div className="flex items-center gap-1.5"><span className="text-slate-400">Delta</span><span className="font-semibold text-orange-500">+{post.delta}</span></div>}
              <div className="flex items-center gap-3 ml-auto text-slate-400 text-xs">
                <span>{labels.m1} {formatNumber(m1Val)}</span>
                <span>{labels.m2} {formatNumber(m2Val)}</span>
                <span>{labels.m3} {formatNumber(m3Val)}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Scan Summary ───
function ScanSummary({ status, message, postCount, totalScraped, filteredOut, costUsd }) {
  if (!message) return null
  return (
    <div className="mb-5">
      <p className={`text-sm ${status === 'error' ? 'text-red-500' : status === 'done' ? 'text-slate-500' : 'text-orange-500'}`}>{message}</p>
      {status === 'done' && totalScraped > 0 && (
        <div className="flex items-center gap-3 mt-1">
          <p className="text-xs text-slate-400">{totalScraped} scraped → {filteredOut} filtered → {postCount} rising</p>
          {costUsd !== null && costUsd !== undefined && (
            <span className="inline-flex items-center gap-1 text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-0.5">
              {Icons.dollar} ${costUsd.toFixed(4)}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Dashboard ───
export default function Dashboard({ supabase, session }) {
  const [view, setView] = useState('quick')
  const [streams, setStreams] = useState([])
  const [selectedStreamId, setSelectedStreamId] = useState(null)
  const [pages, setPages] = useState([])
  const [newStreamName, setNewStreamName] = useState('')
  const [newPageUrl, setNewPageUrl] = useState('')
  const [newPageName, setNewPageName] = useState('')
  const [newPagePlatform, setNewPagePlatform] = useState('facebook')
  const [showAddStream, setShowAddStream] = useState(false)
  const [showPages, setShowPages] = useState(false)
  const [showAddPage, setShowAddPage] = useState(false)
  const [categoryFilterOn, setCategoryFilterOn] = useState(false)
  const [timeWindow, setTimeWindow] = useState(6)
  const [minInteractions, setMinInteractions] = useState(50)
  const [maxInteractions, setMaxInteractions] = useState(0)
  const [scanStatus, setScanStatus] = useState('idle')
  const [scanMessage, setScanMessage] = useState('')
  const [risingPosts, setRisingPosts] = useState([])
  const [scanStats, setScanStats] = useState({ totalScraped: 0, filteredOut: 0, costUsd: null })
  const [quickUrl, setQuickUrl] = useState('')
  const [quickPlatform, setQuickPlatform] = useState('facebook')
  const [quickScanStatus, setQuickScanStatus] = useState('idle')
  const [quickScanMessage, setQuickScanMessage] = useState('')
  const [quickRisingPosts, setQuickRisingPosts] = useState([])
  const [quickScanStats, setQuickScanStats] = useState({ totalScraped: 0, filteredOut: 0, costUsd: null })
  const [savedScans, setSavedScans] = useState([])
  const [selectedSavedScan, setSelectedSavedScan] = useState(null)
  const [settings, setSettings] = useState({ min_velocity: 50, min_delta: 20 })
  const [publicStreams, setPublicStreams] = useState([])
  const [selectedPublicStream, setSelectedPublicStream] = useState(null)
  const [publicPages, setPublicPages] = useState([])
  const [showPublicPages, setShowPublicPages] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [pendingRerun, setPendingRerun] = useState(null)
  // Group Scanner state
  const [groupStreams, setGroupStreams] = useState([])
  const [selectedGroupStreamId, setSelectedGroupStreamId] = useState(null)
  const [groupPages, setGroupPages] = useState([])
  const [newGroupStreamName, setNewGroupStreamName] = useState('')
  const [newGroupPageUrl, setNewGroupPageUrl] = useState('')
  const [newGroupPageName, setNewGroupPageName] = useState('')
  const [showAddGroupStream, setShowAddGroupStream] = useState(false)
  const [showGroupPages, setShowGroupPages] = useState(false)
  const [showAddGroupPage, setShowAddGroupPage] = useState(false)
  const [groupTimeWindow, setGroupTimeWindow] = useState(24)
  const [groupMinComments, setGroupMinComments] = useState(50)
  const [groupMinReactions, setGroupMinReactions] = useState(10)
  const [groupScanStatus, setGroupScanStatus] = useState('idle')
  const [groupScanMessage, setGroupScanMessage] = useState('')
  const [groupPosts, setGroupPosts] = useState([])
  const [groupScanStats, setGroupScanStats] = useState({ totalScraped: 0, filteredOut: 0, costUsd: null })
  const abortRef = useRef(false)
  const activeScanRef = useRef(null)
  const [bgScanRunning, setBgScanRunning] = useState(null)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)
  const userId = session?.user?.id

  useEffect(() => { if (!userId) return; loadStreams(); loadSettings(); loadSavedScans(); loadPublicStreams(); loadGroupStreams() }, [userId])
  useEffect(() => { if (!selectedStreamId) { setPages([]); setRisingPosts([]); return }; loadPages(selectedStreamId); setShowPages(false); setShowAddPage(false); if (activeScanRef.current) { setBgScanRunning(activeScanRef.current.label); activeScanRef.current = null }; setRisingPosts([]); setScanStatus('idle'); setScanMessage(''); setScanStats({ totalScraped: 0, filteredOut: 0, costUsd: null }); const s = streams.find(st => st.id === selectedStreamId); setCategoryFilterOn(s?.category && s.category !== 'none' ? true : false) }, [selectedStreamId])
  useEffect(() => { if (!selectedGroupStreamId) { setGroupPages([]); setGroupPosts([]); return }; loadGroupPages(selectedGroupStreamId); setShowGroupPages(false); setShowAddGroupPage(false); setGroupPosts([]); setGroupScanStatus('idle'); setGroupScanMessage(''); setGroupScanStats({ totalScraped: 0, filteredOut: 0, costUsd: null }) }, [selectedGroupStreamId])

  useEffect(() => {
    if (pendingRerun && pages.length > 0 && view === 'streams') {
      setPendingRerun(null)
      startStreamScan()
    }
  }, [pendingRerun, pages, view])

  async function loadStreams() { const { data } = await supabase.from('streams').select('*').eq('user_id', userId).or('type.eq.rising,type.is.null').order('created_at', { ascending: true }); setStreams(data || []) }
  async function loadPages(streamId) { const { data } = await supabase.from('monitored_pages').select('*').eq('stream_id', streamId).order('created_at', { ascending: true }); setPages(data || []) }

  // Group stream functions
  async function loadGroupStreams() { const { data } = await supabase.from('streams').select('*').eq('user_id', userId).eq('type', 'groups').order('created_at', { ascending: true }); setGroupStreams(data || []) }
  async function loadGroupPages(streamId) { const { data } = await supabase.from('monitored_pages').select('*').eq('stream_id', streamId).order('created_at', { ascending: true }); setGroupPages(data || []) }
  async function createGroupStream(e) { e.preventDefault(); if (!newGroupStreamName.trim()) return; const { data, error } = await supabase.from('streams').insert({ user_id: userId, name: newGroupStreamName.trim(), type: 'groups' }).select().single(); if (!error && data) { setGroupStreams([...groupStreams, data]); setSelectedGroupStreamId(data.id); setNewGroupStreamName(''); setShowAddGroupStream(false); setView('groups') } }
  async function deleteGroupStream(id) { if (!confirm('Delete this group stream and all its pages?')) return; await supabase.from('streams').delete().eq('id', id); setGroupStreams(groupStreams.filter((s) => s.id !== id)); if (selectedGroupStreamId === id) { const r = groupStreams.filter((s) => s.id !== id); setSelectedGroupStreamId(r.length ? r[0].id : null) } }
  async function addGroupPage(e) {
    e.preventDefault(); if (!newGroupPageUrl.trim()) return
    let url = newGroupPageUrl.trim()
    if (!url.startsWith('http')) url = 'https://www.facebook.com/groups/' + url.replace(/^\/+/, '')
    const existing = groupPages.find(p => p.url.replace(/\/$/, '').toLowerCase() === url.replace(/\/$/, '').toLowerCase())
    if (existing) { showToast(`"${existing.display_name}" is already in this stream.`, 'error'); return }
    const { data, error } = await supabase.from('monitored_pages').insert({ user_id: userId, stream_id: selectedGroupStreamId, url, display_name: newGroupPageName.trim() || url.split('groups/')[1]?.replace(/\/$/, '') || url, platform: 'facebook' }).select().single()
    if (!error && data) { setGroupPages([...groupPages, data]); setNewGroupPageUrl(''); setNewGroupPageName(''); showToast('Group added!') }
    else if (error) { showToast('Failed to add group.', 'error') }
  }
  async function deleteGroupPage(id) { await supabase.from('monitored_pages').delete().eq('id', id); setGroupPages(groupPages.filter((p) => p.id !== id)) }
  async function loadSettings() { const { data } = await supabase.from('user_settings').select('*').eq('user_id', userId).single(); if (data) { setSettings({ min_velocity: data.min_velocity, min_delta: data.min_delta }); if (data.max_post_age_hours) setTimeWindow(data.max_post_age_hours); if (data.is_admin) setIsAdmin(true) } }
  async function loadSavedScans() { const { data } = await supabase.from('saved_scans').select('id, name, stream_id, time_window, min_interactions, max_interactions, total_scraped, rising_count, created_at').order('created_at', { ascending: false }).limit(50); setSavedScans(data || []) }
  async function loadPublicStreams() { const { data } = await supabase.from('streams').select('*').eq('is_public', true).neq('user_id', userId).order('created_at', { ascending: false }); setPublicStreams(data || []) }
  async function toggleStreamPublic(streamId, isPublic) {
    const displayName = session?.user?.email?.split('@')[0] || 'Anonymous'
    const { error } = await supabase.from('streams').update({ is_public: isPublic, creator_name: isPublic ? displayName : null }).eq('id', streamId)
    if (!error) { setStreams(streams.map(s => s.id === streamId ? { ...s, is_public: isPublic, creator_name: isPublic ? displayName : null } : s)); loadPublicStreams() }
  }
  async function updateStreamCategory(streamId, category) {
    const { error } = await supabase.from('streams').update({ category }).eq('id', streamId)
    if (!error) { setStreams(streams.map(s => s.id === streamId ? { ...s, category } : s)); if (category && category !== 'none') setCategoryFilterOn(true) }
  }
  async function selectPublicStream(stream) {
    if (activeScanRef.current) { setBgScanRunning(activeScanRef.current.label); activeScanRef.current = null }; setSelectedPublicStream(stream); setView('public'); setSelectedStreamId(null); setSelectedSavedScan(null); setShowPublicPages(false)
    const { data } = await supabase.from('monitored_pages').select('*').eq('stream_id', stream.id).order('created_at', { ascending: true })
    setPublicPages(data || [])
  }
  async function clonePublicStream() {
    if (!selectedPublicStream) return
    const { data: newStream, error } = await supabase.from('streams').insert({ user_id: userId, name: selectedPublicStream.name, type: 'rising' }).select().single()
    if (error || !newStream) { showToast('Failed to clone stream.', 'error'); return }
    // Clone all pages
    const pagesToInsert = publicPages.map(p => ({ user_id: userId, stream_id: newStream.id, url: p.url, display_name: p.display_name, platform: p.platform || 'facebook' }))
    for (let i = 0; i < pagesToInsert.length; i += 50) {
      await supabase.from('monitored_pages').insert(pagesToInsert.slice(i, i + 50))
    }
    setStreams([...streams, newStream])
    setSelectedStreamId(newStream.id)
    setView('streams')
    setSelectedPublicStream(null)
    showToast(`Cloned "${newStream.name}" with ${publicPages.length} pages!`)
  }
  async function saveSettings() { const payload = { ...settings, max_post_age_hours: timeWindow, updated_at: new Date().toISOString() }; const { data: existing } = await supabase.from('user_settings').select('id').eq('user_id', userId).single(); if (existing) { await supabase.from('user_settings').update(payload).eq('user_id', userId) } else { await supabase.from('user_settings').insert({ user_id: userId, ...payload }) } }

  async function createStream(e) { e.preventDefault(); if (!newStreamName.trim()) return; const { data, error } = await supabase.from('streams').insert({ user_id: userId, name: newStreamName.trim(), type: 'rising' }).select().single(); if (!error && data) { setStreams([...streams, data]); setSelectedStreamId(data.id); setNewStreamName(''); setShowAddStream(false) } }
  async function deleteStream(id) { if (!confirm('Delete this stream and all its pages?')) return; await supabase.from('streams').delete().eq('id', id); setStreams(streams.filter((s) => s.id !== id)); if (selectedStreamId === id) { const r = streams.filter((s) => s.id !== id); setSelectedStreamId(r.length ? r[0].id : null) } }
  function showToast(msg, type = 'success', duration = 2500) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ msg, type })
    toastTimer.current = setTimeout(() => setToast(null), duration)
  }

  async function addPage(e) {
    e.preventDefault(); if (!newPageUrl.trim()) return
    let url = newPageUrl.trim()
    const plat = newPagePlatform
    if (!url.startsWith('http')) url = PLATFORMS[plat].urlPrefix + url.replace(/^[@r\/]+/, '')
    // Check for duplicates
    const existing = pages.find(p => p.url.replace(/\/$/, '').toLowerCase() === url.replace(/\/$/, '').toLowerCase())
    if (existing) { showToast(`"${existing.display_name}" is already in this stream.`, 'error'); return }
    const { data, error } = await supabase.from('monitored_pages').insert({ user_id: userId, stream_id: selectedStreamId, url, display_name: newPageName.trim() || url.split('.com/')[1]?.replace(/^r\//, '') || url, platform: plat }).select().single()
    if (!error && data) { setPages([...pages, data]); setNewPageUrl(''); setNewPageName(''); showToast('Page added!') }
    else if (error) { showToast('Failed to add page.', 'error') }
  }
  async function deletePage(id) { await supabase.from('monitored_pages').delete().eq('id', id); setPages(pages.filter((p) => p.id !== id)) }

  async function saveScanResults(posts, stats, streamId, source) {
    if (!posts || posts.length === 0) return
    const streamName = streamId ? streams.find(s => s.id === streamId)?.name : null
    const now = new Date()
    const timeLabel = TIME_OPTIONS.find(t => t.value === timeWindow)?.label || `${timeWindow}h`
    const name = `${streamName || source || 'Quick Scan'} — ${timeLabel} — ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
    const { data, error } = await supabase.from('saved_scans').insert({ user_id: userId, stream_id: streamId || null, name, time_window: timeWindow, min_interactions: minInteractions, max_interactions: maxInteractions, total_scraped: stats.totalScraped, rising_count: posts.length, results: posts, cost_usd: stats.costUsd || 0 }).select('id, name, stream_id, time_window, min_interactions, max_interactions, total_scraped, rising_count, created_at').single()
    if (!error && data) { setSavedScans([data, ...savedScans]) }
  }
  async function loadSavedScan(id) { const { data } = await supabase.from('saved_scans').select('*').eq('id', id).single(); if (data) { if (activeScanRef.current) { setBgScanRunning(activeScanRef.current.label); activeScanRef.current = null }; setSelectedSavedScan(data); setView('saved') } }
  async function deleteSavedScan(id) { if (!confirm('Delete this saved scan?')) return; await supabase.from('saved_scans').delete().eq('id', id); setSavedScans(savedScans.filter(s => s.id !== id)); if (selectedSavedScan?.id === id) setSelectedSavedScan(null) }

  async function rerunSavedScan(scan) {
    // Apply the saved scan's filter settings
    setTimeWindow(scan.time_window || 24)
    setMinInteractions(scan.min_interactions || 0)
    setMaxInteractions(scan.max_interactions || 0)

    // If it has a stream_id, switch to that stream and scan
    if (scan.stream_id) {
      const stream = streams.find(s => s.id === scan.stream_id)
      if (stream) {
        setView('streams')
        setSelectedStreamId(scan.stream_id)
        setSelectedSavedScan(null)
        setPendingRerun(scan.stream_id)
        return
      }
    }

    // Otherwise, extract unique page URLs from results
    const results = scan.results || []
    const urls = [...new Set(results.map(r => r.page_url).filter(Boolean))]
    if (urls.length === 0 && results.length > 0) {
      // Try to extract from post URLs
      const postUrls = [...new Set(results.map(r => r.post_url).filter(Boolean))]
      if (postUrls.length > 0) urls.push(postUrls[0])
    }

    if (urls.length === 0) {
      alert('Cannot determine the original scan URLs from this saved scan.')
      return
    }

    // Determine platform from results
    const platform = results[0]?.platform || 'facebook'

    // Switch to quick scan and run
    setView('quick')
    setSelectedSavedScan(null)
    setQuickPlatform(platform)
    setQuickUrl(urls[0])

    // Run the scan
    await runScan(urls, null, platform, setQuickScanStatus, setQuickScanMessage, setQuickRisingPosts, setQuickScanStats, scan.name)
  }

  // ─── Scan logic ───
  function stopScan() {
    abortRef.current = true
  }

  async function runScan(pageUrls, streamId, platform, setStatus, setMessage, setResults, setStats, source) {
    abortRef.current = false
    const scanId = Date.now()
    const scanLabel = source || streams.find(s => s.id === streamId)?.name || 'Quick Scan'
    activeScanRef.current = { id: scanId, label: scanLabel }
    const fg = () => activeScanRef.current?.id === scanId

    const token = session?.access_token
    setStatus('starting'); setMessage('Starting scan...'); setResults([]); setStats({ totalScraped: 0, filteredOut: 0, costUsd: null })
    try {
      const startRes = await fetch('/api/scan/start', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ pageUrls, streamId, timeWindowHours: timeWindow, platform }) })
      if (!startRes.ok) { let errBody; try { errBody = await startRes.json() } catch { errBody = {} }; throw new Error(errBody?.userMessage || errBody?.error || 'Failed to start scan') }
      const { runId } = await startRes.json()
      if (fg()) { setStatus('scanning'); setMessage('Scanning...') }

      let status = 'RUNNING'
      let costUsd = null
      while (status === 'RUNNING' || status === 'READY') {
        if (abortRef.current && fg()) {
          try { await fetch(`/api/scan/status?runId=${runId}&abort=true`, { headers: { Authorization: `Bearer ${token}` } }) } catch {}
          setStatus('idle'); setMessage('Scan stopped.'); activeScanRef.current = null; return
        }
        await new Promise((r) => setTimeout(r, 5000))
        if (abortRef.current && fg()) { setStatus('idle'); setMessage('Scan stopped.'); activeScanRef.current = null; return }
        const statusRes = await fetch(`/api/scan/status?runId=${runId}`, { headers: { Authorization: `Bearer ${token}` } })
        const statusData = await statusRes.json()
        status = statusData.status
        if (statusData.costUsd) costUsd = statusData.costUsd
        if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') throw new Error(`Scan ${status.toLowerCase()}. Try again.`)
      }

      if (fg()) { setStatus('processing'); setMessage('Analyzing posts...') }
      const maxInt = maxInteractions > 0 ? maxInteractions : 999999999
      const resultsRes = await fetch(`/api/scan/results?runId=${runId}&streamId=${streamId || ''}&platform=${platform}&timeWindowHours=${timeWindow}&minInteractions=${minInteractions}&maxInteractions=${maxInt}`, { headers: { Authorization: `Bearer ${token}` } })
      if (!resultsRes.ok) { const err = await resultsRes.json(); throw new Error(err.error || 'Failed to process results') }

      const { posts, totalScraped, filteredOut, costUsd: finalCost } = await resultsRes.json()
      const cost = finalCost ?? costUsd

      if (fg()) {
        setResults(posts); setStats({ totalScraped, filteredOut, costUsd: cost }); setStatus('done')
        setMessage(posts.length > 0 ? `Found ${posts.length} rising post${posts.length === 1 ? '' : 's'}.` : `No posts meet your current filters.`)
      } else {
        showToast(`${scanLabel} — ${posts.length} rising post${posts.length === 1 ? '' : 's'} found`, 'success', 5000)
        setBgScanRunning(null)
      }
      if (posts.length > 0) saveScanResults(posts, { totalScraped, filteredOut, costUsd: cost }, streamId, source)
      if (fg()) activeScanRef.current = null
    } catch (err) {
      if (fg()) { setStatus('error'); setMessage(err.message); activeScanRef.current = null }
      else { showToast(`${scanLabel} scan failed`, 'error', 5000); setBgScanRunning(null) }
    }
  }

  async function startQuickScan(e) { e?.preventDefault(); if (!quickUrl.trim()) return; let url = quickUrl.trim(); if (!url.startsWith('http')) url = PLATFORMS[quickPlatform].urlPrefix + url.replace(/^[@r\/]+/, ''); await runScan([url], null, quickPlatform, setQuickScanStatus, setQuickScanMessage, setQuickRisingPosts, setQuickScanStats, url) }

  async function startStreamScan() {
    if (pages.length === 0) { setScanMessage('Add some pages first.'); setScanStatus('error'); return }
    const platforms = [...new Set(pages.map(p => p.platform || 'facebook'))]
    if (platforms.length === 1) {
      await runScan(pages.map(p => p.url), selectedStreamId, platforms[0], setScanStatus, setScanMessage, setRisingPosts, setScanStats, null)
    } else {
      const scanId = Date.now()
      const scanLabel = streams.find(s => s.id === selectedStreamId)?.name || 'Stream'
      activeScanRef.current = { id: scanId, label: scanLabel }
      const fg = () => activeScanRef.current?.id === scanId

      setScanStatus('starting'); setScanMessage('Starting multi-platform scan...'); setRisingPosts([]); setScanStats({ totalScraped: 0, filteredOut: 0, costUsd: null })
      let allPosts = []; let totalScraped = 0; let totalFiltered = 0; let totalCost = 0
      try {
        for (const plat of platforms) {
          const platPages = pages.filter(p => (p.platform || 'facebook') === plat)
          if (fg()) setScanMessage(`Scanning ${PLATFORMS[plat].label} pages...`)
          const token = session?.access_token
          const startRes = await fetch('/api/scan/start', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ pageUrls: platPages.map(p => p.url), streamId: selectedStreamId, timeWindowHours: timeWindow, platform: plat }) })
          if (!startRes.ok) { const err = await startRes.json(); throw new Error(err?.userMessage || err?.error || `Failed to start ${plat} scan`) }
          const { runId } = await startRes.json()
          if (fg()) setScanStatus('scanning')
          let status = 'RUNNING'
          while (status === 'RUNNING' || status === 'READY') { await new Promise(r => setTimeout(r, 5000)); const s = await fetch(`/api/scan/status?runId=${runId}`, { headers: { Authorization: `Bearer ${token}` } }); const sd = await s.json(); status = sd.status; if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') throw new Error(`${plat} scan ${status.toLowerCase()}.`) }
          if (fg()) setScanStatus('processing')
          const maxInt = maxInteractions > 0 ? maxInteractions : 999999999
          const resultsRes = await fetch(`/api/scan/results?runId=${runId}&streamId=${selectedStreamId}&platform=${plat}&timeWindowHours=${timeWindow}&minInteractions=${minInteractions}&maxInteractions=${maxInt}`, { headers: { Authorization: `Bearer ${token}` } })
          if (!resultsRes.ok) continue
          const { posts, totalScraped: ts, filteredOut: fo, costUsd } = await resultsRes.json()
          allPosts = [...allPosts, ...posts]; totalScraped += ts; totalFiltered += fo; totalCost += (costUsd || 0)
        }
        allPosts.sort((a, b) => ((b.velocity || 0) + (b.delta || 0) * 2) - ((a.velocity || 0) + (a.delta || 0) * 2))
        if (fg()) {
          setRisingPosts(allPosts); setScanStats({ totalScraped, filteredOut: totalFiltered, costUsd: totalCost || null }); setScanStatus('done')
          setScanMessage(allPosts.length > 0 ? `Found ${allPosts.length} rising post${allPosts.length === 1 ? '' : 's'} across ${platforms.length} platforms.` : `No posts meet your current filters.`)
        } else {
          showToast(`${scanLabel} — ${allPosts.length} rising post${allPosts.length === 1 ? '' : 's'} found`, 'success', 5000)
          setBgScanRunning(null)
        }
        if (allPosts.length > 0) saveScanResults(allPosts, { totalScraped, filteredOut: totalFiltered, costUsd: totalCost }, selectedStreamId, null)
        if (fg()) activeScanRef.current = null
      } catch (err) {
        if (fg()) { setScanStatus('error'); setScanMessage(err.message); activeScanRef.current = null }
        else { showToast(`${scanLabel} scan failed`, 'error', 5000); setBgScanRunning(null) }
      }
    }
  }

  const selectedStream = streams.find((s) => s.id === selectedStreamId)
  const isScanning = ['starting', 'scanning', 'processing'].includes(scanStatus)
  const isQuickScanning = ['starting', 'scanning', 'processing'].includes(quickScanStatus)

  async function startPublicStreamScan() {
    if (publicPages.length === 0) { setScanMessage('This stream has no pages.'); setScanStatus('error'); return }
    const platforms = [...new Set(publicPages.map(p => p.platform || 'facebook'))]
    if (platforms.length === 1) {
      await runScan(publicPages.map(p => p.url), null, platforms[0], setScanStatus, setScanMessage, setRisingPosts, setScanStats, selectedPublicStream?.name)
    } else {
      const scanId = Date.now()
      const scanLabel = selectedPublicStream?.name || 'Public stream'
      activeScanRef.current = { id: scanId, label: scanLabel }
      const fg = () => activeScanRef.current?.id === scanId

      setScanStatus('starting'); setScanMessage('Starting multi-platform scan...'); setRisingPosts([]); setScanStats({ totalScraped: 0, filteredOut: 0, costUsd: null })
      let allPosts = []; let totalScraped = 0; let totalFiltered = 0; let totalCost = 0
      try {
        for (const plat of platforms) {
          const platPages = publicPages.filter(p => (p.platform || 'facebook') === plat)
          if (fg()) setScanMessage(`Scanning ${PLATFORMS[plat].label} pages...`)
          const token = session?.access_token
          const startRes = await fetch('/api/scan/start', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ pageUrls: platPages.map(p => p.url), timeWindowHours: timeWindow, platform: plat }) })
          if (!startRes.ok) { const err = await startRes.json(); throw new Error(err?.userMessage || err?.error || `Failed to start ${plat} scan`) }
          const { runId } = await startRes.json()
          if (fg()) setScanStatus('scanning')
          let status = 'RUNNING'
          while (status === 'RUNNING' || status === 'READY') { await new Promise(r => setTimeout(r, 5000)); const s = await fetch(`/api/scan/status?runId=${runId}`, { headers: { Authorization: `Bearer ${token}` } }); const sd = await s.json(); status = sd.status; if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') throw new Error(`${plat} scan ${status.toLowerCase()}.`) }
          if (fg()) setScanStatus('processing')
          const maxInt = maxInteractions > 0 ? maxInteractions : 999999999
          const resultsRes = await fetch(`/api/scan/results?runId=${runId}&platform=${plat}&timeWindowHours=${timeWindow}&minInteractions=${minInteractions}&maxInteractions=${maxInt}`, { headers: { Authorization: `Bearer ${token}` } })
          if (!resultsRes.ok) continue
          const { posts, totalScraped: ts, filteredOut: fo, costUsd } = await resultsRes.json()
          allPosts = [...allPosts, ...posts]; totalScraped += ts; totalFiltered += fo; totalCost += (costUsd || 0)
        }
        allPosts.sort((a, b) => ((b.velocity || 0) + (b.delta || 0) * 2) - ((a.velocity || 0) + (a.delta || 0) * 2))
        if (fg()) {
          setRisingPosts(allPosts); setScanStats({ totalScraped, filteredOut: totalFiltered, costUsd: totalCost || null }); setScanStatus('done')
          setScanMessage(allPosts.length > 0 ? `Found ${allPosts.length} rising post${allPosts.length === 1 ? '' : 's'}.` : `No posts meet your current filters.`)
        } else {
          showToast(`${scanLabel} — ${allPosts.length} rising post${allPosts.length === 1 ? '' : 's'} found`, 'success', 5000)
          setBgScanRunning(null)
        }
        if (allPosts.length > 0) saveScanResults(allPosts, { totalScraped, filteredOut: totalFiltered, costUsd: totalCost }, null, selectedPublicStream?.name)
        if (fg()) activeScanRef.current = null
      } catch (err) {
        if (fg()) { setScanStatus('error'); setScanMessage(err.message); activeScanRef.current = null }
        else { showToast(`${scanLabel} scan failed`, 'error', 5000); setBgScanRunning(null) }
      }
    }
  }

  // ─── Group Scanner ───
  const isGroupScanning = ['starting', 'scanning', 'processing'].includes(groupScanStatus)

  async function startGroupScan() {
    if (groupPages.length === 0) { setGroupScanMessage('Add some groups first.'); setGroupScanStatus('error'); return }
    abortRef.current = false
    const scanId = Date.now()
    const scanLabel = groupStreams.find(s => s.id === selectedGroupStreamId)?.name || 'Group Scan'
    activeScanRef.current = { id: scanId, label: scanLabel }
    const fg = () => activeScanRef.current?.id === scanId

    const token = session?.access_token
    setGroupScanStatus('starting'); setGroupScanMessage('Starting group scan...'); setGroupPosts([]); setGroupScanStats({ totalScraped: 0, filteredOut: 0, costUsd: null })
    try {
      const startRes = await fetch('/api/scan/start', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ pageUrls: groupPages.map(p => p.url), timeWindowHours: groupTimeWindow, platform: 'facebook', scanType: 'groups' }) })
      if (!startRes.ok) { let errBody; try { errBody = await startRes.json() } catch { errBody = {} }; throw new Error(errBody?.userMessage || errBody?.error || 'Failed to start scan') }
      const { runId } = await startRes.json()
      if (fg()) { setGroupScanStatus('scanning'); setGroupScanMessage('Scanning groups...') }

      let status = 'RUNNING'
      let costUsd = null
      while (status === 'RUNNING' || status === 'READY') {
        if (abortRef.current && fg()) {
          try { await fetch(`/api/scan/status?runId=${runId}&abort=true`, { headers: { Authorization: `Bearer ${token}` } }) } catch {}
          setGroupScanStatus('idle'); setGroupScanMessage('Scan stopped.'); activeScanRef.current = null; return
        }
        await new Promise(r => setTimeout(r, 5000))
        if (abortRef.current && fg()) { setGroupScanStatus('idle'); setGroupScanMessage('Scan stopped.'); activeScanRef.current = null; return }
        const statusRes = await fetch(`/api/scan/status?runId=${runId}`, { headers: { Authorization: `Bearer ${token}` } })
        const statusData = await statusRes.json()
        status = statusData.status
        if (statusData.costUsd) costUsd = statusData.costUsd
        if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') throw new Error(`Scan ${status.toLowerCase()}. Try again.`)
      }

      if (fg()) { setGroupScanStatus('processing'); setGroupScanMessage('Filtering by engagement...') }
      const resultsRes = await fetch(`/api/scan/results/groups?runId=${runId}&timeWindowHours=${groupTimeWindow}&minComments=${groupMinComments}&minReactions=${groupMinReactions}`, { headers: { Authorization: `Bearer ${token}` } })
      if (!resultsRes.ok) { const err = await resultsRes.json(); throw new Error(err.error || 'Failed to process results') }

      const { posts, totalScraped, filteredOut, costUsd: finalCost } = await resultsRes.json()
      const cost = finalCost ?? costUsd

      if (fg()) {
        setGroupPosts(posts); setGroupScanStats({ totalScraped, filteredOut, costUsd: cost }); setGroupScanStatus('done')
        setGroupScanMessage(posts.length > 0 ? `Found ${posts.length} post${posts.length === 1 ? '' : 's'} with high engagement.` : `No posts meet your thresholds.`)
        activeScanRef.current = null
      } else {
        showToast(`${scanLabel} — ${posts.length} group post${posts.length === 1 ? '' : 's'} found`, 'success', 5000)
        setBgScanRunning(null)
      }
      if (posts.length > 0) saveGroupScanResults(posts, { totalScraped, filteredOut, costUsd: cost })
    } catch (err) {
      if (fg()) { setGroupScanStatus('error'); setGroupScanMessage(err.message); activeScanRef.current = null }
      else { showToast(`${scanLabel} scan failed`, 'error', 5000); setBgScanRunning(null) }
    }
  }

  async function saveGroupScanResults(posts, stats) {
    if (!posts || posts.length === 0) return
    const streamName = groupStreams.find(s => s.id === selectedGroupStreamId)?.name
    const now = new Date()
    const GROUP_TIME_OPTIONS = [{ value: 6, label: '6h' }, { value: 12, label: '12h' }, { value: 24, label: '24h' }, { value: 48, label: '48h' }, { value: 72, label: '72h' }]
    const timeLabel = GROUP_TIME_OPTIONS.find(t => t.value === groupTimeWindow)?.label || `${groupTimeWindow}h`
    const name = `${streamName || 'Group Scan'} — ${timeLabel} — ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
    const { data, error } = await supabase.from('saved_scans').insert({ user_id: userId, stream_id: selectedGroupStreamId, name, time_window: groupTimeWindow, min_interactions: groupMinComments, max_interactions: groupMinReactions, total_scraped: stats.totalScraped, rising_count: posts.length, results: posts, cost_usd: stats.costUsd || 0, scan_type: 'groups' }).select('id, name, stream_id, time_window, min_interactions, max_interactions, total_scraped, rising_count, created_at, scan_type').single()
    if (!error && data) { setSavedScans([data, ...savedScans]) }
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg transition-all animate-slide-up ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-slate-800 text-white'}`}>
          {toast.msg}
        </div>
      )}
      {/* ─── Sidebar ─── */}
      <div className="w-72 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0">
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center text-white">{Icons.trending}</div>
            <span className="text-lg font-bold tracking-tight text-slate-900">Rising Posts</span>
          </div>
        </div>

        <div className="p-3 border-b border-slate-100">
          <button onClick={() => { if (activeScanRef.current) { setBgScanRunning(activeScanRef.current.label); activeScanRef.current = null }; setView('quick'); setSelectedStreamId(null); setSelectedSavedScan(null) }}
            className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${view === 'quick' ? 'bg-orange-50 text-orange-600 border border-orange-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>
            {Icons.zap}<span>Quick Scan</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Streams</span>
            <button onClick={() => setShowAddStream(!showAddStream)} className="text-slate-400 hover:text-orange-500 transition-colors">{Icons.plus}</button>
          </div>
          {showAddStream && (
            <form onSubmit={createStream} className="mb-3">
              <input type="text" value={newStreamName} onChange={(e) => setNewStreamName(e.target.value)} placeholder="Stream name..." autoFocus className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-400 mb-2" />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 rounded-lg text-xs font-semibold text-white transition-colors">Create</button>
                <button type="button" onClick={() => { setShowAddStream(false); setNewStreamName('') }} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs text-slate-500 transition-colors">Cancel</button>
              </div>
            </form>
          )}
          {streams.length === 0 && !showAddStream && <p className="text-sm text-slate-400 mt-2">No streams yet.</p>}
          {streams.map((stream) => (
            <div key={stream.id} className={`group flex items-center justify-between px-3 py-2.5 rounded-xl mb-1 cursor-pointer transition-colors ${view === 'streams' && selectedStreamId === stream.id ? 'bg-orange-50 text-orange-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
              onClick={() => { setView('streams'); setSelectedStreamId(stream.id); setSelectedSavedScan(null) }}>
              <div className="flex items-center gap-2.5 min-w-0"><span className="shrink-0">{Icons.stream}</span><span className="text-sm font-medium truncate">{stream.name}</span>{stream.is_public && <span className="shrink-0 text-emerald-400" title="Public">{Icons.globe}</span>}</div>
              <button onClick={(e) => { e.stopPropagation(); deleteStream(stream.id) }} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all">{Icons.trash}</button>
            </div>
          ))}

          {/* Group Scanner */}
          <div className="flex items-center justify-between mb-2 mt-6">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">Group Scanner</span>
            <button onClick={() => setShowAddGroupStream(!showAddGroupStream)} className="text-slate-400 hover:text-blue-500 transition-colors">{Icons.plus}</button>
          </div>
          {showAddGroupStream && (
            <form onSubmit={createGroupStream} className="mb-3">
              <input type="text" value={newGroupStreamName} onChange={(e) => setNewGroupStreamName(e.target.value)} placeholder="Group stream name..." autoFocus className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400 mb-2" />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 rounded-lg text-xs font-semibold text-white transition-colors">Create</button>
                <button type="button" onClick={() => { setShowAddGroupStream(false); setNewGroupStreamName('') }} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs text-slate-500 transition-colors">Cancel</button>
              </div>
            </form>
          )}
          {groupStreams.length === 0 && !showAddGroupStream && <p className="text-sm text-slate-400 mt-1">No group streams yet.</p>}
          {groupStreams.map((stream) => (
            <div key={stream.id} className={`group flex items-center justify-between px-3 py-2.5 rounded-xl mb-1 cursor-pointer transition-colors ${view === 'groups' && selectedGroupStreamId === stream.id ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
              onClick={() => { setView('groups'); setSelectedGroupStreamId(stream.id); setSelectedStreamId(null); setSelectedSavedScan(null) }}>
              <div className="flex items-center gap-2.5 min-w-0"><span className="shrink-0">👥</span><span className="text-sm font-medium truncate">{stream.name}</span></div>
              <button onClick={(e) => { e.stopPropagation(); deleteGroupStream(stream.id) }} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all">{Icons.trash}</button>
            </div>
          ))}

          {savedScans.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-2 mt-6"><span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Saved Scans</span></div>
              {savedScans.map((scan) => (
                <div key={scan.id} className={`group flex items-center justify-between px-3 py-2.5 rounded-xl mb-1 cursor-pointer transition-colors ${view === 'saved' && selectedSavedScan?.id === scan.id ? 'bg-violet-50 text-violet-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
                  onClick={() => loadSavedScan(scan.id)}>
                  <div className="flex items-center gap-2.5 min-w-0"><span className="shrink-0">{Icons.folder}</span><div className="min-w-0"><span className="text-sm font-medium block truncate">{scan.name}</span><span className="text-xs text-slate-400">{scan.rising_count} rising · {timeAgo(scan.created_at)}</span></div></div>
                  <button onClick={(e) => { e.stopPropagation(); deleteSavedScan(scan.id) }} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all shrink-0 ml-1">{Icons.trash}</button>
                </div>
              ))}
            </>
          )}

          {publicStreams.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-2 mt-6"><span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Public Streams</span></div>
              {publicStreams.map((stream) => (
                <div key={stream.id} className={`group flex items-center justify-between px-3 py-2.5 rounded-xl mb-1 cursor-pointer transition-colors ${view === 'public' && selectedPublicStream?.id === stream.id ? 'bg-emerald-50 text-emerald-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
                  onClick={() => selectPublicStream(stream)}>
                  <div className="flex items-center gap-2.5 min-w-0"><span className="shrink-0 text-emerald-500">{Icons.globe}</span><span className="text-sm font-medium truncate">{stream.name}</span></div>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="shrink-0 p-3 border-t border-slate-100 flex flex-col gap-1">
          {bgScanRunning && (
            <div className="flex items-center gap-2 px-3 py-2 mb-1 bg-orange-50 border border-orange-200 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shrink-0" />
              <span className="text-xs text-orange-600 font-medium truncate">{bgScanRunning} scanning…</span>
            </div>
          )}
          {isAdmin && (
            <button onClick={() => { if (activeScanRef.current) { setBgScanRunning(activeScanRef.current.label); activeScanRef.current = null }; setView('admin'); setSelectedStreamId(null); setSelectedSavedScan(null); setSelectedPublicStream(null) }}
              className={`flex items-center gap-2.5 w-full px-3 py-2.5 text-sm rounded-xl transition-colors ${view === 'admin' ? 'bg-orange-50 text-orange-600 font-medium border border-orange-200' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              <span>Admin</span>
            </button>
          )}
          <button onClick={() => { if (activeScanRef.current) { setBgScanRunning(activeScanRef.current.label); activeScanRef.current = null }; setView('account'); setSelectedStreamId(null); setSelectedSavedScan(null); setSelectedPublicStream(null) }}
            className={`flex items-center gap-2.5 w-full px-3 py-2.5 text-sm rounded-xl transition-colors ${view === 'account' ? 'bg-slate-100 text-slate-700 font-medium' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
            {Icons.user}<span>Account</span>
          </button>
          <button onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {/* ─── Main ─── */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {view === 'account' && <Account supabase={supabase} session={session} settings={settings} setSettings={setSettings} saveSettings={saveSettings} timeWindow={timeWindow} setTimeWindow={setTimeWindow} minInteractions={minInteractions} setMinInteractions={setMinInteractions} maxInteractions={maxInteractions} setMaxInteractions={setMaxInteractions} streams={streams} savedScans={savedScans} />}
        {view === 'admin' && isAdmin && <Admin session={session} />}

        {/* ─── Quick Scan ─── */}
        {view === 'quick' && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 max-w-4xl">
              <div className="flex items-center gap-2 mb-1"><span className="text-orange-500">{Icons.zap}</span><h2 className="text-xl font-bold text-slate-900">Quick Scan</h2></div>
              <p className="text-base text-slate-500 mb-5">Paste a URL and scan it instantly.</p>

              <PlatformTabs selected={quickPlatform} onChange={setQuickPlatform} />

              <form onSubmit={startQuickScan} className="mb-5">
                <div className="mb-5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">{PLATFORMS[quickPlatform].label} URL</label>
                  <input type="text" value={quickUrl} onChange={(e) => setQuickUrl(e.target.value)} placeholder={PLATFORMS[quickPlatform].placeholder} className="w-full max-w-lg px-4 py-3 bg-white border border-slate-300 rounded-xl text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 transition-all" />
                </div>
                <ScanControls timeWindow={timeWindow} setTimeWindow={setTimeWindow} minInteractions={minInteractions} setMinInteractions={setMinInteractions} maxInteractions={maxInteractions} setMaxInteractions={setMaxInteractions} onScan={startQuickScan} isScanning={isQuickScanning} disabled={!quickUrl.trim()} onStop={stopScan} />
              </form>

              <ScanSummary status={quickScanStatus} message={quickScanMessage} postCount={quickRisingPosts.length} totalScraped={quickScanStats.totalScraped} filteredOut={quickScanStats.filteredOut} costUsd={quickScanStats.costUsd} />
              {isQuickScanning && <ScanningAnimation />}
              <RisingPostsList posts={quickRisingPosts} />
              {quickScanStatus === 'done' && quickRisingPosts.length === 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center"><p className="text-base text-slate-400">No rising posts found. Try widening the time window or lowering the interaction minimum.</p></div>
              )}
            </div>
          </div>
        )}

        {/* ─── Saved Scan ─── */}
        {view === 'saved' && selectedSavedScan && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 max-w-4xl">
              <div className="flex items-center gap-2 mb-1"><span className="text-violet-500">{Icons.folder}</span><h2 className="text-xl font-bold text-slate-900">{selectedSavedScan.name}</h2></div>
              <div className="flex flex-wrap gap-3 text-sm text-slate-400 mb-4">
                <span>{formatDate(selectedSavedScan.created_at)}</span><span>·</span>
                <span>{TIME_OPTIONS.find(t => t.value === selectedSavedScan.time_window)?.label || `${selectedSavedScan.time_window}h`}</span><span>·</span>
                <span>Min: {selectedSavedScan.min_interactions}</span><span>·</span>
                <span>Max: {selectedSavedScan.max_interactions === 0 ? 'No Limit' : formatNumber(selectedSavedScan.max_interactions)}</span><span>·</span>
                <span>{selectedSavedScan.total_scraped} scraped → {selectedSavedScan.rising_count} rising</span>
              </div>
              <button onClick={() => rerunSavedScan(selectedSavedScan)}
                className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-xl transition-colors mb-6">
                {Icons.zap} Run This Scan Again
              </button>
              <RisingPostsList posts={selectedSavedScan.results || []} />
              {(!selectedSavedScan.results || selectedSavedScan.results.length === 0) && (
                <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center"><p className="text-base text-slate-400">This saved scan has no results.</p></div>
              )}
            </div>
          </div>
        )}

        {/* ─── Streams Empty ─── */}
        {view === 'streams' && !selectedStream && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-4 text-slate-300">{Icons.stream}</div>
              <p className="text-base text-slate-400">{streams.length === 0 ? 'Create your first stream to get started.' : 'Select a stream from the sidebar.'}</p>
            </div>
          </div>
        )}

        {/* ─── Stream Detail ─── */}
        {view === 'streams' && selectedStream && (() => {
          const streamCategory = selectedStream.category || 'none'
          const filteredPosts = categoryFilterOn && streamCategory !== 'none' ? risingPosts.filter(p => postMatchesCategory(p, streamCategory)) : risingPosts
          const hiddenCount = risingPosts.length - filteredPosts.length
          return (
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 max-w-4xl">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-slate-900">{selectedStream.name}</h2>
                <div className="flex items-center gap-2">
                  <select value={streamCategory} onChange={(e) => updateStreamCategory(selectedStream.id, e.target.value)}
                    className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-600 focus:outline-none focus:border-orange-400 cursor-pointer">
                    {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                  </select>
                  <button onClick={() => toggleStreamPublic(selectedStream.id, !selectedStream.is_public)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium border transition-all ${selectedStream.is_public ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300'}`}>
                    {Icons.globe}
                    {selectedStream.is_public ? 'Public' : 'Make Public'}
                  </button>
                </div>
              </div>

              {/* Compact pages bar */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400">{Icons.stream}</span>
                    <span className="text-sm font-medium text-slate-700">{pages.length} page{pages.length !== 1 ? 's' : ''} monitored</span>
                    {pages.length > 0 && (
                      <div className="flex items-center gap-1 ml-1">
                        {[...new Set(pages.map(p => p.platform || 'facebook'))].map(plat => (
                          <span key={plat} className="text-sm" title={PLATFORMS[plat]?.label}>{PLATFORMS[plat]?.icon}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setShowAddPage(!showAddPage); if (!showAddPage) setShowPages(false) }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${showAddPage ? 'bg-orange-50 text-orange-600 border border-orange-200' : 'bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200'}`}>
                      {Icons.plus} Add Page
                    </button>
                    {pages.length > 0 && (
                      <button onClick={() => { setShowPages(!showPages); if (!showPages) setShowAddPage(false) }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${showPages ? 'bg-slate-100 text-slate-700 border border-slate-300' : 'bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200'}`}>
                        Manage
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${showPages ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9" /></svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Expandable add form */}
                {showAddPage && (
                  <form onSubmit={(e) => { addPage(e); }} className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex flex-wrap gap-2 items-end">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Platform</label>
                        <select value={newPagePlatform} onChange={(e) => setNewPagePlatform(e.target.value)} className="px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-orange-400 appearance-none cursor-pointer pr-10" style={selectStyle}>
                          {Object.entries(PLATFORMS).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                        </select>
                      </div>
                      <div className="flex-1 min-w-[200px]"><label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">URL</label><input type="text" value={newPageUrl} onChange={(e) => setNewPageUrl(e.target.value)} placeholder={PLATFORMS[newPagePlatform].placeholder} className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20" /></div>
                      <div className="max-w-[140px]"><label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Label</label><input type="text" value={newPageName} onChange={(e) => setNewPageName(e.target.value)} placeholder="Optional" className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20" /></div>
                      <button type="submit" className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 rounded-xl text-sm font-medium text-white transition-colors">Add</button>
                    </div>
                  </form>
                )}

                {/* Expandable pages list */}
                {showPages && pages.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-1">
                    {pages.map((page) => {
                      const p = PLATFORMS[page.platform] || PLATFORMS.facebook
                      return (
                        <div key={page.id} className="group flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-sm shrink-0" title={p.label}>{p.icon}</span>
                            <span className="text-sm text-slate-700 truncate">{page.display_name}</span>
                            <span className="text-xs text-slate-300 truncate hidden sm:inline">{page.url}</span>
                          </div>
                          <button onClick={() => deletePage(page.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all shrink-0 ml-2">{Icons.trash}</button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="mb-5">
                <ScanControls timeWindow={timeWindow} setTimeWindow={setTimeWindow} minInteractions={minInteractions} setMinInteractions={setMinInteractions} maxInteractions={maxInteractions} setMaxInteractions={setMaxInteractions} onScan={startStreamScan} isScanning={isScanning} disabled={pages.length === 0} onStop={stopScan} />
              </div>

              <ScanSummary status={scanStatus} message={scanMessage} postCount={risingPosts.length} totalScraped={scanStats.totalScraped} filteredOut={scanStats.filteredOut} costUsd={scanStats.costUsd} />
              {isScanning && <ScanningAnimation />}

              {/* Category filter toggle */}
              {risingPosts.length > 0 && streamCategory !== 'none' && (
                <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{CATEGORIES[streamCategory]?.icon}</span>
                    <span className="text-sm font-medium text-slate-700">{CATEGORIES[streamCategory]?.label} filter</span>
                    {categoryFilterOn && hiddenCount > 0 && <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">{hiddenCount} hidden</span>}
                  </div>
                  <button onClick={() => setCategoryFilterOn(!categoryFilterOn)}
                    className={`relative w-10 h-6 rounded-full transition-colors ${categoryFilterOn ? 'bg-orange-500' : 'bg-slate-200'}`}>
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${categoryFilterOn ? 'left-5' : 'left-1'}`} />
                  </button>
                </div>
              )}

              {filteredPosts.length > 0 && <RisingPostsList posts={filteredPosts} />}
              {scanStatus === 'done' && filteredPosts.length === 0 && risingPosts.length > 0 && categoryFilterOn && (
                <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
                  <p className="text-base text-slate-400">All {risingPosts.length} rising posts were filtered out by the {CATEGORIES[streamCategory]?.label} filter.</p>
                  <button onClick={() => setCategoryFilterOn(false)} className="mt-3 text-sm text-orange-500 hover:text-orange-600 font-medium">Turn off filter to see all posts</button>
                </div>
              )}
              {scanStatus === 'done' && risingPosts.length === 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center"><p className="text-base text-slate-400">No rising posts found. Try widening the time window or lowering the interaction minimum.</p></div>
              )}
            </div>
          </div>
          )
        })()}

        {/* ─── Public Stream View ─── */}
        {view === 'public' && selectedPublicStream && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 max-w-4xl">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <span className="text-emerald-500">{Icons.globe}</span>
                  <h2 className="text-xl font-bold text-slate-900">{selectedPublicStream.name}</h2>
                  <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-medium text-emerald-600">Public</span>
                </div>
                <button onClick={clonePublicStream}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium border border-slate-200 bg-white text-slate-600 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-all">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                  Clone to My Streams
                </button>
              </div>

              {/* Compact pages bar — same as owned streams */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400">{Icons.stream}</span>
                    <span className="text-sm font-medium text-slate-700">{publicPages.length} page{publicPages.length !== 1 ? 's' : ''} monitored</span>
                    {publicPages.length > 0 && (
                      <div className="flex items-center gap-1 ml-1">
                        {[...new Set(publicPages.map(p => p.platform || 'facebook'))].map(plat => (
                          <span key={plat} className="text-sm" title={PLATFORMS[plat]?.label}>{PLATFORMS[plat]?.icon}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {publicPages.length > 0 && (
                    <button onClick={() => setShowPublicPages(!showPublicPages)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${showPublicPages ? 'bg-slate-100 text-slate-700 border border-slate-300' : 'bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200'}`}>
                      View Pages
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${showPublicPages ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9" /></svg>
                    </button>
                  )}
                </div>

                {showPublicPages && publicPages.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-1">
                    {publicPages.map((page) => {
                      const p = PLATFORMS[page.platform] || PLATFORMS.facebook
                      return (
                        <div key={page.id} className="flex items-center gap-2.5 py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors">
                          <span className="text-sm shrink-0" title={p.label}>{p.icon}</span>
                          <span className="text-sm text-slate-700 truncate">{page.display_name}</span>
                          <span className="text-xs text-slate-300 truncate hidden sm:inline">{page.url}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="mb-5">
                <ScanControls timeWindow={timeWindow} setTimeWindow={setTimeWindow} minInteractions={minInteractions} setMinInteractions={setMinInteractions} maxInteractions={maxInteractions} setMaxInteractions={setMaxInteractions} onScan={startPublicStreamScan} isScanning={isScanning} disabled={publicPages.length === 0} onStop={stopScan} />
              </div>

              <ScanSummary status={scanStatus} message={scanMessage} postCount={risingPosts.length} totalScraped={scanStats.totalScraped} filteredOut={scanStats.filteredOut} costUsd={scanStats.costUsd} />
              {isScanning && <ScanningAnimation />}
              {risingPosts.length > 0 && <RisingPostsList posts={risingPosts} />}
              {scanStatus === 'done' && risingPosts.length === 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center"><p className="text-base text-slate-400">No rising posts found. Try widening the time window or lowering the interaction minimum.</p></div>
              )}
            </div>
          </div>
        )}

        {/* ─── Group Scanner ─── */}
        {view === 'groups' && selectedGroupStreamId && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 max-w-4xl">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">👥</span>
                  <h2 className="text-xl font-bold text-slate-900">{groupStreams.find(s => s.id === selectedGroupStreamId)?.name}</h2>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <p className="text-sm text-blue-700"><strong>Blog Content Finder</strong> — This scans Facebook groups for posts with high engagement (lots of comments and reactions). These are the conversations people care about, making them perfect source material for blog posts and articles.</p>
              </div>

              {/* Pages bar */}
              <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3"><span className="text-slate-400">👥</span><span className="text-sm text-slate-600 font-medium">{groupPages.length} group{groupPages.length !== 1 ? 's' : ''} monitored</span></div>
                <div className="flex gap-2">
                  <button onClick={() => { setShowAddGroupPage(!showAddGroupPage); setShowGroupPages(false) }} className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">+ Add Group</button>
                  <button onClick={() => { setShowGroupPages(!showGroupPages); setShowAddGroupPage(false) }} className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">Manage {showGroupPages ? '▴' : '▾'}</button>
                </div>
              </div>

              {showAddGroupPage && (
                <form onSubmit={addGroupPage} className="bg-white border border-slate-200 rounded-2xl px-5 py-4 mb-4">
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="text-xs font-medium text-slate-500 mb-1 block">Group URL or name</label>
                      <input type="text" value={newGroupPageUrl} onChange={(e) => setNewGroupPageUrl(e.target.value)} placeholder="facebook.com/groups/example or just the group name" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400" />
                    </div>
                    <div className="w-40">
                      <label className="text-xs font-medium text-slate-500 mb-1 block">Label (optional)</label>
                      <input type="text" value={newGroupPageName} onChange={(e) => setNewGroupPageName(e.target.value)} placeholder="Nickname" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400" />
                    </div>
                    <button type="submit" className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm font-semibold text-white transition-colors">Add</button>
                  </div>
                </form>
              )}

              {showGroupPages && groupPages.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3 mb-4 space-y-1">
                  {groupPages.map((page) => (
                    <div key={page.id} className="group flex items-center justify-between py-1.5">
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-slate-700">{page.display_name}</span>
                        <span className="text-xs text-slate-400 ml-2 truncate">{page.url.replace('https://www.facebook.com/', '')}</span>
                      </div>
                      <button onClick={() => deleteGroupPage(page.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all">{Icons.trash}</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Scan controls */}
              <div className="pt-4 border-t border-slate-200 mb-5">
                <div className="flex flex-wrap gap-4 items-end">
                  <div>
                    <label className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">🕐 Time Window</label>
                    <select value={groupTimeWindow} onChange={(e) => setGroupTimeWindow(parseFloat(e.target.value))} className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-blue-400">
                      <option value={6}>Last 6 hours</option>
                      <option value={12}>Last 12 hours</option>
                      <option value={24}>Last 24 hours</option>
                      <option value={48}>Last 48 hours</option>
                      <option value={72}>Last 72 hours</option>
                    </select>
                  </div>
                  <div>
                    <label className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">💬 Min Comments</label>
                    <input type="number" value={groupMinComments} onChange={(e) => setGroupMinComments(parseInt(e.target.value) || 0)} className="w-24 px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-blue-400" />
                  </div>
                  <div>
                    <label className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">👍 Min Reactions</label>
                    <input type="number" value={groupMinReactions} onChange={(e) => setGroupMinReactions(parseInt(e.target.value) || 0)} className="w-24 px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-blue-400" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={startGroupScan} disabled={isGroupScanning || groupPages.length === 0}
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${isGroupScanning ? 'bg-blue-100 text-blue-500 border border-blue-200 cursor-not-allowed animate-pulse-glow' : groupPages.length === 0 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-sm shadow-blue-500/20 hover:shadow-md'}`}>
                      {Icons.scan}{isGroupScanning ? 'Scanning...' : 'Scan Groups'}
                    </button>
                    {isGroupScanning && (
                      <button onClick={stopScan} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 transition-all">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                        Stop
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-2">Finds group posts with {groupMinComments}+ comments and {groupMinReactions}+ reactions — perfect for turning into blog content.</p>
              </div>

              <ScanSummary status={groupScanStatus} message={groupScanMessage} postCount={groupPosts.length} totalScraped={groupScanStats.totalScraped} filteredOut={groupScanStats.filteredOut} costUsd={groupScanStats.costUsd} />
              {isGroupScanning && <ScanningAnimation />}
              {groupPosts.length > 0 && (
                <div className="space-y-3">
                  {groupPosts.map((post, i) => (
                    <div key={post.post_id || i} className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-sm transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">👥</span>
                          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{post.page_name}</span>
                          {post.age_hours != null && <span className="text-xs text-slate-400">({post.age_hours}h old)</span>}
                        </div>
                        {post.post_url && <a href={post.post_url} target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-blue-500 transition-colors">{Icons.external}</a>}
                      </div>
                      <p className="text-slate-800 text-base leading-relaxed mb-3">{post.content_preview}</p>
                      {post.reason && (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-3">
                          <p className="text-sm text-blue-700"><span className="font-semibold">📝 Why this post:</span> {post.reason}</p>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex gap-3">
                          <span className="text-slate-500">💬 <strong className="text-blue-600">{post.comments}</strong></span>
                          <span className="text-slate-500">👍 <strong className="text-blue-600">{post.reactions}</strong></span>
                          <span className="text-slate-500">↗ {post.shares}</span>
                        </div>
                        <span className="text-xs text-slate-400">Total {formatNumber(post.total_interactions)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {groupScanStatus === 'done' && groupPosts.length === 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center"><p className="text-base text-slate-400">No posts met your thresholds. Try lowering the minimum comments or reactions, or widening the time window.</p></div>
              )}
            </div>
          </div>
        )}
        {view === 'groups' && !selectedGroupStreamId && (
          <div className="flex-1 flex items-center justify-center"><p className="text-slate-400">Select or create a group stream to start scanning.</p></div>
        )}
      </div>
    </div>
  )
}
