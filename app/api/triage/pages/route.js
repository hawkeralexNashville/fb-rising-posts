import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

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

// GET — list all triage pages with keywords and example posts
export async function GET(request) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = svc()

  const [{ data: ownedPages, error }, collabResult] = await Promise.all([
    db.from('triage_pages').select('*').eq('user_id', user.id).order('created_at'),
    db.from('triage_pages').select('id, name').ilike('collaborator_email', user.email || '').order('created_at'),
  ])
  // collabResult may error if collaborator_email column doesn't exist yet — that's fine
  const collabPages = collabResult.error ? [] : (collabResult.data || [])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Owned pages — full data with keywords and example posts
  const ownedIds = (ownedPages || []).map(p => p.id)
  const [{ data: keywords }, { data: examplePosts }] = ownedIds.length
    ? await Promise.all([
        db.from('triage_rss_keywords').select('*').in('triage_page_id', ownedIds).order('created_at'),
        db.from('triage_example_posts').select('*').in('triage_page_id', ownedIds).order('created_at'),
      ])
    : [{ data: [] }, { data: [] }]

  const owned = (ownedPages || []).map(p => ({
    ...p,
    role: 'owner',
    keywords: keywords?.filter(k => k.triage_page_id === p.id) ?? [],
    example_posts: examplePosts?.filter(e => e.triage_page_id === p.id) ?? [],
  }))

  // Collaborator pages — minimal data (no keywords/prompts exposed to executor)
  const collab = (collabPages || [])
    .filter(p => !ownedIds.includes(p.id))
    .map(p => ({ id: p.id, name: p.name, role: 'collaborator', keywords: [], example_posts: [] }))

  return NextResponse.json([...owned, ...collab])
}

// POST — create a new triage page
export async function POST(request) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const db = svc()
  const { data, error } = await db.from('triage_pages').insert({
    user_id: user.id,
    name: body.name?.trim(),
    stream_id: body.stream_id || null,
    persona: body.persona || '',
    headline_prompt: body.headline_prompt || '',
    caption_prompt: body.caption_prompt || '',
    relevance_prompt: body.relevance_prompt || '',
    scan_times: body.scan_times || ['22:00', '01:00', '04:00'],
    scan_window_hours: body.scan_window_hours || 6,
    scan_enabled: body.scan_enabled !== false,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ...data, keywords: [], example_posts: [] })
}

// PATCH — update a triage page + replace keywords/example_posts if provided
export async function PATCH(request) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, keywords, example_posts, ...fields } = await request.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const db = svc()
  const { data: existing } = await db.from('triage_pages').select('id').eq('id', id).eq('user_id', user.id).single()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Normalize collaborator email
  if (fields.collaborator_email !== undefined) {
    fields.collaborator_email = fields.collaborator_email?.trim().toLowerCase() || null
  }

  const { error } = await db.from('triage_pages').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (keywords !== undefined) {
    await db.from('triage_rss_keywords').delete().eq('triage_page_id', id)
    if (keywords.length) {
      await db.from('triage_rss_keywords').insert(
        keywords.map(k => ({ triage_page_id: id, keyword: typeof k === 'string' ? k : k.keyword }))
      )
    }
  }

  if (example_posts !== undefined) {
    await db.from('triage_example_posts').delete().eq('triage_page_id', id)
    if (example_posts.length) {
      await db.from('triage_example_posts').insert(
        example_posts.map(e => ({ triage_page_id: id, url: e.url || null, content: e.content || null, image_url: e.image_url || null }))
      )
    }
  }

  return NextResponse.json({ success: true })
}

// DELETE — delete a triage page
export async function DELETE(request) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await svc().from('triage_pages').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
