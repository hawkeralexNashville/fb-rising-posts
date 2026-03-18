'use client'
import { useState, useEffect, useRef } from 'react'
import Account from './Account'
import Admin from './Admin'
import ApifySetup from './ApifySetup'

// ─── Platform Config ───
const PLATFORMS = {
  facebook: { label: 'Facebook', color: 'text-blue-400 bg-blue-500/20 border-blue-500/50', icon: '📘', placeholder: 'Page URL, Group URL, or just PageName', urlPrefix: 'https://www.facebook.com/' },
  x: { label: 'X / Twitter', color: 'text-gray-200 bg-gray-700 border-gray-500', icon: '𝕏', placeholder: '@username or https://x.com/username', urlPrefix: 'https://x.com/' },
  reddit: { label: 'Reddit', color: 'text-orange-400 bg-orange-500/20 border-orange-500/50', icon: '🔴', placeholder: 'r/subreddit or https://reddit.com/r/subreddit', urlPrefix: 'https://www.reddit.com/r/' },
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
  share: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>,
  copy: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>,
  check: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>,
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
      <div className="w-full max-w-sm h-1.5 bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-orange-400 via-rose-400 to-orange-400 rounded-full animate-scanning-bar" /></div>
      <p className="text-base font-medium text-gray-400 text-center transition-all duration-300 min-h-[28px]" style={{ opacity: fade ? 1 : 0, transform: fade ? 'translateY(0)' : 'translateY(8px)' }}>{SCANNING_MESSAGES[index]}</p>
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
function formatScanLabel(dateStr) { if (!dateStr) return 'Scan'; const d = new Date(dateStr); return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) + ', ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) }
const selectStyle = { backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }

// ─── Platform Tabs ───
function PlatformTabs({ selected, onChange }) {
  return (
    <div className="flex gap-2 mb-5">
      {Object.entries(PLATFORMS).map(([key, p]) => (
        <button key={key} onClick={() => onChange(key)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${selected === key ? p.color + ' shadow-sm' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600'}`}>
          <span className="text-base">{p.icon}</span> {p.label}
        </button>
      ))}
    </div>
  )
}

// ─── Scan Controls ───
function ScanControls({ timeWindow, setTimeWindow, minInteractions, setMinInteractions, maxInteractions, setMaxInteractions, onScan, isScanning, disabled, onStop, pageCount, scanType, costRates }) {
  const btnClass = isScanning ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40 cursor-not-allowed animate-pulse-glow' : disabled ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white shadow-sm shadow-orange-500/20 hover:shadow-md'

  // Cost estimation from real data
  const getResultsLimit = (tw, type) => {
    if (type === 'groups') {
      if (tw <= 6) return 30; if (tw <= 12) return 40; if (tw <= 24) return 50; if (tw <= 48) return 75; return 100
    }
    if (tw <= 2) return 5; if (tw <= 6) return 10; if (tw <= 12) return 15; if (tw <= 24) return 20; return 30
  }
  const getBucketKey = (tw, type) => {
    if (type === 'groups') {
      if (tw <= 6) return '6h'; if (tw <= 12) return '12h'; if (tw <= 24) return '24h'; return '48h+'
    }
    if (tw <= 2) return '1-2h'; if (tw <= 6) return '6h'; if (tw <= 12) return '12h'; if (tw <= 24) return '24h'; return '48h+'
  }

  const resultsLimit = getResultsLimit(timeWindow, scanType)
  const rateType = scanType === 'groups' ? 'groups' : 'pages'
  const bucketKey = getBucketKey(timeWindow, scanType)

  // Try to get real rate for this bucket, fall back to overall, then to hardcoded default
  const bucketRate = costRates?.rates?.[rateType]?.[bucketKey]
  const overallRate = costRates?.overall?.[rateType]
  const fallbackRate = scanType === 'groups' ? 0.0015 : 0.0005

  let estimatedCost = 0
  let rateSource = ''
  if (pageCount > 0) {
    if (bucketRate) {
      estimatedCost = bucketRate.costPerResult * resultsLimit * pageCount
      rateSource = `based on ${bucketRate.sampleSize} scan${bucketRate.sampleSize !== 1 ? 's' : ''}`
    } else if (overallRate) {
      estimatedCost = overallRate * resultsLimit * pageCount
      rateSource = 'avg across all scans'
    } else {
      estimatedCost = pageCount * resultsLimit * fallbackRate
      rateSource = 'estimated'
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">{Icons.clock} Time Window</label>
          <select value={timeWindow} onChange={(e) => setTimeWindow(parseFloat(e.target.value))} className="px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-xl text-sm text-gray-100 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 appearance-none cursor-pointer pr-10" style={selectStyle}>{TIME_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select>
        </div>
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">{Icons.filter} Min Interactions</label>
          <input type="number" min="0" value={minInteractions} onChange={(e) => setMinInteractions(parseInt(e.target.value) || 0)} className="w-32 px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-xl text-sm text-gray-100 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20" />
        </div>
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">{Icons.filter} Max Interactions</label>
          <select value={maxInteractions} onChange={(e) => setMaxInteractions(parseInt(e.target.value))} className="px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-xl text-sm text-gray-100 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 appearance-none cursor-pointer pr-10" style={selectStyle}>{MAX_INTERACTION_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select>
        </div>
        <div className="flex items-end gap-2">
          <button onClick={onScan} disabled={isScanning || disabled} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${btnClass}`}>{Icons.scan}{isScanning ? 'Scanning...' : 'Scan Now'}</button>
          {isScanning && onStop && (
            <button onClick={onStop} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gray-900 border border-red-500/40 text-red-400 hover:bg-red-500/10 hover:border-red-400 transition-all">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
              Stop
            </button>
          )}
        </div>
      </div>
      {pageCount > 0 && (
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>{pageCount} page{pageCount !== 1 ? 's' : ''} × {resultsLimit} posts each</span>
          <span>·</span>
          <span className="font-medium text-gray-400">Est. cost: <span className={`${estimatedCost > 0.50 ? 'text-amber-400' : estimatedCost > 0.20 ? 'text-gray-400' : 'text-emerald-400'}`}>${estimatedCost.toFixed(2)}</span></span>
          {rateSource && <span className="text-gray-600">({rateSource})</span>}
        </div>
      )}
      {!pageCount && <p className="text-xs text-gray-600">Shorter time windows pull fewer posts per page, reducing Apify costs.</p>}
    </div>
  )
}


// ─── Rising Posts List ───
const HeartIcon = ({ filled }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
)

function RisingPostsList({ posts, session, likedPostIds, onToggleLike }) {
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
        const isLiked = likedPostIds?.has(post.post_id)
        return (
          <div key={post.post_id || i} className={`border rounded-2xl p-5 animate-slide-up transition-all ${(post.tags || []).includes('early_riser') ? 'bg-amber-950/30 border-amber-500/60 ring-1 ring-amber-500/20 hover:border-amber-400' : 'bg-gray-900 border-gray-700 hover:border-gray-500'}`} style={{ animationDelay: `${i * 50}ms` }}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <span className="text-base shrink-0" title={p.label}>{p.icon}</span>
                <span className="text-sm font-bold uppercase tracking-wider text-orange-400">{post.page_name || 'Unknown'}</span>
                {post.posted_at && <span className="text-xs text-gray-500">{timeAgo(post.posted_at)}</span>}
                {post.age_hours && <span className="text-xs text-gray-600">({post.age_hours}h old)</span>}
                {post.post_type && <span className="text-xs text-gray-400 bg-gray-800 border border-gray-700 rounded-full px-2 py-0.5">{post.post_type}</span>}
                {(post.tags || []).includes('early_riser') && <span className="text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/50 rounded-full px-2.5 py-0.5">🔥 Early Riser</span>}
                {(post.tags || []).includes('viral') && <span className="text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/50 rounded-full px-2.5 py-0.5">⚡ Viral</span>}
                {(post.tags || []).includes('accelerating') && <span className="text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/50 rounded-full px-2.5 py-0.5">📈 Accelerating</span>}
              </div>
              <div className="shrink-0 flex items-center gap-2">
                {onToggleLike && (
                  <button onClick={() => onToggleLike(post)} className={`transition-colors ${isLiked ? 'text-rose-500' : 'text-gray-600 hover:text-rose-400'}`} title={isLiked ? 'Unlike' : 'Like'}>
                    <HeartIcon filled={isLiked} />
                  </button>
                )}
                {post.post_url && <a href={post.post_url} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-orange-400 transition-colors">{Icons.link}</a>}
              </div>
            </div>
            {post.content_preview && <p className="text-base text-gray-200 mb-3 line-clamp-3 leading-relaxed">{post.content_preview}</p>}
            {post.image_url && (
              <div className="mb-3 rounded-xl overflow-hidden bg-gray-800 border border-gray-700">
                <img
                  src={post.image_url}
                  alt=""
                  className="w-full max-h-72 object-cover"
                  loading="lazy"
                  onError={(e) => { e.currentTarget.parentElement.style.display = 'none' }}
                />
              </div>
            )}
            {post.reason && (
              <div className="mb-3 bg-orange-500/10 border border-orange-500/30 rounded-xl px-4 py-2.5">
                <p className="text-xs leading-relaxed text-orange-300"><span className="font-semibold text-orange-400">⚡ Why this post:</span> {post.reason}</p>
              </div>
            )}
            {post.relevance_score !== null && post.relevance_score !== undefined && (
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
              <div className="flex items-center gap-1.5"><span className="text-gray-500 text-xs">Total</span><span className="font-bold text-white text-base">{formatNumber(post.total_interactions)}</span></div>
              <div className="flex items-center gap-1.5"><span className="text-gray-500 text-xs">Velocity</span><span className="font-bold text-orange-400 text-base">{post.velocity?.toFixed(0) || '—'}/hr</span></div>
              {post.delta !== null && post.delta !== undefined && <div className="flex items-center gap-1.5"><span className="text-gray-500 text-xs">Delta</span><span className="font-bold text-orange-400">+{post.delta}</span></div>}
              {post.deltaRate && <div className="flex items-center gap-1.5"><span className="text-gray-500 text-xs">Δ Rate</span><span className="font-bold text-orange-400">{post.deltaRate}/hr</span></div>}
              {post.score && <div className="flex items-center gap-1.5"><span className="text-gray-500 text-xs">Score</span><span className="font-bold text-violet-400">{post.score}</span>{post.age_multiplier > 1 && <span className="text-xs text-violet-500">({post.age_multiplier}x boost)</span>}</div>}
              <div className="flex items-center gap-3 ml-auto text-gray-600 text-xs">
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

// ─── Share Modal ───
function ShareModal({ shareUrl, onClose }) {
  const [copied, setCopied] = useState(false)

  function copyLink() {
    navigator.clipboard.writeText(shareUrl).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🔗</span>
          <h2 className="text-lg font-bold text-white">Share Results</h2>
        </div>
        <p className="text-sm text-gray-400 mb-5">Anyone with this link can view the results. They can't run scans unless they're logged in.</p>
        <div className="flex gap-2 mb-4">
          <input readOnly value={shareUrl}
            className="flex-1 min-w-0 px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-xl text-sm text-gray-200 font-mono focus:outline-none select-all"
            onFocus={e => e.target.select()} />
          <button onClick={copyLink}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0 ${copied ? 'bg-emerald-500 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white'}`}>
            {copied ? Icons.check : Icons.copy}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
          Read-only view — includes all posts and any AI analysis that was run.
        </div>
        <button onClick={onClose}
          className="w-full px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-xl transition-colors">
          Close
        </button>
      </div>
    </div>
  )
}

// ─── Scan Summary ───
function ScanSummary({ status, message, postCount, totalScraped, filteredOut, costUsd }) {
  if (!message) return null
  return (
    <div className="mb-5">
      <p className={`text-sm ${status === 'error' ? 'text-red-400' : status === 'done' ? 'text-gray-400' : 'text-orange-400'}`}>{message}</p>
      {status === 'done' && totalScraped > 0 && (
        <div className="flex items-center gap-3 mt-1">
          <p className="text-xs text-gray-500">{totalScraped} scraped → {filteredOut} filtered → {postCount} rising</p>
          {costUsd !== null && costUsd !== undefined && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-400 bg-gray-800 border border-gray-700 rounded-full px-2.5 py-0.5">
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
  const [recentPublicScans, setRecentPublicScans] = useState([])
  const [costRates, setCostRates] = useState(null)
  const [selectedSavedScan, setSelectedSavedScan] = useState(null)
  const [settings, setSettings] = useState({ min_velocity: 50, min_delta: 20 })
  const [publicStreams, setPublicStreams] = useState([])
  const [selectedPublicStream, setSelectedPublicStream] = useState(null)
  const [publicPages, setPublicPages] = useState([])
  const [showPublicPages, setShowPublicPages] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [savedScanAudienceProfile, setSavedScanAudienceProfile] = useState('')
  const [showSavedScanAudienceProfile, setShowSavedScanAudienceProfile] = useState(false)
  const [pendingRerun, setPendingRerun] = useState(null)
  // Notification state
  const [notifSettings, setNotifSettings] = useState(null)
  const [showNotifSettings, setShowNotifSettings] = useState(false)
  const [notifSaving, setNotifSaving] = useState(false)
  const [sendingNow, setSendingNow] = useState(false)
  // Relevance scoring state
  const [relevanceScoring, setRelevanceScoring] = useState(false)
  const [relevanceStats, setRelevanceStats] = useState(null)
  const [relevanceFilter, setRelevanceFilter] = useState('all') // all, relevant, irrelevant
  const [showAudienceProfile, setShowAudienceProfile] = useState(false)
  const [editingAudienceProfile, setEditingAudienceProfile] = useState('')
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
  // undefined = not checked yet, null = checked but missing, string = set
  const [apifyToken, setApifyToken] = useState(undefined)
  const [showApifyModal, setShowApifyModal] = useState(false)
  // Share state
  const [shareModal, setShareModal] = useState(null) // null | { url: string }
  const [sharingLoading, setSharingLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [likedPostIds, setLikedPostIds] = useState(new Set())
  const [likedPosts, setLikedPosts] = useState([])

  useEffect(() => { if (!userId) return; loadStreams(); loadSettings(); loadSavedScans(); loadPublicStreams(); loadGroupStreams(); loadRecentPublicScans(); loadCostRates(); loadLikedPosts() }, [userId])
  useEffect(() => { setSidebarOpen(false) }, [view, selectedStreamId, selectedGroupStreamId])
  useEffect(() => { if (!selectedStreamId) { setPages([]); setRisingPosts([]); setNotifSettings(null); setShowNotifSettings(false); setRelevanceStats(null); setRelevanceFilter('all'); setShowAudienceProfile(false); return }; loadPages(selectedStreamId); loadNotifSettings(selectedStreamId); setShowPages(false); setShowAddPage(false); setShowNotifSettings(false); setRelevanceStats(null); setRelevanceFilter('all'); if (activeScanRef.current) { setBgScanRunning(activeScanRef.current.label); activeScanRef.current = null }; setRisingPosts([]); setScanStatus('idle'); setScanMessage(''); setScanStats({ totalScraped: 0, filteredOut: 0, costUsd: null }); const s = streams.find(st => st.id === selectedStreamId); setCategoryFilterOn(s?.category && s.category !== 'none' ? true : false); setEditingAudienceProfile(s?.audience_profile || ''); setShowAudienceProfile(!s?.audience_profile) }, [selectedStreamId])
  useEffect(() => { if (!selectedGroupStreamId) { setGroupPages([]); setGroupPosts([]); return }; loadGroupPages(selectedGroupStreamId); setShowGroupPages(false); setShowAddGroupPage(false); setGroupPosts([]); setGroupScanStatus('idle'); setGroupScanMessage(''); setGroupScanStats({ totalScraped: 0, filteredOut: 0, costUsd: null }) }, [selectedGroupStreamId])

  useEffect(() => {
    if (pendingRerun && pages.length > 0 && view === 'streams') {
      setPendingRerun(null)
      startStreamScan()
    }
  }, [pendingRerun, pages, view])

  async function loadStreams() { const { data } = await supabase.from('streams').select('*').eq('user_id', userId).or('type.eq.rising,type.is.null').order('created_at', { ascending: true }); setStreams(data || []) }
  async function loadPages(streamId) { const { data } = await supabase.from('monitored_pages').select('*').eq('stream_id', streamId).order('created_at', { ascending: true }); setPages(data || []) }
  async function loadNotifSettings(streamId) {
    const { data } = await supabase.from('stream_notifications').select('*').eq('stream_id', streamId).eq('user_id', userId).single()
    setNotifSettings(data || { enabled: false, frequency_hours: 2, min_interactions: 50, time_window_hours: 6, emails: [], send_times: [], schedule_mode: 'specific_times', interval_minutes: 60, send_days: [0,1,2,3,4,5,6], active_hours_start: 0, active_hours_end: 23, ai_filter_enabled: true })
  }
  async function saveNotifSettings(updated) {
    setNotifSaving(true)
    const payload = { stream_id: selectedStreamId, user_id: userId, enabled: updated.enabled, frequency_hours: updated.frequency_hours, min_interactions: updated.min_interactions, time_window_hours: updated.time_window_hours, emails: updated.emails, send_times: updated.send_times || [], schedule_mode: updated.schedule_mode || 'specific_times', interval_minutes: updated.interval_minutes || 60, send_days: updated.send_days ?? [0,1,2,3,4,5,6], active_hours_start: updated.active_hours_start ?? 0, active_hours_end: updated.active_hours_end ?? 23, ai_filter_enabled: updated.ai_filter_enabled ?? true, updated_at: new Date().toISOString() }
    const { data: existing } = await supabase.from('stream_notifications').select('id').eq('stream_id', selectedStreamId).eq('user_id', userId).single()
    let error
    if (existing) {
      const res = await supabase.from('stream_notifications').update(payload).eq('id', existing.id)
      error = res.error
    } else {
      const res = await supabase.from('stream_notifications').insert(payload)
      error = res.error
    }
    setNotifSaving(false)
    if (error) {
      console.error('Failed to save notification settings:', error)
      showToast('Failed to save: ' + error.message, 'error')
      return
    }
    setNotifSettings(updated)
    showToast('Notification settings saved!')
  }
  async function sendNotifNow() {
    if (!notifSettings?.emails?.length) { showToast('Add at least one email first', 'error'); return }
    setSendingNow(true)
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const res = await fetch('/api/notifications/send-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ streamId: selectedStreamId, emails: notifSettings.emails, timeWindowHours: notifSettings.time_window_hours, minInteractions: notifSettings.min_interactions }),
      })
      const data = await res.json()
      if (res.ok) { showToast(`Email sent! ${data.risingCount} relevant posts${data.relevanceFiltered ? ` (${data.relevanceFiltered} irrelevant filtered out)` : ''}. Cost: $${data.costUsd?.toFixed(4) || '0'}`) }
      else { showToast(data.error || 'Failed to send', 'error') }
    } catch (err) { showToast('Failed to send email', 'error') }
    setSendingNow(false)
  }

  // Audience profile
  async function saveAudienceProfile() {
    if (!selectedStreamId) return
    await supabase.from('streams').update({ audience_profile: editingAudienceProfile }).eq('id', selectedStreamId)
    setStreams(streams.map(s => s.id === selectedStreamId ? { ...s, audience_profile: editingAudienceProfile } : s))
    setShowAudienceProfile(false)
    showToast('Audience profile saved!')
  }

  // Relevance scoring
  async function scoreRelevance(posts) {
    const stream = streams.find(s => s.id === selectedStreamId)
    if (!stream?.audience_profile) { showToast('Set an audience profile first', 'error'); setShowAudienceProfile(true); return }
    setRelevanceScoring(true)
    setRelevanceStats(null)
    setRelevanceFilter('all')
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const res = await fetch('/api/ai/relevance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ posts, audienceProfile: stream.audience_profile }),
      })
      const data = await res.json()
      if (res.ok) {
        setRisingPosts(data.posts)
        setRelevanceStats(data.stats)
        showToast(`Scored! ${data.stats.relevant} relevant, ${data.stats.irrelevant} filtered out (AI cost: $${data.stats.costEstimate || '?'})`)
      } else { showToast(data.error || 'Scoring failed', 'error') }
    } catch (err) { showToast('Relevance scoring failed', 'error') }
    setRelevanceScoring(false)
  }

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

  // Relevance scoring for saved scans
  async function scoreSavedScanRelevance(posts) {
    // Try to get audience profile from the linked stream, or from inline input
    const stream = selectedSavedScan?.stream_id ? streams.find(s => s.id === selectedSavedScan.stream_id) : null
    const audienceProfile = stream?.audience_profile || savedScanAudienceProfile
    if (!audienceProfile) { showToast('Set an audience profile first', 'error'); setShowSavedScanAudienceProfile(true); return }
    setRelevanceScoring(true)
    setRelevanceStats(null)
    setRelevanceFilter('all')
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      const res = await fetch('/api/ai/relevance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ posts, audienceProfile }),
      })
      const data = await res.json()
      if (res.ok) {
        setSelectedSavedScan(prev => ({ ...prev, results: data.posts }))
        setRelevanceStats(data.stats)
        showToast(`Scored! ${data.stats.relevant} relevant, ${data.stats.irrelevant} filtered out (AI cost: $${data.stats.costEstimate || '?'})`)
      } else { showToast(data.error || 'Scoring failed', 'error') }
    } catch (err) { showToast('Relevance scoring failed', 'error') }
    setRelevanceScoring(false)
  }
  async function loadSettings() { const { data } = await supabase.from('user_settings').select('*').eq('user_id', userId).single(); if (data) { setSettings({ min_velocity: data.min_velocity, min_delta: data.min_delta }); if (data.max_post_age_hours) setTimeWindow(data.max_post_age_hours); if (data.min_interactions != null) setMinInteractions(data.min_interactions); if (data.max_interactions != null) setMaxInteractions(data.max_interactions); if (data.is_admin) setIsAdmin(true); setApifyToken(data.apify_api_token || null); if (data.group_min_comments != null) setGroupMinComments(data.group_min_comments); if (data.group_min_reactions != null) setGroupMinReactions(data.group_min_reactions) } else { setApifyToken(null) } }

  async function saveApifyToken(token) { const { data: existing } = await supabase.from('user_settings').select('id').eq('user_id', userId).single(); if (existing) { await supabase.from('user_settings').update({ apify_api_token: token }).eq('user_id', userId) } else { await supabase.from('user_settings').insert({ user_id: userId, apify_api_token: token }) }; setApifyToken(token) }
  async function loadSavedScans() { const { data } = await supabase.from('saved_scans').select('id, name, stream_id, time_window, min_interactions, max_interactions, total_scraped, rising_count, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(50); setSavedScans(data || []) }
  async function loadLikedPosts() { const { data } = await supabase.from('liked_posts').select('post_id, post_data, created_at').eq('user_id', userId).order('created_at', { ascending: false }); if (data) { setLikedPosts(data); setLikedPostIds(new Set(data.map(p => p.post_id))) } }
  async function toggleLike(post) {
    const postId = post.post_id
    if (likedPostIds.has(postId)) {
      await supabase.from('liked_posts').delete().eq('user_id', userId).eq('post_id', postId)
      setLikedPostIds(prev => { const next = new Set(prev); next.delete(postId); return next })
      setLikedPosts(prev => prev.filter(p => p.post_id !== postId))
    } else {
      const { data } = await supabase.from('liked_posts').insert({ user_id: userId, post_id: postId, post_data: post }).select('post_id, post_data, created_at').single()
      if (data) { setLikedPostIds(prev => new Set([...prev, postId])); setLikedPosts(prev => [data, ...prev]) }
    }
  }
  async function loadRecentPublicScans() { const { data } = await supabase.from('saved_scans').select('id, name, time_window, min_interactions, max_interactions, total_scraped, rising_count, created_at, scan_type').order('created_at', { ascending: false }).limit(60); setRecentPublicScans(data || []) }
  async function loadCostRates() { try { const token = (await supabase.auth.getSession()).data.session?.access_token; if (!token) return; const res = await fetch('/api/scan/cost-rates', { headers: { Authorization: `Bearer ${token}` } }); if (res.ok) { const data = await res.json(); setCostRates(data) } } catch(e) { console.error('Failed to load cost rates:', e) } }
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
  async function saveSettings() { const payload = { ...settings, max_post_age_hours: timeWindow, min_interactions: minInteractions, max_interactions: maxInteractions, group_min_comments: groupMinComments, group_min_reactions: groupMinReactions, updated_at: new Date().toISOString() }; const { data: existing } = await supabase.from('user_settings').select('id').eq('user_id', userId).single(); if (existing) { await supabase.from('user_settings').update(payload).eq('user_id', userId) } else { await supabase.from('user_settings').insert({ user_id: userId, ...payload }) } }

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
    if (!error && data) { setSavedScans([data, ...savedScans]); loadRecentPublicScans(); loadCostRates() }
  }
  async function createShare({ title, posts, batchStrategyData, scanMeta }) {
    if (!posts || posts.length === 0) { showToast('No posts to share.', 'error'); return }
    setSharingLoading(true)
    try {
      const res = await fetch('/api/share/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          title,
          posts,
          batch_strategy: batchStrategyData || null,
          post_strategies: {},
          scan_meta: scanMeta || {},
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create share')
      const shareUrl = `${window.location.origin}/share/${data.share_token}`
      setShareModal({ url: shareUrl })
    } catch (err) {
      showToast(err.message || 'Failed to create share.', 'error')
    } finally {
      setSharingLoading(false)
    }
  }

  async function loadSavedScan(id) { const { data } = await supabase.from('saved_scans').select('*').eq('id', id).single(); if (data) { if (activeScanRef.current) { setBgScanRunning(activeScanRef.current.label); activeScanRef.current = null }; setSelectedSavedScan(data); setView('saved'); setRelevanceStats(null); setRelevanceFilter('all'); setRelevanceScoring(false); const stream = data.stream_id ? streams.find(s => s.id === data.stream_id) : null; setSavedScanAudienceProfile(stream?.audience_profile || ''); setShowSavedScanAudienceProfile(false) } }
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
    if (!apifyToken) { setShowApifyModal(true); return }
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
    if (!apifyToken) { setShowApifyModal(true); return }
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
    if (!error && data) { setSavedScans([data, ...savedScans]); loadRecentPublicScans(); loadCostRates() }
  }

  // Still loading settings — show minimal spinner
  if (apifyToken === undefined) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-7 h-7 border-2 border-orange-800 border-t-orange-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen flex bg-gray-950">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg transition-all animate-slide-up ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-gray-800 text-white border border-gray-700'}`}>
          {toast.msg}
        </div>
      )}
      {shareModal && <ShareModal shareUrl={shareModal.url} onClose={() => setShareModal(null)} />}

      {/* ─── Apify key modal ─── */}
      {showApifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-white">Connect your Apify account</h3>
                <p className="text-sm text-gray-400 mt-1">You need an Apify API key to run scans. It&apos;s free to sign up.</p>
              </div>
              <button onClick={() => setShowApifyModal(false)} className="text-gray-500 hover:text-gray-300 ml-4 mt-0.5">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <ApifySetup onSave={async (token) => { await saveApifyToken(token); setShowApifyModal(false) }} isUpdate={true} />
            <p className="text-xs text-gray-600 mt-3">
              Don&apos;t have an account?{' '}
              <a href="https://apify.com/sign-up" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-400">Sign up free →</a>
            </p>
          </div>
        </div>
      )}

      {/* ─── Mobile overlay backdrop ─── */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ─── Sidebar ─── */}
      <div className={`fixed md:sticky top-0 left-0 h-screen z-40 w-72 bg-gray-900 border-r border-gray-800 flex flex-col transition-transform duration-200 md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-5 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center text-white">{Icons.trending}</div>
            <span className="text-lg font-bold tracking-tight text-white">Rising Posts</span>
          </div>
        </div>

        <div className="p-3 border-b border-gray-800">
          <button onClick={() => { if (activeScanRef.current) { setBgScanRunning(activeScanRef.current.label); activeScanRef.current = null }; setView('quick'); setSelectedStreamId(null); setSelectedSavedScan(null) }}
            className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${view === 'quick' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
            {Icons.zap}<span>Quick Scan</span>
          </button>
          <button onClick={() => { if (activeScanRef.current) { setBgScanRunning(activeScanRef.current.label); activeScanRef.current = null }; setView('recent'); setSelectedStreamId(null); setSelectedSavedScan(null); setSelectedPublicStream(null) }}
            className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-colors mt-1 ${view === 'recent' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
            {Icons.clock}<span>Recent Scans</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Streams</span>
            <button onClick={() => setShowAddStream(!showAddStream)} className="text-gray-500 hover:text-orange-400 transition-colors">{Icons.plus}</button>
          </div>
          {showAddStream && (
            <form onSubmit={createStream} className="mb-3">
              <input type="text" value={newStreamName} onChange={(e) => setNewStreamName(e.target.value)} placeholder="Stream name..." autoFocus className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-400 mb-2" />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 rounded-lg text-xs font-semibold text-white transition-colors">Create</button>
                <button type="button" onClick={() => { setShowAddStream(false); setNewStreamName('') }} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs text-gray-300 transition-colors">Cancel</button>
              </div>
            </form>
          )}
          {streams.length === 0 && !showAddStream && (
            <button
              onClick={() => setShowAddStream(true)}
              className="w-full mt-2 px-3 py-3 rounded-xl border-2 border-dashed border-gray-700 hover:border-orange-500/50 hover:bg-orange-500/5 text-gray-500 hover:text-orange-400 text-xs font-medium transition-all text-center"
            >
              + Create your first stream
            </button>
          )}
          {streams.map((stream) => (
            <div key={stream.id} className={`group flex items-center justify-between px-3 py-2.5 rounded-xl mb-1 cursor-pointer transition-colors ${view === 'streams' && selectedStreamId === stream.id ? 'bg-orange-500/20 text-orange-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
              onClick={() => { setView('streams'); setSelectedStreamId(stream.id); setSelectedSavedScan(null) }}>
              <div className="flex items-center gap-2.5 min-w-0"><span className="shrink-0">{Icons.stream}</span><span className="text-sm font-medium truncate">{stream.name}</span>{stream.is_public && <span className="shrink-0 text-emerald-400" title="Public">{Icons.globe}</span>}</div>
              <button onClick={(e) => { e.stopPropagation(); deleteStream(stream.id) }} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all">{Icons.trash}</button>
            </div>
          ))}

          {/* Group Scanner */}
          <div className="flex items-center justify-between mb-2 mt-6">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">Group Scanner</span>
            <button onClick={() => setShowAddGroupStream(!showAddGroupStream)} className="text-gray-500 hover:text-blue-400 transition-colors">{Icons.plus}</button>
          </div>
          {showAddGroupStream && (
            <form onSubmit={createGroupStream} className="mb-3">
              <input type="text" value={newGroupStreamName} onChange={(e) => setNewGroupStreamName(e.target.value)} placeholder="Group stream name..." autoFocus className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-400 mb-2" />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 rounded-lg text-xs font-semibold text-white transition-colors">Create</button>
                <button type="button" onClick={() => { setShowAddGroupStream(false); setNewGroupStreamName('') }} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs text-gray-300 transition-colors">Cancel</button>
              </div>
            </form>
          )}
          {groupStreams.length === 0 && !showAddGroupStream && <p className="text-sm text-gray-500 mt-1">No group streams yet.</p>}
          {groupStreams.map((stream) => (
            <div key={stream.id} className={`group flex items-center justify-between px-3 py-2.5 rounded-xl mb-1 cursor-pointer transition-colors ${view === 'groups' && selectedGroupStreamId === stream.id ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
              onClick={() => { setView('groups'); setSelectedGroupStreamId(stream.id); setSelectedStreamId(null); setSelectedSavedScan(null) }}>
              <div className="flex items-center gap-2.5 min-w-0"><span className="shrink-0">👥</span><span className="text-sm font-medium truncate">{stream.name}</span></div>
              <button onClick={(e) => { e.stopPropagation(); deleteGroupStream(stream.id) }} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all">{Icons.trash}</button>
            </div>
          ))}

          {savedScans.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-2 mt-6"><span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Saved Scans</span></div>
              {savedScans.map((scan) => (
                <div key={scan.id} className={`group flex items-center justify-between px-3 py-2.5 rounded-xl mb-1 cursor-pointer transition-colors ${view === 'saved' && selectedSavedScan?.id === scan.id ? 'bg-violet-500/20 text-violet-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                  onClick={() => loadSavedScan(scan.id)}>
                  <div className="flex items-center gap-2.5 min-w-0"><span className="shrink-0">{Icons.folder}</span><div className="min-w-0"><span className="text-sm font-medium block truncate">{formatScanLabel(scan.created_at)}</span><span className="text-xs text-gray-500">{scan.rising_count} rising · {timeAgo(scan.created_at)}</span></div></div>
                  <button onClick={(e) => { e.stopPropagation(); deleteSavedScan(scan.id) }} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all shrink-0 ml-1">{Icons.trash}</button>
                </div>
              ))}
            </>
          )}

          <div className="mt-6">
            <button onClick={() => { if (activeScanRef.current) { setBgScanRunning(activeScanRef.current.label); activeScanRef.current = null }; setView('likes'); setSelectedStreamId(null); setSelectedSavedScan(null); setSelectedPublicStream(null) }}
              className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${view === 'likes' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill={view === 'likes' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
              <span>Liked Posts</span>
              {likedPosts.length > 0 && <span className="ml-auto text-xs bg-rose-500/20 text-rose-400 rounded-full px-2 py-0.5">{likedPosts.length}</span>}
            </button>
          </div>

          {publicStreams.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-2 mt-6"><span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Public Streams</span></div>
              {publicStreams.map((stream) => (
                <div key={stream.id} className={`group flex items-center justify-between px-3 py-2.5 rounded-xl mb-1 cursor-pointer transition-colors ${view === 'public' && selectedPublicStream?.id === stream.id ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                  onClick={() => selectPublicStream(stream)}>
                  <div className="flex items-center gap-2.5 min-w-0"><span className="shrink-0 text-emerald-500">{Icons.globe}</span><span className="text-sm font-medium truncate">{stream.name}</span></div>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="shrink-0 p-3 border-t border-gray-800 flex flex-col gap-1">
          {bgScanRunning && (
            <div className="flex items-center gap-2 px-3 py-2 mb-1 bg-orange-500/20 border border-orange-500/30 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shrink-0" />
              <span className="text-xs text-orange-400 font-medium truncate">{bgScanRunning} scanning…</span>
            </div>
          )}
          {isAdmin && (
            <button onClick={() => { if (activeScanRef.current) { setBgScanRunning(activeScanRef.current.label); activeScanRef.current = null }; setView('admin'); setSelectedStreamId(null); setSelectedSavedScan(null); setSelectedPublicStream(null) }}
              className={`flex items-center gap-2.5 w-full px-3 py-2.5 text-sm rounded-xl transition-colors ${view === 'admin' ? 'bg-orange-500/20 text-orange-400 font-medium border border-orange-500/30' : 'text-gray-500 hover:text-gray-200 hover:bg-gray-800'}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              <span>Admin</span>
            </button>
          )}
          <button onClick={() => { if (activeScanRef.current) { setBgScanRunning(activeScanRef.current.label); activeScanRef.current = null }; setView('account'); setSelectedStreamId(null); setSelectedSavedScan(null); setSelectedPublicStream(null) }}
            className={`flex items-center gap-2.5 w-full px-3 py-2.5 text-sm rounded-xl transition-colors ${view === 'account' ? 'bg-gray-800 text-white font-medium' : 'text-gray-500 hover:text-gray-200 hover:bg-gray-800'}`}>
            {Icons.user}<span>Account</span>
          </button>
          <button onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {/* ─── Main ─── */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden bg-gray-950 min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden shrink-0 flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800 sticky top-0 z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center text-white">{Icons.trending}</div>
            <span className="text-base font-bold tracking-tight text-white">Rising Posts</span>
          </div>
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors" aria-label="Open menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
          </button>
        </div>
        {view === 'account' && <Account supabase={supabase} session={session} settings={settings} setSettings={setSettings} saveSettings={saveSettings} timeWindow={timeWindow} setTimeWindow={setTimeWindow} minInteractions={minInteractions} setMinInteractions={setMinInteractions} maxInteractions={maxInteractions} setMaxInteractions={setMaxInteractions} groupMinComments={groupMinComments} setGroupMinComments={setGroupMinComments} groupMinReactions={groupMinReactions} setGroupMinReactions={setGroupMinReactions} streams={streams} savedScans={savedScans} apifyToken={apifyToken} saveApifyToken={saveApifyToken} />}
        {view === 'admin' && isAdmin && <Admin session={session} />}

        {/* ─── Recent Scans Grid ─── */}
        {view === 'recent' && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-6">
                <span className="text-gray-500">{Icons.clock}</span>
                <h2 className="text-2xl font-bold text-white">Recent Scans</h2>
                <span className="text-xs text-gray-400 bg-gray-800 rounded-full px-2.5 py-0.5">{recentPublicScans.length}</span>
              </div>
              {recentPublicScans.length === 0 ? (
                <div className="bg-gray-900 border border-gray-700 rounded-2xl p-10 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center mx-auto mb-4 text-gray-600">{Icons.folder}</div>
                  <p className="text-base text-gray-500">No scans yet. Run a Quick Scan or Stream scan to get started.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recentPublicScans.map((scan) => {
                    return (
                      <button key={scan.id} onClick={() => loadSavedScan(scan.id)}
                        className="bg-gray-900 border border-gray-700 rounded-2xl p-5 text-left hover:border-orange-500/60 hover:shadow-md hover:shadow-orange-500/10 transition-all group">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {scan.scan_type === 'groups' ? <span className="text-sm">👥</span> : <span className="text-gray-500">{Icons.folder}</span>}
                          </div>
                          <span className="text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity">{Icons.link}</span>
                        </div>
                        <h3 className="text-sm font-semibold text-gray-100 mb-2 leading-snug">{formatScanLabel(scan.created_at)}</h3>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>{timeAgo(scan.created_at)}</span>
                          <span>·</span>
                          <span className="font-medium text-orange-400">{scan.rising_count} rising</span>
                          {scan.total_scraped > 0 && <span className="text-gray-600">/ {scan.total_scraped} scraped</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <span className="text-xs text-gray-400 bg-gray-800 border border-gray-700 rounded-full px-2 py-0.5">
                            {TIME_OPTIONS.find(t => t.value === scan.time_window)?.label || `${scan.time_window}h`}
                          </span>
                          <span className="text-xs text-gray-400 bg-gray-800 border border-gray-700 rounded-full px-2 py-0.5">
                            Min {scan.min_interactions}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Quick Scan ─── */}
        {view === 'quick' && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-6 max-w-4xl">
              <div className="flex items-center gap-2 mb-1"><span className="text-orange-400">{Icons.zap}</span><h2 className="text-2xl font-bold text-white">Quick Scan</h2></div>
              <p className="text-base text-gray-400 mb-5">Paste a URL and scan it instantly.</p>

              <PlatformTabs selected={quickPlatform} onChange={setQuickPlatform} />

              <form onSubmit={startQuickScan} className="mb-5">
                <div className="mb-5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">{PLATFORMS[quickPlatform].label} URL</label>
                  <input type="text" value={quickUrl} onChange={(e) => setQuickUrl(e.target.value)} placeholder={PLATFORMS[quickPlatform].placeholder} className="w-full max-w-lg px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-base text-white placeholder-gray-500 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 transition-all" />
                </div>
                <ScanControls timeWindow={timeWindow} setTimeWindow={setTimeWindow} minInteractions={minInteractions} setMinInteractions={setMinInteractions} maxInteractions={maxInteractions} setMaxInteractions={setMaxInteractions} onScan={startQuickScan} isScanning={isQuickScanning} disabled={!quickUrl.trim()} onStop={stopScan} costRates={costRates} pageCount={quickUrl.trim() ? quickUrl.trim().split('\n').filter(u => u.trim()).length : 0} />
              </form>

              <ScanSummary status={quickScanStatus} message={quickScanMessage} postCount={quickRisingPosts.length} totalScraped={quickScanStats.totalScraped} filteredOut={quickScanStats.filteredOut} costUsd={quickScanStats.costUsd} />
              {isQuickScanning && <ScanningAnimation />}

              {quickRisingPosts.length > 0 && (
                <button onClick={() => createShare({ title: quickUrl.trim() || 'Quick Scan', posts: quickRisingPosts, scanMeta: { time_window: timeWindow, total_scraped: quickScanStats.totalScraped, cost_usd: quickScanStats.costUsd } })} disabled={sharingLoading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-600 bg-gray-800 text-gray-300 hover:text-white hover:border-gray-500 transition-all disabled:opacity-50 mb-4">
                  {Icons.share} {sharingLoading ? 'Creating link…' : 'Share Results'}
                </button>
              )}
              <RisingPostsList posts={quickRisingPosts} session={session} likedPostIds={likedPostIds} onToggleLike={toggleLike} />
              {quickScanStatus === 'done' && quickRisingPosts.length === 0 && (
                <div className="bg-gray-900 border border-gray-700 rounded-2xl p-10 text-center"><p className="text-base text-gray-500">No rising posts found. Try widening the time window or lowering the interaction minimum.</p></div>
              )}
            </div>
          </div>
        )}

        {/* ─── Saved Scan ─── */}
        {view === 'saved' && selectedSavedScan && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-6 max-w-4xl">
              <div className="flex items-center gap-2 mb-1"><span className="text-violet-400">{Icons.folder}</span><h2 className="text-2xl font-bold text-white">{formatScanLabel(selectedSavedScan.created_at)}</h2></div>
              <div className="flex flex-wrap gap-3 text-sm text-gray-500 mb-4">
                <span>{formatDate(selectedSavedScan.created_at)}</span><span>·</span>
                <span>{TIME_OPTIONS.find(t => t.value === selectedSavedScan.time_window)?.label || `${selectedSavedScan.time_window}h`}</span><span>·</span>
                <span>Min: {selectedSavedScan.min_interactions}</span><span>·</span>
                <span>Max: {selectedSavedScan.max_interactions === 0 ? 'No Limit' : formatNumber(selectedSavedScan.max_interactions)}</span><span>·</span>
                <span>{selectedSavedScan.total_scraped} scraped → {selectedSavedScan.rising_count} rising</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <button onClick={() => rerunSavedScan(selectedSavedScan)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-xl transition-colors">
                  {Icons.zap} Run This Scan Again
                </button>
                {selectedSavedScan.results?.length > 0 && (
                  <button onClick={() => createShare({ title: selectedSavedScan.name, posts: selectedSavedScan.results, scanMeta: { time_window: selectedSavedScan.time_window, total_scraped: selectedSavedScan.total_scraped, cost_usd: selectedSavedScan.cost_usd, scan_type: selectedSavedScan.scan_type } })} disabled={sharingLoading}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-600 bg-gray-800 text-gray-300 hover:text-white hover:border-gray-500 transition-all disabled:opacity-50">
                    {Icons.share} {sharingLoading ? 'Creating link…' : 'Share Results'}
                  </button>
                )}
              </div>

              {/* Audience Profile for relevance scoring */}
              {selectedSavedScan.results?.length > 0 && (
                <div className="mb-4">
                  <button onClick={() => setShowSavedScanAudienceProfile(!showSavedScanAudienceProfile)}
                    className={`flex items-center gap-2 w-full px-4 py-3 rounded-xl border text-sm font-medium transition-all ${(selectedSavedScan.stream_id && streams.find(s => s.id === selectedSavedScan.stream_id)?.audience_profile) || savedScanAudienceProfile ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400' : 'bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-800'}`}>
                    <span>🎯</span>
                    <span>{(selectedSavedScan.stream_id && streams.find(s => s.id === selectedSavedScan.stream_id)?.audience_profile) || savedScanAudienceProfile ? 'Audience profile set' : 'Set audience profile for relevance scoring'}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`ml-auto transition-transform ${showSavedScanAudienceProfile ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9" /></svg>
                  </button>
                  {showSavedScanAudienceProfile && (
                    <div className="mt-2 p-5 bg-gray-900 border border-gray-700 rounded-xl space-y-3">
                      {selectedSavedScan.stream_id && streams.find(s => s.id === selectedSavedScan.stream_id)?.audience_profile ? (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">From stream: {streams.find(s => s.id === selectedSavedScan.stream_id)?.name}</p>
                          <p className="text-sm text-gray-300 whitespace-pre-wrap">{streams.find(s => s.id === selectedSavedScan.stream_id)?.audience_profile}</p>
                        </div>
                      ) : (
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Audience Profile</label>
                          <p className="text-xs text-gray-500 mb-2">Describe your page, your audience, and what topics are relevant. The AI uses this to score every rising post for relevance.</p>
                          <textarea value={savedScanAudienceProfile} onChange={(e) => setSavedScanAudienceProfile(e.target.value)}
                            rows={6} placeholder={"Example:\nNashville ToDo is a Nashville lifestyle and entertainment Facebook page with 198K followers.\nCore topics: Nashville restaurants, bars, live music, concerts, local events, tourism, things to do, food & drink trends, Southern lifestyle, local business openings/closings."}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Relevance scoring + filter */}
              {(() => {
                const savedScanResults = selectedSavedScan.results || []
                const filteredSavedPosts = relevanceFilter === 'relevant' ? savedScanResults.filter(p => p.relevance_score >= 6) : relevanceFilter === 'irrelevant' ? savedScanResults.filter(p => p.relevance_score !== null && p.relevance_score < 4) : savedScanResults
                return (
                  <>
                    {savedScanResults.length > 0 && (
                      <div className="flex flex-wrap items-center gap-3 mb-4">
                        {!relevanceStats && (
                          <button onClick={() => scoreSavedScanRelevance(savedScanResults)} disabled={relevanceScoring}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${relevanceScoring ? 'bg-indigo-100 text-indigo-400 border border-indigo-200 cursor-not-allowed animate-pulse' : 'bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white shadow-sm shadow-indigo-500/20 hover:shadow-md'}`}>
                            <span>🎯</span> {relevanceScoring ? 'Scoring relevance…' : `Score Relevance (${savedScanResults.length} posts)`}
                          </button>
                        )}
                        {relevanceStats && (
                          <>
                            <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2">
                              <span className="text-xs font-medium text-gray-500">Relevance:</span>
                              <button onClick={() => setRelevanceFilter('all')} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${relevanceFilter === 'all' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>All ({relevanceStats.total})</button>
                              <button onClick={() => setRelevanceFilter('relevant')} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${relevanceFilter === 'relevant' ? 'bg-emerald-500 text-white' : 'text-emerald-400 hover:bg-emerald-500/20'}`}>✓ Relevant ({relevanceStats.relevant})</button>
                              <button onClick={() => setRelevanceFilter('irrelevant')} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${relevanceFilter === 'irrelevant' ? 'bg-red-500 text-white' : 'text-red-400 hover:bg-red-500/20'}`}>✗ Skip ({relevanceStats.irrelevant})</button>
                            </div>
                            <button onClick={() => { setRelevanceStats(null); setRelevanceFilter('all') }} className="text-xs text-gray-500 hover:text-gray-300">Clear scores</button>
                          </>
                        )}
                      </div>
                    )}
                    <RisingPostsList posts={filteredSavedPosts} session={session} likedPostIds={likedPostIds} onToggleLike={toggleLike} />
                  </>
                )
              })()}
              {(!selectedSavedScan.results || selectedSavedScan.results.length === 0) && (
                <div className="bg-gray-900 border border-gray-700 rounded-2xl p-10 text-center"><p className="text-base text-gray-500">This saved scan has no results.</p></div>
              )}
            </div>
          </div>
        )}

        {/* ─── Streams Empty ─── */}
        {view === 'streams' && !selectedStream && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-8">
            {streams.length === 0 ? (
              /* ── Brand new user onboarding ── */
              <div className="max-w-xl mx-auto mt-8">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/25">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Welcome to Rising Posts</h2>
                  <p className="text-gray-400 text-base leading-relaxed">
                    Streams are groups of pages you want to monitor together. Create one, add some pages, and scan — you'll see which posts are rising fastest right now.
                  </p>
                </div>

                {/* Steps */}
                <div className="space-y-3 mb-8">
                  {[
                    { n: '1', title: 'Create a stream', desc: 'Give it a name — e.g. "Competitors", "Finance News", "Local Pages"' },
                    { n: '2', title: 'Add pages to it', desc: 'Paste any public Facebook, Reddit, or X page URL' },
                    { n: '3', title: 'Hit Scan', desc: 'See which posts are gaining the most traction right now, ranked by velocity' },
                  ].map(({ n, title, desc }) => (
                    <div key={n} className="flex items-start gap-4 bg-gray-900 border border-gray-800 rounded-2xl p-4">
                      <div className="w-8 h-8 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-orange-400">{n}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white mb-0.5">{title}</p>
                        <p className="text-sm text-gray-500">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setShowAddStream(true)}
                  className="w-full py-4 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 rounded-2xl text-base font-semibold text-white shadow-lg shadow-orange-500/25 transition-all hover:shadow-orange-500/40 hover:-translate-y-0.5"
                >
                  Create your first stream →
                </button>
                <p className="text-center text-xs text-gray-600 mt-3">You can create as many streams as you need</p>
              </div>
            ) : (
              /* ── Has streams, none selected ── */
              <div className="max-w-xl mx-auto mt-8">
                <p className="text-sm font-semibold text-gray-400 mb-3">Your streams</p>
                <div className="space-y-2">
                  {streams.map(stream => (
                    <button
                      key={stream.id}
                      onClick={() => { setView('streams'); setSelectedStreamId(stream.id) }}
                      className="w-full flex items-center justify-between px-4 py-3.5 bg-gray-900 border border-gray-800 hover:border-orange-500/30 hover:bg-orange-500/5 rounded-2xl transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-400 group-hover:text-orange-400 transition-colors">{Icons.stream}</div>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-white">{stream.name}</p>
                          {stream.is_public && <p className="text-xs text-emerald-400">Public</p>}
                        </div>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600 group-hover:text-orange-400 transition-colors"><polyline points="9 18 15 12 9 6" /></svg>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowAddStream(true)}
                  className="w-full mt-3 py-3 rounded-xl border-2 border-dashed border-gray-700 hover:border-orange-500/50 hover:bg-orange-500/5 text-gray-500 hover:text-orange-400 text-sm font-medium transition-all"
                >
                  + New stream
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── Stream Detail ─── */}
        {view === 'streams' && selectedStream && (() => {
          const streamCategory = selectedStream.category || 'none'
          const categoryFiltered = categoryFilterOn && streamCategory !== 'none' ? risingPosts.filter(p => postMatchesCategory(p, streamCategory)) : risingPosts
          const filteredPosts = relevanceFilter === 'relevant' ? categoryFiltered.filter(p => p.relevance_score >= 6) : relevanceFilter === 'irrelevant' ? categoryFiltered.filter(p => p.relevance_score !== null && p.relevance_score < 4) : categoryFiltered
          const hiddenCount = risingPosts.length - categoryFiltered.length
          return (
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-6 max-w-4xl">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
                <h2 className="text-xl sm:text-2xl font-bold text-white">{selectedStream.name}</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <select value={streamCategory} onChange={(e) => updateStreamCategory(selectedStream.id, e.target.value)}
                    className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-xs font-medium text-gray-300 focus:outline-none focus:border-orange-400 cursor-pointer">
                    {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                  </select>
                  <button onClick={() => toggleStreamPublic(selectedStream.id, !selectedStream.is_public)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium border transition-all ${selectedStream.is_public ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600'}`}>
                    {Icons.globe}
                    {selectedStream.is_public ? 'Public' : 'Make Public'}
                  </button>
                </div>
              </div>

              {/* Compact pages bar */}
              <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 mb-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500">{Icons.stream}</span>
                    <span className="text-sm font-medium text-gray-300">{pages.length} page{pages.length !== 1 ? 's' : ''} monitored</span>
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
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${showAddPage ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-gray-800 hover:bg-gray-700 text-gray-400 border border-gray-700'}`}>
                      {Icons.plus} Add Page
                    </button>
                    {pages.length > 0 && (
                      <button onClick={() => { setShowPages(!showPages); if (!showPages) setShowAddPage(false) }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${showPages ? 'bg-gray-700 text-gray-200 border border-gray-600' : 'bg-gray-800 hover:bg-gray-700 text-gray-400 border border-gray-700'}`}>
                        Manage
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${showPages ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9" /></svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Expandable add form */}
                {showAddPage && (
                  <form onSubmit={(e) => { addPage(e); }} className="mt-4 pt-4 border-t border-gray-800">
                    <div className="flex flex-wrap gap-2 items-end">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Platform</label>
                        <select value={newPagePlatform} onChange={(e) => setNewPagePlatform(e.target.value)} className="px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-xl text-sm text-gray-100 focus:outline-none focus:border-orange-400 appearance-none cursor-pointer pr-10" style={selectStyle}>
                          {Object.entries(PLATFORMS).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                        </select>
                      </div>
                      <div className="flex-1 min-w-[200px]"><label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">URL</label><input type="text" value={newPageUrl} onChange={(e) => setNewPageUrl(e.target.value)} placeholder={PLATFORMS[newPagePlatform].placeholder} className="w-full px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20" /></div>
                      <div className="max-w-[140px]"><label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Label</label><input type="text" value={newPageName} onChange={(e) => setNewPageName(e.target.value)} placeholder="Optional" className="w-full px-4 py-2.5 bg-gray-800 border border-gray-600 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20" /></div>
                      <button type="submit" className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 rounded-xl text-sm font-medium text-white transition-colors">Add</button>
                    </div>
                  </form>
                )}

                {/* Expandable pages list */}
                {showPages && pages.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-800 space-y-1">
                    {pages.map((page) => {
                      const p = PLATFORMS[page.platform] || PLATFORMS.facebook
                      return (
                        <div key={page.id} className="group flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-800 transition-colors">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-sm shrink-0" title={p.label}>{p.icon}</span>
                            <span className="text-sm text-gray-200 truncate">{page.display_name}</span>
                            <span className="text-xs text-gray-600 truncate hidden sm:inline">{page.url}</span>
                          </div>
                          <button onClick={() => deletePage(page.id)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all shrink-0 ml-2">{Icons.trash}</button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {pages.length === 0 && (
                <div className="mb-5 bg-orange-500/5 border border-orange-500/20 rounded-2xl p-5 flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0 text-orange-400">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white mb-1">Add pages to start scanning</p>
                    <p className="text-sm text-gray-400 mb-3">Paste any public Facebook page, Reddit community, or X account you want to track.</p>
                    <button
                      onClick={() => { setShowAddPage(true); setShowPages(false) }}
                      className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-xl text-sm font-semibold text-white transition-colors"
                    >
                      + Add your first page
                    </button>
                  </div>
                </div>
              )}
              <div className="mb-5">
                <ScanControls timeWindow={timeWindow} setTimeWindow={setTimeWindow} minInteractions={minInteractions} setMinInteractions={setMinInteractions} maxInteractions={maxInteractions} setMaxInteractions={setMaxInteractions} onScan={startStreamScan} isScanning={isScanning} disabled={pages.length === 0} onStop={stopScan} costRates={costRates} pageCount={pages.length} />
              </div>

              {/* Email Notifications */}
              {notifSettings && (
                <div className="mb-5">
                  <button onClick={() => setShowNotifSettings(!showNotifSettings)}
                    className={`flex items-center gap-2 w-full px-4 py-3 rounded-xl border text-sm font-medium transition-all ${notifSettings.enabled ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-800'}`}>
                    <span>{notifSettings.enabled ? '🔔' : '🔕'}</span>
                    <span>{notifSettings.enabled ? (
                      notifSettings.schedule_mode === 'interval'
                        ? (() => {
                            const freq = notifSettings.interval_minutes >= 60 ? `${notifSettings.interval_minutes / 60}hr` : `${notifSettings.interval_minutes}min`
                            const start = notifSettings.active_hours_start ?? 0
                            const end = notifSettings.active_hours_end ?? 23
                            const allDay = start === 0 && end === 23
                            const fmtH = h => { const hh = h % 12 || 12; return `${hh}${h < 12 ? 'am' : 'pm'}` }
                            const hours = allDay ? '' : ` · ${fmtH(start)}–${fmtH(end)} CST`
                            return `Every ${freq}${hours} → ${(notifSettings.emails || []).join(', ') || 'no emails set'}`
                          })()
                        : `Sends at ${(notifSettings.send_times || []).join(', ') || 'no times set'} CST → ${(notifSettings.emails || []).join(', ') || 'no emails set'}`
                    ) : 'Email notifications off'}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`ml-auto transition-transform ${showNotifSettings ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9" /></svg>
                  </button>
                  {showNotifSettings && (
                    <div className="mt-2 p-5 bg-gray-900 border border-gray-700 rounded-xl space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-gray-200">Automatic Email Reports</div>
                          <div className="text-xs text-gray-500 mt-0.5">Runs a scan and emails rising posts on your schedule (CST)</div>
                        </div>
                        <button onClick={() => { const updated = { ...notifSettings, enabled: !notifSettings.enabled }; saveNotifSettings(updated) }}
                          className={`relative w-11 h-6 rounded-full transition-colors ${notifSettings.enabled ? 'bg-emerald-500' : 'bg-gray-700'}`}>
                          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${notifSettings.enabled ? 'left-6' : 'left-1'}`} />
                        </button>
                      </div>

                      {/* Schedule mode toggle */}
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Schedule Type</label>
                        <div className="flex bg-gray-800 rounded-lg p-1 gap-1">
                          {[{ value: 'specific_times', label: 'Specific Times' }, { value: 'interval', label: 'Interval' }].map(opt => (
                            <button key={opt.value} onClick={() => setNotifSettings({ ...notifSettings, schedule_mode: opt.value })}
                              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${notifSettings.schedule_mode === opt.value ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-gray-200'}`}>
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Specific times */}
                      {(notifSettings.schedule_mode === 'specific_times' || !notifSettings.schedule_mode) && (
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Send Times (CST)</label>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {['6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM'].map(t => {
                              const times = notifSettings.send_times || []
                              const active = times.includes(t)
                              return <button key={t} onClick={() => setNotifSettings({ ...notifSettings, send_times: active ? times.filter(x => x !== t) : [...times, t].sort((a, b) => { const toMin = s => { const [h, mp] = s.split(':'); const [m, p] = mp.split(' '); return (p === 'PM' && parseInt(h) !== 12 ? parseInt(h) + 12 : p === 'AM' && parseInt(h) === 12 ? 0 : parseInt(h)) * 60 + parseInt(m) }; return toMin(a) - toMin(b) }) })}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${active ? 'bg-orange-500 border-orange-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}`}>{t}</button>
                            })}
                          </div>
                          <p className="text-xs text-gray-500">{(notifSettings.send_times || []).length === 0 ? 'Click times above to select when to receive reports' : `Selected: ${(notifSettings.send_times || []).join(', ')} CST`}</p>
                        </div>
                      )}

                      {/* Interval */}
                      {notifSettings.schedule_mode === 'interval' && (
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Send Every</label>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { label: '30 min', value: 30 },
                              { label: '1 hour', value: 60 },
                              { label: '2 hours', value: 120 },
                              { label: '3 hours', value: 180 },
                              { label: '4 hours', value: 240 },
                              { label: '6 hours', value: 360 },
                              { label: '8 hours', value: 480 },
                              { label: '12 hours', value: 720 },
                            ].map(opt => (
                              <button key={opt.value} onClick={() => setNotifSettings({ ...notifSettings, interval_minutes: opt.value })}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${notifSettings.interval_minutes === opt.value ? 'bg-orange-500 border-orange-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}`}>
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Days of week */}
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Active Days</label>
                        <div className="flex gap-1.5">
                          {[{ label: 'Su', value: 0 }, { label: 'Mo', value: 1 }, { label: 'Tu', value: 2 }, { label: 'We', value: 3 }, { label: 'Th', value: 4 }, { label: 'Fr', value: 5 }, { label: 'Sa', value: 6 }].map(day => {
                            const days = notifSettings.send_days ?? [0,1,2,3,4,5,6]
                            const active = days.includes(day.value)
                            return (
                              <button key={day.value} onClick={() => setNotifSettings({ ...notifSettings, send_days: active ? days.filter(d => d !== day.value) : [...days, day.value].sort() })}
                                className={`w-9 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${active ? 'bg-orange-500 border-orange-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}>
                                {day.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Active hours — only for interval mode */}
                      {notifSettings.schedule_mode === 'interval' && (
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Active Hours (CST)</label>
                          <div className="flex items-center gap-2">
                            <select value={notifSettings.active_hours_start ?? 0} onChange={(e) => setNotifSettings({ ...notifSettings, active_hours_start: parseInt(e.target.value) })}
                              className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-gray-100 focus:outline-none focus:border-orange-400 appearance-none cursor-pointer" style={selectStyle}>
                              {Array.from({ length: 24 }, (_, i) => {
                                const h = i % 12 || 12; const p = i < 12 ? 'AM' : 'PM'
                                return <option key={i} value={i}>{`${h}:00 ${p}`}</option>
                              })}
                            </select>
                            <span className="text-gray-500 text-xs font-medium">to</span>
                            <select value={notifSettings.active_hours_end ?? 23} onChange={(e) => setNotifSettings({ ...notifSettings, active_hours_end: parseInt(e.target.value) })}
                              className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-gray-100 focus:outline-none focus:border-orange-400 appearance-none cursor-pointer" style={selectStyle}>
                              {Array.from({ length: 24 }, (_, i) => {
                                const h = i % 12 || 12; const p = i < 12 ? 'AM' : 'PM'
                                return <option key={i} value={i}>{`${h}:00 ${p}`}</option>
                              })}
                            </select>
                          </div>
                          {(notifSettings.active_hours_start ?? 0) === 0 && (notifSettings.active_hours_end ?? 23) === 23
                            ? <p className="text-xs text-gray-500 mt-1.5">Sending all day</p>
                            : <p className="text-xs text-gray-500 mt-1.5">Only sends between these hours CST</p>
                          }
                        </div>
                      )}
                      <div className="flex flex-wrap gap-3">
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Time Window</label>
                          <select value={notifSettings.time_window_hours} onChange={(e) => setNotifSettings({ ...notifSettings, time_window_hours: parseInt(e.target.value) })}
                            className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-gray-100 focus:outline-none focus:border-orange-400 appearance-none cursor-pointer pr-8" style={selectStyle}>
                            {TIME_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Min Interactions</label>
                          <input type="number" min="0" value={notifSettings.min_interactions} onChange={(e) => setNotifSettings({ ...notifSettings, min_interactions: parseInt(e.target.value) || 0 })}
                            className="w-24 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-gray-100 focus:outline-none focus:border-orange-400" />
                        </div>
                      </div>
                      {/* AI filter toggle */}
                      <div className="flex items-center justify-between py-1">
                        <div>
                          <div className="text-sm font-medium text-gray-300">AI Relevance Filter</div>
                          <div className="text-xs text-gray-500 mt-0.5">Scores posts against your audience profile and removes anything below 6/10 — may reduce results</div>
                        </div>
                        <button onClick={() => setNotifSettings({ ...notifSettings, ai_filter_enabled: !(notifSettings.ai_filter_enabled ?? true) })}
                          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ml-4 ${(notifSettings.ai_filter_enabled ?? true) ? 'bg-indigo-500' : 'bg-gray-700'}`}>
                          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${(notifSettings.ai_filter_enabled ?? true) ? 'left-6' : 'left-1'}`} />
                        </button>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Send to (one email per line)</label>
                        <textarea value={(notifSettings.emails || []).join('\n')} onChange={(e) => setNotifSettings({ ...notifSettings, emails: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })}
                          rows={3} placeholder="you@email.com&#10;teammate@email.com"
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 font-mono" />
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => saveNotifSettings(notifSettings)} disabled={notifSaving}
                          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors">
                          {notifSaving ? 'Saving...' : 'Save Settings'}
                        </button>
                        <button onClick={sendNotifNow} disabled={sendingNow || !notifSettings?.emails?.length}
                          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-colors">
                          {sendingNow ? (
                            <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Scanning &amp; Sending…</>
                          ) : (
                            <><span>📧</span> Scan &amp; Send Now</>
                          )}
                        </button>
                        {notifSettings.last_sent_at && (
                          <span className="text-xs text-gray-500">Last sent: {new Date(notifSettings.last_sent_at).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Audience Profile */}
              <div className="mb-4">
                <button onClick={() => setShowAudienceProfile(!showAudienceProfile)}
                  className={`flex items-center gap-2 w-full px-4 py-3 rounded-xl border text-sm font-medium transition-all ${streams.find(s => s.id === selectedStreamId)?.audience_profile ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400' : 'bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-800'}`}>
                  <span>🎯</span>
                  <span>{streams.find(s => s.id === selectedStreamId)?.audience_profile ? 'Audience profile set' : 'Set audience profile for relevance scoring'}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`ml-auto transition-transform ${showAudienceProfile ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9" /></svg>
                </button>
                {showAudienceProfile && (
                  <div className="mt-2 p-5 bg-gray-900 border border-gray-700 rounded-xl space-y-3">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Audience Profile</label>
                      <p className="text-xs text-gray-500 mb-2">Describe your page, your audience, and what topics are relevant. The AI uses this to score every rising post for relevance.</p>
                      <textarea value={editingAudienceProfile} onChange={(e) => setEditingAudienceProfile(e.target.value)}
                        rows={6} placeholder={"Example:\nNashville ToDo is a Nashville lifestyle and entertainment Facebook page with 198K followers.\nCore topics: Nashville restaurants, bars, live music, concerts, local events, tourism, things to do, food & drink trends, Southern lifestyle, local business openings/closings.\nCrossover topics the audience engages with: national entertainment news with Nashville angles, major concert tours, viral food trends, celebrity sightings, travel content about Nashville.\nNOT relevant: national politics, partisan commentary, purely national news with no local hook."}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20" />
                    </div>
                    <button onClick={saveAudienceProfile} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-sm font-medium text-white transition-colors">Save Profile</button>
                  </div>
                )}
              </div>

              <ScanSummary status={scanStatus} message={scanMessage} postCount={risingPosts.length} totalScraped={scanStats.totalScraped} filteredOut={scanStats.filteredOut} costUsd={scanStats.costUsd} />
              {isScanning && <ScanningAnimation />}

              {/* Relevance scoring + filter */}
              {risingPosts.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  {!relevanceStats && (
                    <button onClick={() => scoreRelevance(risingPosts)} disabled={relevanceScoring}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${relevanceScoring ? 'bg-indigo-100 text-indigo-400 border border-indigo-200 cursor-not-allowed animate-pulse' : 'bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white shadow-sm shadow-indigo-500/20 hover:shadow-md'}`}>
                      <span>🎯</span> {relevanceScoring ? 'Scoring relevance…' : `Score Relevance (${risingPosts.length} posts)`}
                    </button>
                  )}
                  {relevanceStats && (
                    <>
                      <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2">
                        <span className="text-xs font-medium text-gray-500">Relevance:</span>
                        <button onClick={() => setRelevanceFilter('all')} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${relevanceFilter === 'all' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>All ({relevanceStats.total})</button>
                        <button onClick={() => setRelevanceFilter('relevant')} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${relevanceFilter === 'relevant' ? 'bg-emerald-500 text-white' : 'text-emerald-400 hover:bg-emerald-500/20'}`}>✓ Relevant ({relevanceStats.relevant})</button>
                        <button onClick={() => setRelevanceFilter('irrelevant')} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${relevanceFilter === 'irrelevant' ? 'bg-red-500 text-white' : 'text-red-400 hover:bg-red-500/20'}`}>✗ Skip ({relevanceStats.irrelevant})</button>
                      </div>
                      <button onClick={() => { setRelevanceStats(null); setRelevanceFilter('all') }} className="text-xs text-gray-500 hover:text-gray-300">Clear scores</button>
                    </>
                  )}
                </div>
              )}
              {risingPosts.length > 0 && streamCategory !== 'none' && (
                <div className="flex items-center justify-between bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{CATEGORIES[streamCategory]?.icon}</span>
                    <span className="text-sm font-medium text-gray-200">{CATEGORIES[streamCategory]?.label} filter</span>
                    {categoryFilterOn && hiddenCount > 0 && <span className="text-xs text-gray-400 bg-gray-800 rounded-full px-2 py-0.5">{hiddenCount} hidden</span>}
                  </div>
                  <button onClick={() => setCategoryFilterOn(!categoryFilterOn)}
                    className={`relative w-10 h-6 rounded-full transition-colors ${categoryFilterOn ? 'bg-orange-500' : 'bg-gray-700'}`}>
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${categoryFilterOn ? 'left-5' : 'left-1'}`} />
                  </button>
                </div>
              )}

              {filteredPosts.length > 0 && (
                <button onClick={() => createShare({ title: selectedStream?.name || 'Stream Scan', posts: filteredPosts, scanMeta: { time_window: timeWindow, total_scraped: scanStats.totalScraped, cost_usd: scanStats.costUsd } })} disabled={sharingLoading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-600 bg-gray-800 text-gray-300 hover:text-white hover:border-gray-500 transition-all disabled:opacity-50 mb-4">
                  {Icons.share} {sharingLoading ? 'Creating link…' : 'Share Results'}
                </button>
              )}
              {filteredPosts.length > 0 && <RisingPostsList posts={filteredPosts} session={session} likedPostIds={likedPostIds} onToggleLike={toggleLike} />}
              {scanStatus === 'done' && filteredPosts.length === 0 && risingPosts.length > 0 && categoryFilterOn && (
                <div className="bg-gray-900 border border-gray-700 rounded-2xl p-10 text-center">
                  <p className="text-base text-gray-500">All {risingPosts.length} rising posts were filtered out by the {CATEGORIES[streamCategory]?.label} filter.</p>
                  <button onClick={() => setCategoryFilterOn(false)} className="mt-3 text-sm text-orange-400 hover:text-orange-300 font-medium">Turn off filter to see all posts</button>
                </div>
              )}
              {scanStatus === 'done' && risingPosts.length === 0 && (
                <div className="bg-gray-900 border border-gray-700 rounded-2xl p-10 text-center"><p className="text-base text-gray-500">No rising posts found. Try widening the time window or lowering the interaction minimum.</p></div>
              )}
            </div>
          </div>
          )
        })()}

        {/* ─── Public Stream View ─── */}
        {view === 'public' && selectedPublicStream && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-6 max-w-4xl">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-emerald-500 shrink-0">{Icons.globe}</span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white truncate">{selectedPublicStream.name}</h2>
                  <span className="shrink-0 px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/40 rounded-full text-xs font-medium text-emerald-400">Public</span>
                </div>
                <button onClick={clonePublicStream}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium border border-gray-700 bg-gray-800 text-gray-300 hover:bg-orange-500/20 hover:text-orange-400 hover:border-orange-500/40 transition-all">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                  Clone to My Streams
                </button>
              </div>

              {/* Compact pages bar — same as owned streams */}
              <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 mb-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500">{Icons.stream}</span>
                    <span className="text-sm font-medium text-gray-300">{publicPages.length} page{publicPages.length !== 1 ? 's' : ''} monitored</span>
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
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${showPublicPages ? 'bg-gray-700 text-gray-200 border border-gray-600' : 'bg-gray-800 hover:bg-gray-700 text-gray-400 border border-gray-700'}`}>
                      View Pages
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${showPublicPages ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9" /></svg>
                    </button>
                  )}
                </div>

                {showPublicPages && publicPages.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-800 space-y-1">
                    {publicPages.map((page) => {
                      const p = PLATFORMS[page.platform] || PLATFORMS.facebook
                      return (
                        <div key={page.id} className="flex items-center gap-2.5 py-2 px-3 rounded-lg hover:bg-gray-800 transition-colors">
                          <span className="text-sm shrink-0" title={p.label}>{p.icon}</span>
                          <span className="text-sm text-gray-300 truncate">{page.display_name}</span>
                          <span className="text-xs text-gray-600 truncate hidden sm:inline">{page.url}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="mb-5">
                <ScanControls timeWindow={timeWindow} setTimeWindow={setTimeWindow} minInteractions={minInteractions} setMinInteractions={setMinInteractions} maxInteractions={maxInteractions} setMaxInteractions={setMaxInteractions} onScan={startPublicStreamScan} isScanning={isScanning} disabled={publicPages.length === 0} onStop={stopScan} costRates={costRates} pageCount={publicPages.length} />
              </div>

              <ScanSummary status={scanStatus} message={scanMessage} postCount={risingPosts.length} totalScraped={scanStats.totalScraped} filteredOut={scanStats.filteredOut} costUsd={scanStats.costUsd} />
              {isScanning && <ScanningAnimation />}

              {risingPosts.length > 0 && (
                <button onClick={() => createShare({ title: selectedPublicStream?.name || 'Public Stream Scan', posts: risingPosts, scanMeta: { time_window: timeWindow, total_scraped: scanStats.totalScraped, cost_usd: scanStats.costUsd } })} disabled={sharingLoading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-600 bg-gray-800 text-gray-300 hover:text-white hover:border-gray-500 transition-all disabled:opacity-50 mb-4">
                  {Icons.share} {sharingLoading ? 'Creating link…' : 'Share Results'}
                </button>
              )}
              {risingPosts.length > 0 && <RisingPostsList posts={risingPosts} session={session} likedPostIds={likedPostIds} onToggleLike={toggleLike} />}
              {scanStatus === 'done' && risingPosts.length === 0 && (
                <div className="bg-gray-900 border border-gray-700 rounded-2xl p-10 text-center"><p className="text-base text-gray-500">No rising posts found. Try widening the time window or lowering the interaction minimum.</p></div>
              )}
            </div>
          </div>
        )}

        {/* ─── Group Scanner ─── */}
        {view === 'groups' && selectedGroupStreamId && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-6 max-w-4xl">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">👥</span>
                  <h2 className="text-2xl font-bold text-white">{groupStreams.find(s => s.id === selectedGroupStreamId)?.name}</h2>
                </div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
                <p className="text-sm text-blue-300"><strong>Blog Content Finder</strong> — This scans Facebook groups for posts with high engagement (lots of comments and reactions). These are the conversations people care about, making them perfect source material for blog posts and articles.</p>
              </div>

              {/* Pages bar */}
              <div className="bg-gray-900 border border-gray-700 rounded-2xl px-5 py-3 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3"><span className="text-gray-500">👥</span><span className="text-sm text-gray-300 font-medium">{groupPages.length} group{groupPages.length !== 1 ? 's' : ''} monitored</span></div>
                <div className="flex gap-2">
                  <button onClick={() => { setShowAddGroupPage(!showAddGroupPage); setShowGroupPages(false) }} className="text-sm px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800 transition-colors">+ Add Group</button>
                  <button onClick={() => { setShowGroupPages(!showGroupPages); setShowAddGroupPage(false) }} className="text-sm px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800 transition-colors">Manage {showGroupPages ? '▴' : '▾'}</button>
                </div>
              </div>

              {showAddGroupPage && (
                <form onSubmit={addGroupPage} className="bg-gray-900 border border-gray-700 rounded-2xl px-5 py-4 mb-4">
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Group URL or name</label>
                      <input type="text" value={newGroupPageUrl} onChange={(e) => setNewGroupPageUrl(e.target.value)} placeholder="facebook.com/groups/example or just the group name" className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500" />
                    </div>
                    <div className="w-40">
                      <label className="text-xs font-medium text-gray-500 mb-1 block">Label (optional)</label>
                      <input type="text" value={newGroupPageName} onChange={(e) => setNewGroupPageName(e.target.value)} placeholder="Nickname" className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500" />
                    </div>
                    <button type="submit" className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm font-semibold text-white transition-colors">Add</button>
                  </div>
                </form>
              )}

              {showGroupPages && groupPages.length > 0 && (
                <div className="bg-gray-900 border border-gray-700 rounded-2xl px-5 py-3 mb-4 space-y-1">
                  {groupPages.map((page) => (
                    <div key={page.id} className="group flex items-center justify-between py-1.5">
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-gray-200">{page.display_name}</span>
                        <span className="text-xs text-gray-500 ml-2 truncate">{page.url.replace('https://www.facebook.com/', '')}</span>
                      </div>
                      <button onClick={() => deleteGroupPage(page.id)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all">{Icons.trash}</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Scan controls */}
              <div className="pt-4 border-t border-gray-800 mb-5">
                <div className="flex flex-wrap gap-4 items-end">
                  <div>
                    <label className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">🕐 Time Window</label>
                    <select value={groupTimeWindow} onChange={(e) => setGroupTimeWindow(parseFloat(e.target.value))} className="px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-xl text-sm text-gray-100 focus:outline-none focus:border-blue-500">
                      <option value={6}>Last 6 hours</option>
                      <option value={12}>Last 12 hours</option>
                      <option value={24}>Last 24 hours</option>
                      <option value={48}>Last 48 hours</option>
                      <option value={72}>Last 72 hours</option>
                    </select>
                  </div>
                  <div>
                    <label className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">💬 Min Comments</label>
                    <input type="number" value={groupMinComments} onChange={(e) => setGroupMinComments(parseInt(e.target.value) || 0)} className="w-24 px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-xl text-sm text-gray-100 focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">👍 Min Reactions</label>
                    <input type="number" value={groupMinReactions} onChange={(e) => setGroupMinReactions(parseInt(e.target.value) || 0)} className="w-24 px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-xl text-sm text-gray-100 focus:outline-none focus:border-blue-500" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={startGroupScan} disabled={isGroupScanning || groupPages.length === 0}
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${isGroupScanning ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 cursor-not-allowed animate-pulse-glow' : groupPages.length === 0 ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-sm shadow-blue-500/20 hover:shadow-md'}`}>
                      {Icons.scan}{isGroupScanning ? 'Scanning...' : 'Scan Groups'}
                    </button>
                    {isGroupScanning && (
                      <button onClick={stopScan} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gray-900 border border-red-500/40 text-red-400 hover:bg-red-500/10 hover:border-red-400 transition-all">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                        Stop
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {(() => {
                    if (groupPages.length === 0) return 'Add groups to start scanning.'
                    const rl = groupTimeWindow <= 6 ? 30 : groupTimeWindow <= 12 ? 40 : groupTimeWindow <= 24 ? 50 : groupTimeWindow <= 48 ? 75 : 100
                    const bk = groupTimeWindow <= 6 ? '6h' : groupTimeWindow <= 12 ? '12h' : groupTimeWindow <= 24 ? '24h' : '48h+'
                    const br = costRates?.rates?.groups?.[bk]
                    const or2 = costRates?.overall?.groups
                    let est, src
                    if (br) { est = br.costPerResult * rl * groupPages.length; src = `based on ${br.sampleSize} scan${br.sampleSize !== 1 ? 's' : ''}` }
                    else if (or2) { est = or2 * rl * groupPages.length; src = 'avg across all scans' }
                    else { est = groupPages.length * rl * 0.0015; src = 'estimated' }
                    return <>{groupPages.length} group{groupPages.length !== 1 ? 's' : ''} × {rl} posts each · Est. cost: <span className={`font-medium ${est > 0.50 ? 'text-amber-500' : 'text-emerald-500'}`}>${est.toFixed(2)}</span> <span className="text-gray-600">({src})</span></>
                  })()}
                </p>
              </div>

              <ScanSummary status={groupScanStatus} message={groupScanMessage} postCount={groupPosts.length} totalScraped={groupScanStats.totalScraped} filteredOut={groupScanStats.filteredOut} costUsd={groupScanStats.costUsd} />
              {isGroupScanning && <ScanningAnimation />}
              {groupPosts.length > 0 && (
                <button onClick={() => createShare({ title: groupStreams.find(s => s.id === selectedGroupStreamId)?.name || 'Group Scan', posts: groupPosts, scanMeta: { time_window: groupTimeWindow, total_scraped: groupScanStats.totalScraped, cost_usd: groupScanStats.costUsd, scan_type: 'groups' } })} disabled={sharingLoading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-600 bg-gray-800 text-gray-300 hover:text-white hover:border-gray-500 transition-all disabled:opacity-50 mb-4">
                  {Icons.share} {sharingLoading ? 'Creating link…' : 'Share Results'}
                </button>
              )}
              {groupPosts.length > 0 && (
                <div className="space-y-3">
                  {groupPosts.map((post, i) => (
                    <div key={post.post_id || i} className="bg-gray-900 border border-gray-700 rounded-2xl p-5 hover:border-gray-500 transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">👥</span>
                          <span className="text-sm font-bold uppercase tracking-wide text-orange-400">{post.page_name}</span>
                          {post.age_hours != null && <span className="text-xs text-gray-500">({post.age_hours}h old)</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => toggleLike(post)} className={`transition-colors ${likedPostIds.has(post.post_id) ? 'text-rose-500' : 'text-gray-600 hover:text-rose-400'}`} title={likedPostIds.has(post.post_id) ? 'Unlike' : 'Like'}>
                            <HeartIcon filled={likedPostIds.has(post.post_id)} />
                          </button>
                          {post.post_url && <a href={post.post_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs font-medium text-orange-400 hover:text-orange-300 transition-colors">View Post →</a>}
                        </div>
                      </div>
                      <p className="text-gray-200 text-base leading-relaxed mb-3">{post.content_preview}</p>
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
                  ))}
                </div>
              )}
              {groupScanStatus === 'done' && groupPosts.length === 0 && (
                <div className="bg-gray-900 border border-gray-700 rounded-2xl p-10 text-center"><p className="text-base text-gray-500">No posts met your thresholds. Try lowering the minimum comments or reactions, or widening the time window.</p></div>
              )}
            </div>
          </div>
        )}
        {view === 'groups' && !selectedGroupStreamId && (
          <div className="flex-1 flex items-center justify-center"><p className="text-gray-500">Select or create a group stream to start scanning.</p></div>
        )}

        {/* ─── Liked Posts ─── */}
        {view === 'likes' && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-6 max-w-4xl">
              <div className="flex items-center gap-3 mb-6">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                <h2 className="text-2xl font-bold text-white">Liked Posts</h2>
                {likedPosts.length > 0 && <span className="text-xs text-gray-400 bg-gray-800 rounded-full px-2.5 py-0.5">{likedPosts.length}</span>}
              </div>
              {likedPosts.length === 0 ? (
                <div className="bg-gray-900 border border-gray-700 rounded-2xl p-10 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center mx-auto mb-4">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                  </div>
                  <p className="text-base text-gray-500">No liked posts yet. Hit the heart icon on any post to save it here.</p>
                </div>
              ) : (
                <RisingPostsList posts={likedPosts.map(lp => lp.post_data)} session={session} likedPostIds={likedPostIds} onToggleLike={toggleLike} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
