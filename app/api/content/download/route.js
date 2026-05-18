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

// GET — return signed URL for batch ZIP
export async function GET(request) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const batchId = searchParams.get('batchId')
  if (!batchId) return NextResponse.json({ error: 'Missing batchId' }, { status: 400 })

  const db = svc()
  const { data: batch } = await db.from('content_batches').select('id, zip_storage_path, status').eq('id', batchId).eq('user_id', user.id).single()
  if (!batch) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (batch.status !== 'done') return NextResponse.json({ error: 'Batch not complete' }, { status: 400 })
  if (!batch.zip_storage_path) return NextResponse.json({ error: 'ZIP not available' }, { status: 404 })

  const { data: signedUrl, error } = await db.storage.from('content-generated').createSignedUrl(batch.zip_storage_path, 3600)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ url: signedUrl.signedUrl })
}
