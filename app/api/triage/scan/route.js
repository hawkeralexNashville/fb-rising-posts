// Manual triage scan trigger — runs the full overnight pipeline on demand.
// Uses a high timeout for Vercel Pro (maxDuration 300s). For free plans this
// may time out on large streams; overnight cron is preferred for those.
export const maxDuration = 300

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

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

async function startApify(pageUrls, token, windowHours = 6) {
  const newerThan = new Date(Date.now() - windowHours * 3600000).toISOString()
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

async function scoreRelevance(posts, persona, customPrompt, examplePosts = []) {
  if (!process.env.OPENAI_API_KEY || !persona || !posts.length) return posts

  // ── Pass 1: gpt-4o-mini cheap bulk filter ──
  let candidates = posts
  try {
    const summaries = posts.slice(0, 40).map((p, i) =>
      `[${i}] ${p.title ? p.title + ': ' : ''}${p.content.slice(0, 150)}`
    ).join('\n')
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
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
      if (passing.size > 0) candidates = posts.filter((_, i) => passing.has(i))
    }
  } catch {}

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
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o', messages: [{ role: 'user', content: userContent }], max_tokens: 1500, temperature: 0.2 }),
    })
    if (!res.ok) return candidates
    const data = await res.json()
    const scores = JSON.parse((data.choices?.[0]?.message?.content || '[]').replace(/```json\s*/g, '').replace(/```/g, '').trim())
    return candidates.map((p, i) => { const s = scores.find(x => x.i === i); return { ...p, ai_relevance_score: s?.s ?? null, ai_relevance_reason: s?.r ?? null } })
  } catch { return candidates }
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

  // Get stream page URLs and example posts (for AI context)
  const [{ data: monitoredPages }, { data: examplePosts }] = await Promise.all([
    db.from('monitored_pages').select('url,platform').eq('stream_id', page.stream_id),
    db.from('triage_example_posts').select('image_url,content,url').eq('triage_page_id', triagePageId).limit(4),
  ])
  const pageUrls = (monitoredPages || []).filter(p => !p.platform || p.platform === 'facebook').map(p => p.url).filter(u => u?.startsWith('http'))
  if (!pageUrls.length) return NextResponse.json({ error: 'No valid Facebook pages in this stream' }, { status: 400 })

  try {
    const runId = await startApify(pageUrls, apifyToken, page.scan_window_hours || 6)
    await pollApify(runId, apifyToken)
    const rawResults = await getApifyResults(runId, apifyToken)

    const normalized = rawResults.map(normalizePost).filter(p => p.total_interactions > 0 && p.url && !p.url.includes('/reel/'))

    // Dedup
    const { data: existing } = await db.from('triage_cards').select('url').eq('triage_page_id', triagePageId).limit(2000)
    const existingUrls = new Set((existing || []).map(c => c.url?.toLowerCase()))
    const deduped = normalized.filter(p => !existingUrls.has(p.url?.toLowerCase()))

    let added = 0
    if (deduped.length) {
      const scored = await scoreRelevance(deduped, page.persona, page.relevance_prompt, examplePosts || [])
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
