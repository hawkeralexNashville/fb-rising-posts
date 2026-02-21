import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const runId = searchParams.get('runId')
    const streamId = searchParams.get('streamId')

    if (!runId) {
      return NextResponse.json({ error: 'Missing runId' }, { status: 400 })
    }

    // Verify user
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ─── Step 1: Get Apify run details to find dataset ID ───
    const runRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${process.env.APIFY_API_TOKEN}`
    )
    const runData = await runRes.json()
    const datasetId = runData.data?.defaultDatasetId

    if (!datasetId) {
      return NextResponse.json({ error: 'No dataset found for this run' }, { status: 500 })
    }

    // ─── Step 2: Fetch scraped posts from Apify ───
    const dataRes = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${process.env.APIFY_API_TOKEN}&limit=500`
    )
    const rawPosts = await dataRes.json()

    if (!Array.isArray(rawPosts) || rawPosts.length === 0) {
      return NextResponse.json({ posts: [], totalScraped: 0 })
    }

    // ─── Step 3: Normalize post data ───
    // Apify's Facebook Posts Scraper can return varying field names
    const normalizedPosts = rawPosts.map((post) => {
      const reactions = post.likesCount || post.likes || post.reactionsCount || 0
      const comments = post.commentsCount || post.comments || 0
      const shares = post.sharesCount || post.shares || 0
      const total = reactions + comments + shares

      // Try to extract a stable post ID from the URL
      const postUrl = post.postUrl || post.url || ''
      const postId = post.postId || postUrl || Math.random().toString(36).slice(2)

      // Try to get the timestamp
      const postedAt = post.time || post.postTimestamp || post.timestamp || post.date || null

      // Get page info
      const pageName = post.pageName || post.authorName || post.pageTitle || ''
      const pageUrl = post.pageUrl || ''

      return {
        post_id: postId,
        post_url: postUrl,
        content_preview: (post.postText || post.text || post.message || '').slice(0, 500),
        reactions,
        comments,
        shares,
        total_interactions: total,
        posted_at: postedAt,
        page_name: pageName,
        page_url: pageUrl,
      }
    }).filter((p) => p.post_id)

    // ─── Step 4: Load user settings ───
    const { data: settingsRow } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    const settings = {
      min_velocity: settingsRow?.min_velocity ?? 50,
      min_delta: settingsRow?.min_delta ?? 20,
      max_post_age_hours: settingsRow?.max_post_age_hours ?? 48,
    }

    // ─── Step 5: Load previous snapshots for delta detection ───
    const postIds = normalizedPosts.map((p) => p.post_id)
    const { data: prevSnapshots } = await supabase
      .from('post_snapshots')
      .select('post_id, total_interactions, scraped_at')
      .eq('user_id', user.id)
      .in('post_id', postIds.slice(0, 200)) // Supabase IN has limits
      .order('scraped_at', { ascending: false })

    // Build a map of the most recent snapshot per post
    const prevMap = {}
    if (prevSnapshots) {
      for (const snap of prevSnapshots) {
        if (!prevMap[snap.post_id]) {
          prevMap[snap.post_id] = snap
        }
      }
    }

    // ─── Step 6: Store new snapshots ───
    const now = new Date().toISOString()
    const snapshotsToInsert = normalizedPosts.map((p) => ({
      user_id: user.id,
      stream_id: streamId || null,
      page_url: p.page_url,
      post_id: p.post_id,
      post_url: p.post_url,
      content_preview: p.content_preview,
      reactions: p.reactions,
      comments: p.comments,
      shares: p.shares,
      total_interactions: p.total_interactions,
      posted_at: p.posted_at,
      scraped_at: now,
    }))

    // Insert in batches of 50 to avoid payload limits
    for (let i = 0; i < snapshotsToInsert.length; i += 50) {
      await supabase
        .from('post_snapshots')
        .insert(snapshotsToInsert.slice(i, i + 50))
    }

    // ─── Step 7: Calculate velocity and delta, filter rising posts ───
    const risingPosts = []
    const nowMs = Date.now()

    for (const post of normalizedPosts) {
      // Skip posts with no timestamp or too old
      let ageHours = null
      if (post.posted_at) {
        ageHours = (nowMs - new Date(post.posted_at).getTime()) / 3600000
        if (ageHours > settings.max_post_age_hours) continue
        if (ageHours < 0) ageHours = 0.1 // Future date edge case
      }

      // Calculate velocity (interactions per hour)
      const velocity = ageHours && ageHours > 0
        ? post.total_interactions / ageHours
        : null

      // Calculate delta from previous snapshot
      const prev = prevMap[post.post_id]
      let delta = null
      if (prev) {
        delta = post.total_interactions - prev.total_interactions
      }

      // Determine if this post is "rising"
      let isRising = false

      if (prev && delta !== null) {
        // We have previous data: use delta
        isRising = delta >= settings.min_delta
      } else if (velocity !== null) {
        // First time seeing this post: use velocity
        isRising = velocity >= settings.min_velocity
      } else {
        // No timestamp and no previous data: skip
        // Unless it has a very high interaction count (catch-all)
        isRising = post.total_interactions >= settings.min_velocity * 2
      }

      if (isRising) {
        risingPosts.push({
          ...post,
          velocity: velocity,
          delta: delta,
          age_hours: ageHours ? Math.round(ageHours * 10) / 10 : null,
        })
      }
    }

    // Sort by velocity (highest first), then by delta
    risingPosts.sort((a, b) => {
      const aScore = (a.velocity || 0) + (a.delta || 0) * 2
      const bScore = (b.velocity || 0) + (b.delta || 0) * 2
      return bScore - aScore
    })

    return NextResponse.json({
      posts: risingPosts,
      totalScraped: normalizedPosts.length,
    })
  } catch (err) {
    console.error('Results processing error:', err)
    return NextResponse.json({ error: 'Failed to process results' }, { status: 500 })
  }
}
