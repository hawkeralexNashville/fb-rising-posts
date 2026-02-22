import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function normalizeFacebookGroup(post) {
  const reactions = post.likesCount || post.likes || post.reactionsCount || post.reactions || 0
  const comments = post.commentsCount || post.comments || post.numberOfComments || 0
  const shares = post.sharesCount || post.shares || 0
  return {
    post_id: post.postId || post.id || post.postUrl || post.url || Math.random().toString(36).slice(2),
    post_url: post.postUrl || post.url || post.link || '',
    content_preview: (post.postText || post.text || post.message || post.body || '').slice(0, 500),
    reactions,
    comments,
    shares,
    total_interactions: reactions + comments + shares,
    posted_at: post.time || post.postTimestamp || post.timestamp || post.date || post.createdAt || post.postedAt || null,
    page_name: post.pageName || post.authorName || post.pageTitle || post.groupName || post.author?.name || '',
    page_url: post.pageUrl || post.groupUrl || '',
    platform: 'facebook',
    metrics: { reactions, comments, shares },
    metric_labels: { m1: 'Reactions', m2: 'Comments', m3: 'Shares' },
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const runId = searchParams.get('runId')
    const timeWindowHours = parseFloat(searchParams.get('timeWindowHours')) || 24
    const minComments = parseInt(searchParams.get('minComments')) || 50
    const minReactions = parseInt(searchParams.get('minReactions')) || 10

    if (!runId) return NextResponse.json({ error: 'Missing runId' }, { status: 400 })

    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Get dataset + cost
    const runRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${process.env.APIFY_API_TOKEN}`)
    const runData = await runRes.json()
    const datasetId = runData.data?.defaultDatasetId
    const costUsd = runData.data?.usageTotalUsd ?? null

    if (!datasetId) return NextResponse.json({ error: 'No dataset found' }, { status: 500 })

    const dataRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${process.env.APIFY_API_TOKEN}&limit=500`)
    const rawPosts = await dataRes.json()

    if (!Array.isArray(rawPosts) || rawPosts.length === 0) {
      return NextResponse.json({ posts: [], totalScraped: 0, filteredOut: 0, costUsd })
    }

    const normalizedPosts = rawPosts.map((p) => normalizeFacebookGroup(p)).filter((p) => p.post_id)
    const totalScraped = normalizedPosts.length
    const nowMs = Date.now()
    let filteredOut = 0
    const qualifyingPosts = []

    for (const post of normalizedPosts) {
      // Time window filter
      let ageHours = null
      if (post.posted_at) {
        ageHours = (nowMs - new Date(post.posted_at).getTime()) / 3600000
        if (ageHours > timeWindowHours) { filteredOut++; continue }
        if (ageHours < 0) ageHours = 0.1
      }

      // Comments and reactions threshold
      if (post.comments < minComments) { filteredOut++; continue }
      if (post.reactions < minReactions) { filteredOut++; continue }

      const fmtAge = ageHours !== null ? (ageHours < 1 ? Math.round(ageHours * 60) + ' minutes' : ageHours < 2 ? '1 hour' : Math.round(ageHours) + ' hours') : null
      const reason = `This post has ${post.comments.toLocaleString()} comments and ${post.reactions.toLocaleString()} reactions${fmtAge ? `, posted ${fmtAge} ago` : ''}. It meets your thresholds of ${minComments}+ comments and ${minReactions}+ reactions — high engagement like this makes great blog content.`

      qualifyingPosts.push({ ...post, age_hours: ageHours ? Math.round(ageHours * 10) / 10 : null, reason })
    }

    // Sort by comments descending (most discussion = best blog material)
    qualifyingPosts.sort((a, b) => b.comments - a.comments)

    return NextResponse.json({ posts: qualifyingPosts, totalScraped, filteredOut, costUsd })
  } catch (err) {
    console.error('Group results processing error:', err)
    return NextResponse.json({ error: 'Failed to process results' }, { status: 500 })
  }
}
