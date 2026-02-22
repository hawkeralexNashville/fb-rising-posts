import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// ─── Platform-specific normalization ───
function normalizeFacebook(post) {
  const reactions = post.likesCount || post.likes || post.reactionsCount || 0
  const comments = post.commentsCount || post.comments || 0
  const shares = post.sharesCount || post.shares || 0
  return {
    post_id: post.postId || post.postUrl || post.url || Math.random().toString(36).slice(2),
    post_url: post.postUrl || post.url || '',
    content_preview: (post.postText || post.text || post.message || '').slice(0, 500),
    reactions,
    comments,
    shares,
    total_interactions: reactions + comments + shares,
    posted_at: post.time || post.postTimestamp || post.timestamp || post.date || null,
    page_name: post.pageName || post.authorName || post.pageTitle || '',
    page_url: post.pageUrl || '',
    platform: 'facebook',
    metrics: { reactions, comments, shares },
    metric_labels: { m1: 'Reactions', m2: 'Comments', m3: 'Shares' },
  }
}

function normalizeX(post) {
  const likes = post.likeCount || post.likes || post.favoriteCount || 0
  const retweets = post.retweetCount || post.retweets || 0
  const replies = post.replyCount || post.replies || 0
  const views = post.viewCount || post.views || 0
  return {
    post_id: post.id || post.tweetId || post.url || Math.random().toString(36).slice(2),
    post_url: post.url || post.tweetUrl || '',
    content_preview: (post.text || post.fullText || post.tweetText || '').slice(0, 500),
    reactions: likes,
    comments: replies,
    shares: retweets,
    total_interactions: likes + retweets + replies,
    posted_at: post.createdAt || post.date || post.timestamp || null,
    page_name: post.author?.userName || post.userName || post.screenName || post.author?.name || '',
    page_url: post.author?.url || '',
    platform: 'x',
    views,
    metrics: { likes, retweets, replies, views },
    metric_labels: { m1: 'Likes', m2: 'Replies', m3: 'Retweets' },
  }
}

function normalizeReddit(post) {
  const upvotes = post.upVotes || post.score || post.ups || 0
  const comments = post.numberOfComments || post.commentCount || post.numComments || 0
  const awards = post.totalAwards || post.awardsCount || 0
  return {
    post_id: post.id || post.url || Math.random().toString(36).slice(2),
    post_url: post.url || '',
    content_preview: (post.title || post.text || post.body || '').slice(0, 500),
    reactions: upvotes,
    comments,
    shares: awards,
    total_interactions: upvotes + comments,
    posted_at: post.createdAt || post.date || post.timestamp || null,
    page_name: post.communityName || post.subreddit || post.subredditName || '',
    page_url: post.communityUrl || '',
    platform: 'reddit',
    metrics: { upvotes, comments, awards },
    metric_labels: { m1: 'Upvotes', m2: 'Comments', m3: 'Awards' },
  }
}

function normalizePost(post, platform) {
  switch (platform) {
    case 'x': return normalizeX(post)
    case 'reddit': return normalizeReddit(post)
    case 'facebook':
    default: return normalizeFacebook(post)
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const runId = searchParams.get('runId')
    const streamId = searchParams.get('streamId')
    const platform = searchParams.get('platform') || 'facebook'
    const timeWindowHours = parseFloat(searchParams.get('timeWindowHours')) || 24
    const minInteractions = parseInt(searchParams.get('minInteractions')) || 0
    const maxInteractions = parseInt(searchParams.get('maxInteractions')) || 999999999

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

    // Normalize
    const normalizedPosts = rawPosts.map((p) => normalizePost(p, platform)).filter((p) => p.post_id)
    const totalScraped = normalizedPosts.length

    // Load settings
    const { data: settingsRow } = await supabase.from('user_settings').select('*').eq('user_id', user.id).single()
    const settings = { min_velocity: settingsRow?.min_velocity ?? 50, min_delta: settingsRow?.min_delta ?? 20 }

    // Load previous snapshots
    const postIds = normalizedPosts.map((p) => p.post_id)
    const { data: prevSnapshots } = await supabase.from('post_snapshots').select('post_id, total_interactions, scraped_at').eq('user_id', user.id).in('post_id', postIds.slice(0, 200)).order('scraped_at', { ascending: false })
    const prevMap = {}
    if (prevSnapshots) { for (const snap of prevSnapshots) { if (!prevMap[snap.post_id]) prevMap[snap.post_id] = snap } }

    // Store snapshots
    const now = new Date().toISOString()
    const snapshotsToInsert = normalizedPosts.map((p) => ({
      user_id: user.id, stream_id: streamId || null, page_url: p.page_url, post_id: p.post_id, post_url: p.post_url,
      content_preview: p.content_preview, reactions: p.reactions, comments: p.comments, shares: p.shares,
      total_interactions: p.total_interactions, posted_at: p.posted_at, scraped_at: now,
    }))
    for (let i = 0; i < snapshotsToInsert.length; i += 50) {
      await supabase.from('post_snapshots').insert(snapshotsToInsert.slice(i, i + 50))
    }

    // Filter and score
    const risingPosts = []
    const nowMs = Date.now()
    let filteredOut = 0

    for (const post of normalizedPosts) {
      let ageHours = null
      if (post.posted_at) {
        ageHours = (nowMs - new Date(post.posted_at).getTime()) / 3600000
        if (ageHours > timeWindowHours) { filteredOut++; continue }
        if (ageHours < 0) ageHours = 0.1
      }
      if (post.total_interactions < minInteractions) { filteredOut++; continue }
      if (post.total_interactions > maxInteractions) { filteredOut++; continue }

      const velocity = ageHours && ageHours > 0 ? post.total_interactions / ageHours : null
      const prev = prevMap[post.post_id]
      let delta = null
      if (prev) delta = post.total_interactions - prev.total_interactions

      let isRising = false
      let reason = ''
      const fmtAge = ageHours !== null ? (ageHours < 1 ? Math.round(ageHours * 60) + ' minutes' : ageHours < 2 ? '1 hour' : Math.round(ageHours) + ' hours') : null
      const fmtInt = (n) => n.toLocaleString()

      if (prev && delta !== null) { 
        isRising = delta >= settings.min_delta
        if (isRising) {
          const timeSinceLast = prev.scraped_at ? Math.round((nowMs - new Date(prev.scraped_at).getTime()) / 60000) : null
          const timeSinceStr = timeSinceLast ? (timeSinceLast < 60 ? `${timeSinceLast} minutes` : `${Math.round(timeSinceLast / 60)} hours`) : null
          const deltaRate = timeSinceLast && timeSinceLast > 0 ? Math.round(delta / (timeSinceLast / 60)) : null
          reason = `This post had ${fmtInt(prev.total_interactions)} interactions when we last scanned${timeSinceStr ? ` ${timeSinceStr} ago` : ''} and now has ${fmtInt(post.total_interactions)} — that's a jump of +${fmtInt(delta)}${deltaRate ? ` (roughly ${fmtInt(deltaRate)}/hr)` : ''}. Your threshold is ${settings.min_delta}+ growth between scans, so this qualifies as a fast riser.`
        }
      }
      else if (velocity !== null) { 
        isRising = velocity >= settings.min_velocity
        if (isRising) {
          const velRound = Math.round(velocity)
          const multiplier = Math.round(velocity / settings.min_velocity * 10) / 10
          reason = `Posted ${fmtAge} ago with ${fmtInt(post.total_interactions)} total interactions, giving it a velocity of ${fmtInt(velRound)} interactions per hour. That's ${multiplier > 1.5 ? multiplier + 'x' : 'above'} your minimum velocity threshold of ${settings.min_velocity}/hr — this is picking up traction fast for its age.`
        }
      }
      else { 
        isRising = post.total_interactions >= settings.min_velocity * 2
        if (isRising) reason = `This post has ${fmtInt(post.total_interactions)} interactions but no timestamp available, so we can't calculate velocity. It exceeds the high-volume threshold of ${fmtInt(settings.min_velocity * 2)} interactions, so it's flagged as potentially rising.`
      }

      if (!isRising) { filteredOut++; continue }
      risingPosts.push({ ...post, velocity, delta, age_hours: ageHours ? Math.round(ageHours * 10) / 10 : null, reason })
    }

    risingPosts.sort((a, b) => {
      const aScore = (a.velocity || 0) + (a.delta || 0) * 2
      const bScore = (b.velocity || 0) + (b.delta || 0) * 2
      return bScore - aScore
    })

    return NextResponse.json({ posts: risingPosts, totalScraped, filteredOut, costUsd })
  } catch (err) {
    console.error('Results processing error:', err)
    return NextResponse.json({ error: 'Failed to process results' }, { status: 500 })
  }
}
