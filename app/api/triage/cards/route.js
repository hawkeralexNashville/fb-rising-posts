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

// GET — list cards for a triage page
export async function GET(request) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const triagePageId = searchParams.get('triagePageId')
  const archived = searchParams.get('archived') === 'true'
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
  const offset = parseInt(searchParams.get('offset') || '0')

  if (!triagePageId) return NextResponse.json({ error: 'Missing triagePageId' }, { status: 400 })

  const db = svc()

  const { data: page } = await db.from('triage_pages').select('id, user_id, collaborator_email').eq('id', triagePageId).single()
  if (!page) return NextResponse.json({ error: 'Page not found' }, { status: 404 })
  const isOwner = page.user_id === user.id
  const isCollab = page.collaborator_email?.toLowerCase() === user.email?.toLowerCase()
  if (!isOwner && !isCollab) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { data: cards, error } = await db
    .from('triage_cards')
    .select('*')
    .eq('triage_page_id', triagePageId)
    .eq('is_archived', archived)
    .order('is_top_five', { ascending: false })
    .order('ai_relevance_score', { ascending: false, nullsFirst: false })
    .order('velocity', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(cards || [])
}

// PATCH — update a card (archive, restore, save generated content, mark posted)
export async function PATCH(request) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, ...fields } = await request.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const db = svc()

  const { data: card } = await db.from('triage_cards').select('id, triage_page_id').eq('id', id).single()
  if (!card) return NextResponse.json({ error: 'Card not found' }, { status: 404 })

  const { data: page } = await db.from('triage_pages').select('id, user_id, collaborator_email').eq('id', card.triage_page_id).single()
  if (!page) return NextResponse.json({ error: 'Page not found' }, { status: 404 })
  const canWrite = page.user_id === user.id || page.collaborator_email?.toLowerCase() === user.email?.toLowerCase()
  if (!canWrite) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const allowed = ['is_archived', 'is_posted', 'generated_headline', 'generated_caption', 'is_top_five']
  const update = Object.fromEntries(Object.entries(fields).filter(([k]) => allowed.includes(k)))

  const { error } = await db.from('triage_cards').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE — permanently delete a card
export async function DELETE(request) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const db = svc()

  const { data: card } = await db.from('triage_cards').select('id, triage_page_id').eq('id', id).single()
  if (!card) return NextResponse.json({ error: 'Card not found' }, { status: 404 })

  const { data: page } = await db.from('triage_pages').select('id').eq('id', card.triage_page_id).eq('user_id', user.id).single()
  if (!page) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { error } = await db.from('triage_cards').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
