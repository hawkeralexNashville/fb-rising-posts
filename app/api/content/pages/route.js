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

export async function GET(request) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await svc().from('content_pages').select('*').eq('user_id', user.id).order('created_at')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(request) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const db = svc()

  const { data, error } = await db.from('content_pages').insert({
    user_id: user.id,
    name: body.name?.trim(),
    competitor_urls: body.competitor_urls || [],
    brand_voice: body.brand_voice || '',
    tone: body.tone || 'conversational',
    hashtags: body.hashtags || [],
    image_style_prompt: body.image_style_prompt || '',
    image_aspect_ratio: body.image_aspect_ratio || '1:1',
    watermark_position: body.watermark_position || 'bottom-right',
    logo_storage_path: body.logo_storage_path || null,
    watermark_storage_path: body.watermark_storage_path || null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(request) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, ...fields } = await request.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const db = svc()
  const { data: existing } = await db.from('content_pages').select('id').eq('id', id).eq('user_id', user.id).single()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const allowed = ['name', 'competitor_urls', 'brand_voice', 'tone', 'hashtags', 'image_style_prompt', 'image_aspect_ratio', 'watermark_position', 'logo_storage_path', 'watermark_storage_path']
  const update = Object.fromEntries(Object.entries(fields).filter(([k]) => allowed.includes(k)))

  const { error } = await db.from('content_pages').update({ ...update, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await svc().from('content_pages').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
