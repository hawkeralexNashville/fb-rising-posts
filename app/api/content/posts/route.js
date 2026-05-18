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

async function authorizePost(db, postId, userId) {
  const { data } = await db.from('content_posts').select('id, user_id, image_storage_path, captions, status, source_url, source_text, engagement_score, selected_caption, review_status, batch_id, page_id').eq('id', postId).eq('user_id', userId).single()
  return data
}

// GET — list posts for a batch
export async function GET(request) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const batchId = searchParams.get('batchId')
  if (!batchId) return NextResponse.json({ error: 'Missing batchId' }, { status: 400 })

  const db = svc()
  const { data: batch } = await db.from('content_batches').select('id').eq('id', batchId).eq('user_id', user.id).single()
  if (!batch) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { data, error } = await db.from('content_posts').select('*').eq('batch_id', batchId).eq('user_id', user.id).order('engagement_score', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Generate signed URLs for images
  const posts = await Promise.all((data || []).map(async post => {
    if (post.image_storage_path) {
      const { data: signedUrl } = await db.storage.from('content-generated').createSignedUrl(post.image_storage_path, 3600)
      return { ...post, image_signed_url: signedUrl?.signedUrl || null }
    }
    return { ...post, image_signed_url: null }
  }))

  return NextResponse.json(posts)
}

// PATCH — update review status, selected caption, or edited caption
export async function PATCH(request) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, ...fields } = await request.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const db = svc()
  const post = await authorizePost(db, id, user.id)
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const allowed = ['review_status', 'selected_caption', 'edited_caption']
  const update = Object.fromEntries(Object.entries(fields).filter(([k]) => allowed.includes(k)))

  const { error } = await db.from('content_posts').update({ ...update, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
