import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

export async function POST(req) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const token = authHeader.slice(7)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { title, posts, batch_strategy, post_strategies, scan_meta } = body

  if (!posts || !Array.isArray(posts) || posts.length === 0) {
    return Response.json({ error: 'No posts to share' }, { status: 400 })
  }

  const share_token = randomBytes(8).toString('base64url')

  const { data, error } = await supabase.from('shared_scans').insert({
    share_token,
    user_id: user.id,
    title: title || 'Scan Results',
    posts,
    batch_strategy: batch_strategy || null,
    post_strategies: post_strategies || {},
    scan_meta: scan_meta || {},
  }).select('share_token').single()

  if (error) {
    console.error('Share create error:', error)
    return Response.json({ error: 'Failed to create share' }, { status: 500 })
  }

  return Response.json({ share_token: data.share_token })
}
