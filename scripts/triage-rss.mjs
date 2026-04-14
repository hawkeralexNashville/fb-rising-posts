// Triage RSS Poll
// Runs every hour via GitHub Actions. Fetches Google News RSS for each keyword
// configured per triage page and stores new items as triage_cards.

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

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

// ─── RSS fetch and parse ───
async function fetchRss(keyword) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=en-US&gl=US&ceid=US:en`
  const res = await fetch(url, { headers: { Accept: 'application/rss+xml, text/xml' } })
  if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`)
  return parseRss(await res.text())
}

function parseRss(xml) {
  const items = []
  for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const item = match[1]
    const title =
      item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/s)?.[1] ||
      item.match(/<title>(.*?)<\/title>/s)?.[1] || ''
    const link =
      item.match(/<link>(.*?)<\/link>/s)?.[1] ||
      item.match(/<guid[^>]*>(.*?)<\/guid>/s)?.[1] || ''
    const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/s)?.[1] || ''
    const desc =
      item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/s)?.[1] ||
      item.match(/<description>(.*?)<\/description>/s)?.[1] || ''
    if (title && link) {
      items.push({
        title: title.trim(),
        url: link.trim(),
        published_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        content: desc.replace(/<[^>]+>/g, '').trim().slice(0, 500),
      })
    }
  }
  return items
}

// ─── AI relevance scoring for RSS items ───
async function scoreRssRelevance(items, persona, customPrompt) {
  if (!OPENAI_API_KEY || !persona || items.length === 0) return items
  const summaries = items.slice(0, 30).map((p, i) => `[${i}] ${p.title}`).join('\n')
  const prompt = `${customPrompt || 'You are a relevance filter for a Facebook page.'}

AUDIENCE PERSONA:
${persona}

Score each headline 1-10 for relevance to this page's audience. Respond ONLY with valid JSON:
[{"i":index,"s":score,"r":"one line reason"}]

HEADLINES:
${summaries}`

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1500,
        temperature: 0.2,
      }),
    })
    if (!res.ok) return items
    const data = await res.json()
    const raw = data.choices?.[0]?.message?.content || '[]'
    const scores = JSON.parse(raw.replace(/```json\s*/g, '').replace(/```/g, '').trim())
    return items.map((p, i) => {
      const s = scores.find(x => x.i === i)
      return { ...p, ai_relevance_score: s?.s ?? null, ai_relevance_reason: s?.r ?? null }
    })
  } catch (e) {
    console.error('[triage-rss] AI scoring failed:', e.message)
    return items
  }
}

// ─── Log scan result ───
async function logScan(pageId, pageName, status, errorMessage = null, itemsProcessed = 0) {
  try {
    await sb('triage_scan_log', 'POST', {
      triage_page_id: pageId,
      page_name: pageName,
      scan_type: 'rss',
      status,
      error_message: errorMessage,
      items_processed: itemsProcessed,
    })
  } catch (e) {
    console.error('[triage-rss] Failed to write log:', e.message)
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
  if (topIds.length) await sb(`triage_cards?id=in.(${topIds.join(',')})`, 'PATCH', { is_top_five: true })
  if (restIds.length) await sb(`triage_cards?id=in.(${restIds.join(',')})`, 'PATCH', { is_top_five: false })
}

// ─── Main ───
async function main() {
  console.log(`[triage-rss] ${new Date().toISOString()}`)

  const pages = await sb('triage_pages', 'GET', null, '?select=id,name,user_id,persona,relevance_prompt')
  if (!pages?.length) { console.log('[triage-rss] No pages configured'); return }

  for (const page of pages) {
    const keywords = await sb('triage_rss_keywords', 'GET', null, `?triage_page_id=eq.${page.id}&select=keyword`)
    if (!keywords?.length) { console.log(`[triage-rss] ${page.name}: no keywords`); continue }

    // Existing URLs for dedup
    const existing = await sb('triage_cards', 'GET', null, `?triage_page_id=eq.${page.id}&source_type=eq.rss&select=url&limit=2000`)
    const existingUrls = new Set((existing || []).map(c => c.url?.toLowerCase()))

    let totalNew = 0
    const allNewItems = []

    for (const { keyword } of keywords) {
      try {
        const items = await fetchRss(keyword)
        const fresh = items.filter(item => item.url && !existingUrls.has(item.url.toLowerCase()))
        fresh.forEach(item => existingUrls.add(item.url.toLowerCase()))
        allNewItems.push(...fresh)
        console.log(`[triage-rss] ${page.name} / "${keyword}": ${fresh.length} new of ${items.length}`)
      } catch (err) {
        console.error(`[triage-rss] ${page.name} / "${keyword}": ${err.message}`)
        await logScan(page.id, page.name, 'failed', `Keyword "${keyword}": ${err.message}`)
      }
    }

    if (!allNewItems.length) continue

    // Score relevance for new RSS items
    const scored = await scoreRssRelevance(allNewItems, page.persona, page.relevance_prompt)

    // Insert
    const toInsert = scored.map(item => ({
      triage_page_id: page.id,
      source_type: 'rss',
      title: item.title,
      url: item.url,
      content: item.content,
      total_interactions: 0,
      velocity: 0,
      ai_relevance_score: item.ai_relevance_score ?? null,
      ai_relevance_reason: item.ai_relevance_reason ?? null,
      is_top_five: false,
      is_archived: false,
      raw_data: item,
    }))

    for (let i = 0; i < toInsert.length; i += 50) {
      await sb('triage_cards', 'POST', toInsert.slice(i, i + 50))
      totalNew += Math.min(50, toInsert.length - i)
    }

    await updateTopFive(page.id)
    await logScan(page.id, page.name, 'success', null, totalNew)
    console.log(`[triage-rss] ${page.name}: added ${totalNew} RSS cards`)
  }

  console.log('[triage-rss] Done')
}

main().catch(err => { console.error('[triage-rss] Fatal:', err); process.exit(1) })
