// Triage Overnight Scan
// Runs every 30 min via GitHub Actions. Checks DB for configured scan times
// and runs the full pipeline (Apify → normalize → dedup → AI score → rank → top 5).

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const RESULTS_LIMIT = 20
const SCAN_MATCH_WINDOW_MINUTES = 20 // ±20 min window around configured time

// ─── Supabase REST helper ───
async function sb(path, method = 'GET', body = null, params = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}${params}`, {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: method === 'POST' ? 'return=representation' : 'return=minimal',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Supabase ${method} ${path}: ${res.status} ${err}`)
  }
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

// ─── Time helpers ───
function timeMatchesCT(configuredTime) {
  // configuredTime format: "22:00", "01:00", "04:00"
  const [h, m] = configuredTime.split(':').map(Number)
  const now = new Date()
  const ct = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }))
  const currentMin = ct.getHours() * 60 + ct.getMinutes()
  const scheduledMin = h * 60 + m
  const diff = Math.abs(currentMin - scheduledMin)
  return Math.min(diff, 1440 - diff) <= SCAN_MATCH_WINDOW_MINUTES
}

// ─── Apify helpers ───
async function startApifyScan(pageUrls, apifyToken, windowHours = 6) {
  const newerThan = new Date(Date.now() - windowHours * 3600000).toISOString()
  const res = await fetch(
    `https://api.apify.com/v2/acts/apify~facebook-posts-scraper/runs?token=${apifyToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startUrls: pageUrls.map(url => ({ url })),
        resultsLimit: RESULTS_LIMIT,
        newerThan,
      }),
    }
  )
  if (!res.ok) throw new Error(`Apify start failed: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return data.data?.id
}

async function pollApifyRun(runId, apifyToken, timeoutMs = 300000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    await new Promise(r => setTimeout(r, 10000))
    const res = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`)
    const data = await res.json()
    const status = data.data?.status
    if (status === 'SUCCEEDED') return
    if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) throw new Error(`Apify run ${status}`)
  }
  throw new Error('Apify run timed out after 5 minutes')
}

async function getApifyResults(runId, apifyToken) {
  const res = await fetch(
    `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apifyToken}&limit=500`
  )
  if (!res.ok) throw new Error(`Failed to get results: ${res.status}`)
  return res.json()
}

// ─── Post normalization ───
function normalizePost(raw) {
  const reactions = raw.likesCount ?? raw.reactionsCount ?? raw.likes ?? raw.reactions ?? 0
  const comments = raw.commentsCount ?? raw.comments ?? 0
  const shares = raw.sharesCount ?? raw.shares ?? 0
  const total = reactions + comments + shares
  const postedAt = raw.date || raw.time || raw.createdAt || raw.timestamp || null
  const ageHours = postedAt ? Math.max(0.1, (Date.now() - new Date(postedAt).getTime()) / 3600000) : 6
  const velocity = Math.round((total / ageHours) * 10) / 10
  return {
    url: (raw.url || raw.postUrl || raw.link || '').split('?')[0],
    content: (raw.text || raw.message || raw.content || '').slice(0, 500),
    title: raw.pageName || raw.authorName || raw.pageId || '',
    image_url: raw.media?.[0]?.url || raw.topImage || null,
    posted_at: postedAt,
    total_interactions: total,
    velocity,
    reactions,
    comments,
    shares,
  }
}

// ─── AI relevance scoring (two-pass) ───
async function scoreRelevance(posts, persona, customPrompt, examplePosts = []) {
  if (!OPENAI_API_KEY || !persona || posts.length === 0) return posts

  // ── Pass 1: gpt-4o-mini cheap bulk filter ──
  let candidates = posts
  try {
    const summaries = posts.slice(0, 40).map((p, i) =>
      `[${i}] ${p.title ? p.title + ': ' : ''}${p.content.slice(0, 150)}`
    ).join('\n')
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: `Filter these posts for basic topical relevance. Score each 1-10 (1=off-topic, 10=clearly relevant). Be lenient. Respond ONLY with valid JSON: [{"i":index,"s":score}]\n\nPAGE TOPIC:\n${persona.slice(0, 300)}\n\nPOSTS:\n${summaries}` }],
        max_tokens: 600, temperature: 0.1,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      const scores = JSON.parse((data.choices?.[0]?.message?.content || '[]').replace(/```json\s*/g, '').replace(/```/g, '').trim())
      const passing = new Set(scores.filter(x => x.s >= 4).map(x => x.i))
      if (passing.size > 0) {
        candidates = posts.filter((_, i) => passing.has(i))
        console.log(`[triage] Pass 1 filter: ${posts.length} → ${candidates.length} posts`)
      }
    }
  } catch (e) {
    console.error('[triage] Pass 1 filter failed, using all posts:', e.message)
  }

  // ── Pass 2: gpt-4o deep persona scoring with example image context ──
  const exampleImages = (examplePosts || []).map(e => e.image_url).filter(Boolean).slice(0, 4)
  const summaries2 = candidates.slice(0, 20).map((p, i) =>
    `[${i}] ${p.title ? p.title + ': ' : ''}${p.content.slice(0, 200)}`
  ).join('\n')
  const textBlock = `${customPrompt || 'You are a relevance filter for a Facebook page.'}\n\nAUDIENCE PERSONA:\n${persona}\n\nScore each post 1-10 for relevance to this page's specific audience. Respond ONLY with valid JSON:\n[{"i":index,"s":score,"r":"one line reason"}]\n\nPOSTS:\n${summaries2}`
  const userContent = exampleImages.length > 0
    ? [
        { type: 'text', text: 'These images are example posts showing this page\'s content style:\n' },
        ...exampleImages.map(url => ({ type: 'image_url', image_url: { url, detail: 'low' } })),
        { type: 'text', text: '\n' + textBlock },
      ]
    : textBlock
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: userContent }],
        max_tokens: 1500, temperature: 0.2,
      }),
    })
    if (!res.ok) return candidates
    const data = await res.json()
    const scores = JSON.parse((data.choices?.[0]?.message?.content || '[]').replace(/```json\s*/g, '').replace(/```/g, '').trim())
    return candidates.map((p, i) => {
      const s = scores.find(x => x.i === i)
      return { ...p, ai_relevance_score: s?.s ?? null, ai_relevance_reason: s?.r ?? null }
    })
  } catch (e) {
    console.error('[triage] Pass 2 scoring failed:', e.message)
    return candidates
  }
}

// ─── Update top-5 for a page ───
async function updateTopFive(pageId) {
  const cards = await sb(
    'triage_cards', 'GET', null,
    `?triage_page_id=eq.${pageId}&is_archived=eq.false&select=id,velocity,ai_relevance_score&limit=500`
  )
  if (!cards?.length) return

  const ranked = cards
    .map(c => ({ id: c.id, score: (c.ai_relevance_score || 0) * 10 + (c.velocity || 0) }))
    .sort((a, b) => b.score - a.score)

  const topIds = ranked.slice(0, 5).map(c => c.id)
  const restIds = ranked.slice(5).map(c => c.id)

  if (topIds.length) {
    await sb(`triage_cards?id=in.(${topIds.join(',')})`, 'PATCH', { is_top_five: true })
  }
  if (restIds.length) {
    await sb(`triage_cards?id=in.(${restIds.join(',')})`, 'PATCH', { is_top_five: false })
  }
}

// ─── Log scan result ───
async function logScan(pageId, pageName, scanType, status, errorMessage = null, itemsProcessed = 0) {
  try {
    await sb('triage_scan_log', 'POST', {
      triage_page_id: pageId,
      page_name: pageName,
      scan_type: scanType,
      status,
      error_message: errorMessage,
      items_processed: itemsProcessed,
    })
  } catch (e) {
    console.error('[triage] Failed to write log:', e.message)
  }
}

// ─── Full scan pipeline for one triage page ───
export async function runTriageScan(page, apifyToken) {
  console.log(`[triage] Scanning: ${page.name}`)

  // Get Facebook pages from linked stream
  const monitoredPages = await sb(
    'monitored_pages', 'GET', null,
    `?stream_id=eq.${page.stream_id}&select=url,platform`
  )
  const pageUrls = (monitoredPages || [])
    .filter(p => !p.platform || p.platform === 'facebook')
    .map(p => p.url)
    .filter(u => u?.startsWith('http'))

  if (!pageUrls.length) {
    console.log(`[triage] ${page.name}: no valid Facebook page URLs in stream`)
    return { added: 0, total: 0 }
  }

  // Fetch example posts for AI image context (in parallel with Apify start)
  const [examplePostsResult] = await Promise.all([
    sb('triage_example_posts', 'GET', null, `?triage_page_id=eq.${page.id}&select=image_url,content,url&limit=4`),
  ])
  const examplePosts = examplePostsResult || []

  console.log(`[triage] ${page.name}: ${pageUrls.length} pages → starting Apify`)
  const runId = await startApifyScan(pageUrls, apifyToken, page.scan_window_hours || 6)
  await pollApifyRun(runId, apifyToken)
  const rawResults = await getApifyResults(runId, apifyToken)
  console.log(`[triage] ${page.name}: ${rawResults.length} raw results`)

  const normalized = rawResults.map(normalizePost).filter(p => p.total_interactions > 0 && p.url && !p.url.includes('/reel/'))

  // Deduplicate against existing cards
  const existing = await sb(
    'triage_cards', 'GET', null,
    `?triage_page_id=eq.${page.id}&select=url&limit=2000`
  )
  const existingUrls = new Set((existing || []).map(c => c.url?.toLowerCase()))
  const deduped = normalized.filter(p => !existingUrls.has(p.url?.toLowerCase()))
  console.log(`[triage] ${page.name}: ${deduped.length} new after dedup`)

  if (!deduped.length) {
    await logScan(page.id, page.name, 'apify', 'success', null, 0)
    return { added: 0, total: rawResults.length }
  }

  // AI relevance scoring (two-pass: gpt-4o-mini filter → gpt-4o deep score)
  const scored = await scoreRelevance(deduped, page.persona, page.relevance_prompt, examplePosts)

  // Insert cards
  const toInsert = scored.map(p => ({
    triage_page_id: page.id,
    source_type: 'facebook',
    title: p.title,
    url: p.url,
    content: p.content,
    image_url: p.image_url,
    total_interactions: p.total_interactions,
    velocity: p.velocity,
    ai_relevance_score: p.ai_relevance_score,
    ai_relevance_reason: p.ai_relevance_reason,
    is_top_five: false,
    is_archived: false,
    scan_run_id: runId,
    raw_data: p,
  }))

  let added = 0
  for (let i = 0; i < toInsert.length; i += 50) {
    await sb('triage_cards', 'POST', toInsert.slice(i, i + 50))
    added += Math.min(50, toInsert.length - i)
  }

  await updateTopFive(page.id)
  await logScan(page.id, page.name, 'apify', 'success', null, added)
  console.log(`[triage] ${page.name}: inserted ${added} cards`)
  return { added, total: rawResults.length }
}

// ─── Main ───
async function main() {
  console.log(`[triage-overnight] ${new Date().toISOString()}`)

  const pages = await sb('triage_pages', 'GET', null, '?select=*')
  if (!pages?.length) { console.log('[triage-overnight] No pages configured'); return }

  const due = pages.filter(p => p.scan_enabled !== false && p.stream_id && p.scan_times?.some(t => timeMatchesCT(t)))
  if (!due.length) { console.log('[triage-overnight] No pages due at this time'); return }
  console.log(`[triage-overnight] ${due.length} page(s) due`)

  for (const page of due) {
    const settings = await sb('user_settings', 'GET', null, `?user_id=eq.${page.user_id}&select=apify_api_token`)
    const apifyToken = settings?.[0]?.apify_api_token || process.env.APIFY_API_TOKEN
    if (!apifyToken) {
      console.log(`[triage] ${page.name}: no Apify token`)
      await logScan(page.id, page.name, 'apify', 'failed', 'No Apify API token configured')
      continue
    }
    try {
      await runTriageScan(page, apifyToken)
    } catch (err) {
      console.error(`[triage] ${page.name} FAILED:`, err.message)
      await logScan(page.id, page.name, 'apify', 'failed', err.message)
    }
  }
  console.log('[triage-overnight] Done')
}

main().catch(err => { console.error('[triage-overnight] Fatal:', err); process.exit(1) })
