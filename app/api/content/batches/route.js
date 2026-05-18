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

// GET — list batches for a page
export async function GET(request) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const pageId = searchParams.get('pageId')
  if (!pageId) return NextResponse.json({ error: 'Missing pageId' }, { status: 400 })

  const db = svc()
  const { data: page } = await db.from('content_pages').select('id').eq('id', pageId).eq('user_id', user.id).single()
  if (!page) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { data, error } = await db.from('content_batches').select('*').eq('page_id', pageId).eq('user_id', user.id).order('created_at', { ascending: false }).limit(20)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

// POST — create a new batch and trigger Inngest
export async function POST(request) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { pageId, timeWindowHours = 24 } = await request.json()
  if (!pageId) return NextResponse.json({ error: 'Missing pageId' }, { status: 400 })

  const db = svc()
  const { data: page } = await db.from('content_pages').select('id').eq('id', pageId).eq('user_id', user.id).single()
  if (!page) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  // Create batch record
  const { data: batch, error } = await db.from('content_batches').insert({
    page_id: pageId,
    user_id: user.id,
    status: 'queued',
    progress_step: 'queued',
    progress_pct: 0,
    progress_message: 'Queued...',
    time_window_hours: timeWindowHours,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fire Inngest event
  const eventKey = process.env.INNGEST_EVENT_KEY
  if (eventKey) {
    try {
      await fetch('https://inn.gs/e/' + eventKey, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'content/batch.run',
          data: { batchId: batch.id, pageId, userId: user.id, timeWindowHours },
        }),
      })
    } catch (err) {
      // Non-fatal: batch record exists, Inngest will retry
      console.error('Inngest event send failed:', err.message)
    }
  }

  return NextResponse.json(batch)
}
