import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { encrypt } from '../../../../lib/content/encryption'

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

// GET — return which keys are configured (never return the key values)
export async function GET(request) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = svc()
  const { data } = await db.from('user_settings').select('apify_key_enc, anthropic_key_enc, kie_key_enc').eq('user_id', user.id).single()

  return NextResponse.json({
    apify: !!data?.apify_key_enc,
    anthropic: !!data?.anthropic_key_enc,
    kie: !!data?.kie_key_enc,
  })
}

// POST — save encrypted API keys
export async function POST(request) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const db = svc()

  const updates = {}
  if (body.apify !== undefined) updates.apify_key_enc = body.apify ? encrypt(body.apify) : null
  if (body.anthropic !== undefined) updates.anthropic_key_enc = body.anthropic ? encrypt(body.anthropic) : null
  if (body.kie !== undefined) updates.kie_key_enc = body.kie ? encrypt(body.kie) : null

  if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'No keys provided' }, { status: 400 })

  const { data: existing } = await db.from('user_settings').select('user_id').eq('user_id', user.id).single()
  if (existing) {
    await db.from('user_settings').update({ ...updates, updated_at: new Date().toISOString() }).eq('user_id', user.id)
  } else {
    await db.from('user_settings').insert({ user_id: user.id, ...updates })
  }

  return NextResponse.json({ success: true })
}
