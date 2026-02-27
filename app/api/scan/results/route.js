import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// ─── Platform-specific normalization ───
function normalizeFacebook(post) {
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
    post_type: post.type || post.postType || post.mediaType || '',
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
    post_type: post.type || post.mediaType || (post.isRetweet ? 'retweet' : '') || '',
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
    post_type: post.type || post.postType || '',
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

    // Filter and score — age-weighted algorithm
    const risingPosts = []
    const nowMs = Date.now()
    let filteredOut = 0

    // Age multiplier: younger posts get boosted because early detection is the goal
    function getAgeMultiplier(ageHours) {
      if (ageHours <= 0.5) return 4.0    // Under 30 min — extremely early signal
      if (ageHours <= 1) return 3.0      // Under 1 hour — very early
      if (ageHours <= 2) return 2.0      // Under 2 hours — early riser window
      if (ageHours <= 4) return 1.5      // 2-4 hours — still actionable
      return 1.0                          // 4+ hours — standard
    }

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
      let deltaRate = null
      if (prev) {
        delta = post.total_interactions - prev.total_interactions
        const timeSinceLast = prev.scraped_at ? (nowMs - new Date(prev.scraped_at).getTime()) / 3600000 : null
        if (timeSinceLast && timeSinceLast > 0) deltaRate = delta / timeSinceLast
      }

      let isRising = false
      let reason = ''
      const fmtAge = ageHours !== null ? (ageHours < 0.5 ? Math.round(ageHours * 60) + ' minutes' : ageHours < 1 ? Math.round(ageHours * 60) + ' minutes' : ageHours < 2 ? '1 hour' : Math.round(ageHours) + ' hours') : null
      const fmtInt = (n) => n.toLocaleString()

      if (prev && delta !== null) { 
        isRising = delta >= settings.min_delta
        if (isRising) {
          const timeSinceLast = prev.scraped_at ? Math.round((nowMs - new Date(prev.scraped_at).getTime()) / 60000) : null
          const timeSinceStr = timeSinceLast ? (timeSinceLast < 60 ? `${timeSinceLast} minutes` : `${Math.round(timeSinceLast / 60)} hours`) : null
          const fmtDeltaRate = deltaRate ? Math.round(deltaRate) : null
          reason = `This post had ${fmtInt(prev.total_interactions)} interactions when we last scanned${timeSinceStr ? ` ${timeSinceStr} ago` : ''} and now has ${fmtInt(post.total_interactions)} — that's a jump of +${fmtInt(delta)}${fmtDeltaRate ? ` (roughly ${fmtInt(fmtDeltaRate)}/hr)` : ''}.`
        }
      }
      else if (velocity !== null) { 
        isRising = velocity >= settings.min_velocity
        if (isRising) {
          const velRound = Math.round(velocity)
          reason = `Posted ${fmtAge} ago with ${fmtInt(post.total_interactions)} total interactions — velocity of ${fmtInt(velRound)} interactions/hr.`
        }
      }
      else { 
        isRising = post.total_interactions >= settings.min_velocity * 2
        if (isRising) reason = `This post has ${fmtInt(post.total_interactions)} interactions (no timestamp available). Exceeds the high-volume threshold.`
      }

      if (!isRising) { filteredOut++; continue }

      // Age-weighted score for ranking
      const ageMult = ageHours !== null ? getAgeMultiplier(ageHours) : 1.0
      const score = ((velocity || 0) * ageMult) + ((deltaRate || delta || 0) * 2)

      // Tag early risers and surging posts
      const tags = []
      if (ageHours !== null && ageHours <= 2 && velocity && velocity >= settings.min_velocity) {
        tags.push('early_riser')
        reason = `🔥 EARLY RISER — Only ${fmtAge} old and already at ${fmtInt(post.total_interactions)} interactions (${fmtInt(Math.round(velocity))}/hr). ${reason}`
      }
      if (deltaRate && deltaRate > (velocity || 0) * 1.5) {
        tags.push('accelerating')
      }
      if (velocity && velocity >= settings.min_velocity * 5) {
        tags.push('viral')
      }

      risingPosts.push({ ...post, velocity, delta, deltaRate: deltaRate ? Math.round(deltaRate) : null, age_hours: ageHours ? Math.round(ageHours * 10) / 10 : null, reason, score: Math.round(score), tags, age_multiplier: ageMult })
    }

    // Sort by score — young + fast posts rise to the top
    risingPosts.sort((a, b) => (b.score || 0) - (a.score || 0))

    return NextResponse.json({ posts: risingPosts, totalScraped, filteredOut, costUsd })
  } catch (err) {
    console.error('Results processing error:', err)
    return NextResponse.json({ error: 'Failed to process results' }, { status: 500 })
  }
}
