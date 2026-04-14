// Manual triage scan trigger — runs the full overnight pipeline on demand.
// Uses a high timeout for Vercel Pro (maxDuration 300s). For free plans this
// may time out on large streams; overnight cron is preferred for those.
export const maxDuration = 300

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const SCAN_TIME_WINDOW_HOURS = 6
const RESULTS_LIMIT = 20

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function getUser(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  ).auth.getUser()
  return user
}

async function startApify(pageUrls, token) {
  const newerThan = new Date(Date.now() - SCAN_TIME_WINDOW_HOURS * 3600000).toISOString()
  const res = await fetch(
    `https://api.apify.com/v2/acts/apify~facebook-posts-scraper/runs?token=${token}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startUrls: pageUrls.map(url => ({ url })), resultsLimit: RESULTS_LIMIT, newerThan }),
    }
  )
  if (!res.ok) throw new Error(`Apify start failed: ${res.status}`)
  return (await res.json()).data?.id
}

async function pollApify(runId, token, timeoutMs = 270000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    await new Promise(r => setTimeout(r, 8000))
    const data = await (await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`)).json()
    const status = data.data?.status
    if (status === 'SUCCEEDED') return
    if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) throw new Error(`Apify ${status}`)
  }
  throw new Error('Apify timed out')
}

async function getApifyResults(runId, token) {
  const res = await fetch(`https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${token}&limit=500`)
  return res.json()
}

function normalizePost(raw) {
  const reactions = raw.likesCount ?? raw.reactionsCount ?? raw.likes ?? raw.reactions ?? 0
  const comments = raw.commentsCount ?? raw.comments ?? 0
  const shares = raw.sharesCount ?? raw.shares ?? 0
  const total = reactions + comments + shares
  const postedAt = raw.date || raw.time || raw.createdAt || raw.timestamp || null
  const ageHours = postedAt ? Math.max(0.1, (Date.now() - new Date(postedAt).getTime()) / 3600000) : 6
  return {
    url: (raw.url || raw.postUrl || raw.link || '').split('?')[0],
    content: (raw.text || raw.message || raw.content || '').slice(0, 500),
    title: raw.pageName || raw.authorName || '',
    image_url: raw.media?.[0]?.url || raw.topImage || null,
    posted_at: postedAt,
    total_interactions: total,
    velocity: Math.round((total / ageHours) * 10) / 10,
  }
}

async function scoreRelevance(posts, persona, customPrompt) {
  if (!process.env.OPENAI_API_KEY || !persona || !posts.length) return posts
  const summaries = posts.slice(0, 30).map((p, i) => `[${i}] ${p.title ? p.title + ': ' : ''}${p.content.slice(0, 200)}`).join('\n')
  const prompt = `${customPrompt || 'You are a relevance filter for a Facebook page.'}

AUDIENCE PERSONA:
${persona}

Score each post 1-10 for relevance. Respond ONLY with valid JSON:
[{"i":index,"s":score,"r":"one line reason"}]

POSTS:
${summaries}`
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], max_tokens: 2000, temperature: 0.2 }),
    })
    if (!res.ok) return posts
    const data = await res.json()
    const scores = JSON.parse((data.choices?.[0]?.message?.content || '[]').replace(/```json\s*/g, '').replace(/```/g, '').trim())
    return posts.map((p, i) => { const s = scores.find(x => x.i === i); return { ...p, ai_relevance_score: s?.s ?? null, ai_relevance_reason: s?.r ?? null } })
  } catch { return posts }
}

async function updateTopFive(db, pageId) {
  const { data: cards } = await db.from('triage_cards').select('id,velocity,ai_relevance_score').eq('triage_page_id', pageId).eq('is_archived', false).limit(500)
  if (!cards?.length) return
  const ranked = cards.map(c => ({ id: c.id, score: (c.ai_relevance_score || 0) * 10 + (c.velocity || 0) })).sort((a, b) => b.score - a.score)
  const topIds = ranked.slice(0, 5).map(c => c.id)
  const restIds = ranked.slice(5).map(c => c.id)
  await Promise.all([
    topIds.length ? db.from('triage_cards').update({ is_top_five: true }).in('id', topIds) : Promise.resolve(),
    restIds.length ? db.from('triage_cards').update({ is_top_five: false }).in('id', restIds) : Promise.resolve(),
  ])
}

export async function POST(request) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { triagePageId } = await request.json()
  if (!triagePageId) return NextResponse.json({ error: 'Missing triagePageId' }, { status: 400 })

  const db = svc()

  // Verify ownership and get page config
  const { data: page, error: pageErr } = await db.from('triage_pages').select('*').eq('id', triagePageId).eq('user_id', user.id).single()
  if (pageErr || !page) return NextResponse.json({ error: 'Page not found' }, { status: 404 })
  if (!page.stream_id) return NextResponse.json({ error: 'No stream configured for this page' }, { status: 400 })

  // Get Apify token
  const { data: settings } = await db.from('user_settings').select('apify_api_token').eq('user_id', user.id).single()
  const apifyToken = settings?.apify_api_token
  if (!apifyToken) return NextResponse.json({ error: 'No Apify API token in your settings' }, { status: 400 })

  // Get stream page URLs
  const { data: monitoredPages } = await db.from('monitored_pages').select('url,platform').eq('stream_id', page.stream_id)
  const pageUrls = (monitoredPages || []).filter(p => !p.platform || p.platform === 'facebook').map(p => p.url).filter(u => u?.startsWith('http'))
  if (!pageUrls.length) return NextResponse.json({ error: 'No valid Facebook pages in this stream' }, { status: 400 })

  try {
    const runId = await startApify(pageUrls, apifyToken)
    await pollApify(runId, apifyToken)
    const rawResults = await getApifyResults(runId, apifyToken)

    const normalized = rawResults.map(normalizePost).filter(p => p.total_interactions > 0 && p.url)

    // Dedup
    const { data: existing } = await db.from('triage_cards').select('url').eq('triage_page_id', triagePageId).limit(2000)
    const existingUrls = new Set((existing || []).map(c => c.url?.toLowerCase()))
    const deduped = normalized.filter(p => !existingUrls.has(p.url?.toLowerCase()))

    let added = 0
    if (deduped.length) {
      const scored = await scoreRelevance(deduped, page.persona, page.relevance_prompt)
      const toInsert = scored.map(p => ({
        triage_page_id: triagePageId,
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
      for (let i = 0; i < toInsert.length; i += 50) {
        await db.from('triage_cards').insert(toInsert.slice(i, i + 50))
        added += Math.min(50, toInsert.length - i)
      }
      await updateTopFive(db, triagePageId)
    }

    // Log success
    await db.from('triage_scan_log').insert({ triage_page_id: triagePageId, page_name: page.name, scan_type: 'apify', status: 'success', items_processed: added })

    return NextResponse.json({ success: true, added, total: rawResults.length })
  } catch (err) {
    await db.from('triage_scan_log').insert({ triage_page_id: triagePageId, page_name: page.name, scan_type: 'apify', status: 'failed', error_message: err.message })
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
